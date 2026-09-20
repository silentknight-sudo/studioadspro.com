import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { hashPassword, verifyPassword } from '../lib/crypto';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isTeamLead: boolean;
  isEmployee: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (loginId: string, pass: string) => Promise<void>;
  logOut: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Bootstrap admins can ONLY gain access via a verified Google sign-in on one of
// these exact addresses. Every other account must be created by an existing
// admin in User Management before anyone can log in with it.
const PRECONFIGURED_ADMINS: Record<string, { name: string; role: UserRole }> = {
  'admin@sap.com': { name: 'SAP Executive Admin', role: 'ADMIN' },
  'admin@sap1.com': { name: 'SAP System Admin', role: 'ADMIN' },
  'playsidgaming@gmail.com': { name: 'Owner Administrator', role: 'ADMIN' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionOverride, setSessionOverride] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('sap_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Google sign-in only ever grants access automatically to the fixed
  // bootstrap admin addresses above. Anyone else must already have an
  // account created for them by an admin, matched here by email.
  const syncUserProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      const email = (firebaseUser.email || '').toLowerCase();
      const isAdminEmail = Object.keys(PRECONFIGURED_ADMINS).includes(email);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        if (data.status !== 'ACTIVE') {
          await signOut(auth);
          setProfile(null);
          throw new Error('Your account is inactive. Contact your administrator.');
        }
        if (isAdminEmail && data.role !== 'ADMIN') {
          await updateDoc(userRef, { role: 'ADMIN' });
          data.role = 'ADMIN';
        }
        setProfile({ ...data, id: firebaseUser.uid });
        return;
      }

      // No profile keyed by this Firebase uid yet. Only auto-provision for
      // the fixed bootstrap admin addresses; look up by email first in case
      // an admin already created this person's record under a different id.
      if (!isAdminEmail) {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const existing = qSnap.docs[0].data() as UserProfile;
          if (existing.status !== 'ACTIVE') {
            await signOut(auth);
            setProfile(null);
            throw new Error('Your account is inactive. Contact your administrator.');
          }
          setProfile({ ...existing, id: qSnap.docs[0].id });
          return;
        }

        // Unknown identity with no admin-created account: refuse access.
        await signOut(auth);
        setProfile(null);
        throw new Error('No account found for this email. Ask your administrator to create your login.');
      }

      const newProfile: UserProfile = {
        id: firebaseUser.uid,
        email,
        name: firebaseUser.displayName || PRECONFIGURED_ADMINS[email]?.name || email.split('@')[0] || 'Team Member',
        role: 'ADMIN',
        profession: 'WEBSITE',
        employmentType: 'FULL_TIME',
        createdBy: 'SYSTEM',
        createdAt: new Date().toISOString(),
        status: 'ACTIVE',
        avatar: firebaseUser.photoURL || undefined,
      };
      await setDoc(userRef, newProfile);
      setProfile(newProfile);
      await setDoc(doc(db, 'admins', firebaseUser.uid), {
        email,
        verifiedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error syncing user profile:', error);
      if (error instanceof Error && error.message.includes('account')) {
        throw error;
      }
      handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setSessionOverride(null);
        localStorage.removeItem('sap_session_user');
        try {
          await syncUserProfile(currentUser);
        } catch {
          setUser(null);
        }
      } else if (!sessionOverride) {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  // Login ID & Password sign-in: the account MUST already exist in Firestore
  // (created by an admin in User Management, or an auto-provisioned bootstrap
  // admin). There is no fallback path that creates or authorizes an account
  // on the fly — unknown credentials are always rejected.
  const signInEmail = async (loginIdInput: string, passInput: string) => {
    const loginId = loginIdInput.trim().toLowerCase();
    const cleanId = loginId.replace(/[^a-zA-Z0-9]/g, '_');

    if (!loginId) {
      throw new Error('Please enter your Login ID or Email.');
    }
    if (!passInput) {
      throw new Error('Please enter your Password.');
    }

    let matchedUser: (UserProfile & { password?: string; passwordHash?: string }) | null = null;
    let matchedDocId: string | null = null;

    try {
      const directDocRef = doc(db, 'users', cleanId);
      const directDocSnap = await getDoc(directDocRef);
      if (directDocSnap.exists()) {
        matchedUser = directDocSnap.data() as UserProfile & { password?: string; passwordHash?: string };
        matchedDocId = directDocSnap.id;
      } else {
        const q = query(collection(db, 'users'), where('email', '==', loginId));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const d = qSnap.docs[0];
          matchedUser = { id: d.id, ...d.data() } as UserProfile & { password?: string; passwordHash?: string };
          matchedDocId = d.id;
        }
      }
    } catch (err) {
      console.error('Firestore user lookup failed:', err);
      throw new Error('Unable to reach the account directory. Please try again.');
    }

    if (!matchedUser || !matchedDocId) {
      throw new Error('Account not found. Ask your administrator to create your login credentials.');
    }

    if (matchedUser.status && matchedUser.status !== 'ACTIVE') {
      throw new Error('Your account is inactive. Contact your administrator.');
    }

    if (matchedUser.passwordHash) {
      const ok = await verifyPassword(passInput, matchedUser.passwordHash);
      if (!ok) {
        throw new Error('Incorrect password. Please verify credentials or contact your administrator.');
      }
    } else if (matchedUser.password) {
      // Legacy plaintext record: verify once, then migrate to a hash.
      if (matchedUser.password !== passInput) {
        throw new Error('Incorrect password. Please verify credentials or contact your administrator.');
      }
      const migratedHash = await hashPassword(passInput);
      try {
        await updateDoc(doc(db, 'users', matchedDocId), { passwordHash: migratedHash, password: null });
      } catch {
        // Non-blocking; login still succeeds this time.
      }
    } else {
      throw new Error('This account has no password set. Ask your administrator to issue one.');
    }

    const userProfile: UserProfile = {
      id: matchedUser.id || matchedDocId,
      email: matchedUser.email || loginId,
      name: matchedUser.name || loginId.split('@')[0],
      role: matchedUser.role || 'EMPLOYEE',
      profession: matchedUser.profession || 'WEBSITE',
      teamId: matchedUser.teamId,
      employmentType: matchedUser.employmentType || 'FULL_TIME',
      reportsTo: matchedUser.reportsTo,
      createdBy: matchedUser.createdBy || 'SYSTEM',
      createdAt: matchedUser.createdAt || new Date().toISOString(),
      status: matchedUser.status || 'ACTIVE',
      phone: matchedUser.phone,
      avatar: matchedUser.avatar,
    };

    setProfile(userProfile);
    setSessionOverride(userProfile);
    localStorage.setItem('sap_session_user', JSON.stringify(userProfile));
  };

  const logOut = async () => {
    setSessionOverride(null);
    localStorage.removeItem('sap_session_user');
    setProfile(null);
    if (auth.currentUser) {
      await signOut(auth);
    }
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    const activeId = profile?.id;
    if (!activeId) return;

    try {
      await updateDoc(doc(db, 'users', activeId), updates);
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      if (sessionOverride) {
        const updated = { ...sessionOverride, ...updates };
        setSessionOverride(updated);
        localStorage.setItem('sap_session_user', JSON.stringify(updated));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${activeId}`);
    }
  };

  const activeProfile = profile || sessionOverride;
  const effectiveRole: UserRole = activeProfile?.role || 'EMPLOYEE';

  const effectiveUser =
    user ||
    (activeProfile
      ? ({
          uid: activeProfile.id,
          email: activeProfile.email,
          displayName: activeProfile.name,
          photoURL: activeProfile.avatar,
        } as unknown as FirebaseUser)
      : null);

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        profile: activeProfile,
        role: effectiveRole,
        loading,
        isAdmin: effectiveRole === 'ADMIN',
        isTeamLead: effectiveRole === 'TEAM_LEAD' || effectiveRole === 'ADMIN',
        isEmployee: effectiveRole === 'EMPLOYEE',
        signInGoogle,
        signInEmail,
        logOut,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
