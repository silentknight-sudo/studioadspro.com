import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

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

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in this Firebase project. Please use "Sign in with Google" with your administrator account (playsidgaming@gmail.com), or enable the Email/Password provider in the Firebase Console (Authentication > Sign-in method).';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in window was closed before completion. Please try again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
      return 'Account not found. For administrative access, please use "Sign in with Google" (playsidgaming@gmail.com). For other roles, contact your administrator.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please verify credentials or contact your administrator.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/user-disabled':
      return 'Your account is disabled. Contact your administrator.';
    default:
      return err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Every authenticated identity (Google or email/password) is resolved to a
  // Firestore profile keyed by the real Firebase Auth uid. Nobody gets a
  // profile — and therefore no access — unless one already exists for them,
  // except the fixed bootstrap admin addresses on first Google sign-in.
  const syncUserProfile = async (firebaseUser: FirebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    const email = (firebaseUser.email || '').toLowerCase();
    const isAdminEmail = Object.keys(PRECONFIGURED_ADMINS).includes(email);

    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      if (data.status !== 'ACTIVE') {
        await signOut(auth);
        throw new Error('Your account is inactive. Contact your administrator.');
      }
      if (isAdminEmail) {
        // Guarantee admin record exists in /admins/{uid} and profile role is ADMIN
        try {
          await setDoc(doc(db, 'admins', firebaseUser.uid), {
            email,
            verifiedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (e) {
          console.warn('Could not write admin record:', e);
        }

        if (data.role !== 'ADMIN') {
          try {
            await updateDoc(userRef, { role: 'ADMIN' });
            data.role = 'ADMIN';
          } catch (e) {
            console.warn('Could not update role:', e);
          }
        }
      }
      setProfile({ ...data, id: firebaseUser.uid, role: isAdminEmail ? 'ADMIN' : data.role });
      return;
    }

    if (isAdminEmail) {
      const newProfile: UserProfile = {
        id: firebaseUser.uid,
        email,
        name: firebaseUser.displayName || PRECONFIGURED_ADMINS[email]?.name || email.split('@')[0] || 'Owner Administrator',
        role: 'ADMIN',
        profession: 'WEBSITE',
        employmentType: 'FULL_TIME',
        createdBy: 'SYSTEM',
        createdAt: new Date().toISOString(),
        status: 'ACTIVE',
        avatar: firebaseUser.photoURL || undefined,
      };
      await setDoc(userRef, newProfile);
      await setDoc(doc(db, 'admins', firebaseUser.uid), { email, verifiedAt: new Date().toISOString() });
      setProfile(newProfile);
      return;
    }

    // Look up existing profile by primary email OR linked Gmail address so users
    // can directly sign in using their personal or corporate Google account.
    let matchedDoc = null;
    const qEmail = query(collection(db, 'users'), where('email', '==', email));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      matchedDoc = snapEmail.docs[0];
    } else {
      const qGmail = query(collection(db, 'users'), where('gmail', '==', email));
      const snapGmail = await getDocs(qGmail);
      if (!snapGmail.empty) {
        matchedDoc = snapGmail.docs[0];
      }
    }

    if (matchedDoc) {
      const existing = matchedDoc.data() as UserProfile;
      if (existing.status !== 'ACTIVE') {
        await signOut(auth);
        throw new Error('Your account is inactive. Contact your administrator.');
      }
      if (matchedDoc.id !== firebaseUser.uid) {
        await setDoc(userRef, { ...existing, id: firebaseUser.uid, gmail: existing.gmail || email });
        if (matchedDoc.id.startsWith('uid_') || matchedDoc.id.startsWith('temp_')) {
          try {
            await deleteDoc(matchedDoc.ref);
          } catch (e) {
            console.warn('Could not remove temporary doc:', e);
          }
        }
      }
      setProfile({ ...existing, id: firebaseUser.uid, gmail: existing.gmail || email });
      return;
    }

    await signOut(auth);
    throw new Error('No account found for this Google email. Ask your administrator to link your Gmail in User Management.');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        await syncUserProfile(currentUser);
        setUser(currentUser);
      } catch (error) {
        console.error('Profile sync failed, signing out:', error);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  // Real Firebase Authentication sign-in. The account must already exist —
  // created by an admin in User Management (or an auto-provisioned bootstrap
  // admin). Firebase itself rejects unknown emails / wrong passwords; there
  // is no client-side fallback that creates or authorizes an account.
  const signInEmail = async (loginIdInput: string, passInput: string) => {
    const loginId = loginIdInput.trim().toLowerCase();

    if (!loginId) {
      throw new Error('Please enter your Login ID or Email.');
    }
    if (!passInput) {
      throw new Error('Please enter your Password.');
    }
    if (!loginId.includes('@')) {
      throw new Error('Please sign in with your registered email address.');
    }

    try {
      await signInWithEmailAndPassword(auth, loginId, passInput);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  };

  const logOut = async () => {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${activeId}`);
    }
  };

  const emailLower = (user?.email || profile?.email || '').toLowerCase().trim();
  const isPreconfiguredAdmin = Boolean(emailLower && Object.keys(PRECONFIGURED_ADMINS).includes(emailLower));
  const effectiveRole: UserRole = isPreconfiguredAdmin ? 'ADMIN' : (profile?.role || 'EMPLOYEE');

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
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
