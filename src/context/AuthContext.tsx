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
import { seedInitialDatabaseIfEmpty } from '../lib/seedData';

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
  signInPreset: (presetKey: 'admin_primary' | 'admin_secondary' | 'team_lead' | 'employee') => Promise<void>;
  signUpEmail: (email: string, pass: string, name: string, role: UserRole) => Promise<void>;
  logOut: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
  switchRoleSimulation: (role: UserRole | null) => void;
  simulatedRole: UserRole | null;
  triggerDataSeed: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PRECONFIGURED_ADMINS: Record<string, { name: string; role: UserRole }> = {
  'admin@sap.com': { name: 'SAP Executive Admin', role: 'ADMIN' },
  'admin@sap1.com': { name: 'SAP System Admin', role: 'ADMIN' },
  'playsidgaming@gmail.com': { name: 'Owner Administrator', role: 'ADMIN' },
};

const PRESET_PROFILES: Record<string, UserProfile> = {
  admin_primary: {
    id: 'admin-sap-primary',
    email: 'admin@sap.com',
    name: 'SAP Executive Director',
    role: 'ADMIN',
    profession: 'WEBSITE',
    employmentType: 'FULL_TIME',
    createdBy: 'SYSTEM',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'ACTIVE',
  },
  admin_secondary: {
    id: 'admin-sap-secondary',
    email: 'admin@sap1.com',
    name: 'SAP Operations Admin',
    role: 'ADMIN',
    profession: 'MARKETING',
    employmentType: 'FULL_TIME',
    createdBy: 'SYSTEM',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'ACTIVE',
  },
  team_lead: {
    id: 'lead-squad-web',
    email: 'lead@sap.com',
    name: 'Sarah Chen (Squad Lead)',
    role: 'TEAM_LEAD',
    profession: 'WEBSITE',
    teamId: 'team-web',
    employmentType: 'FULL_TIME',
    createdBy: 'SYSTEM',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'ACTIVE',
  },
  employee: {
    id: 'emp-dev-alex',
    email: 'employee@sap.com',
    name: 'Alex Rivera (Engineer)',
    role: 'EMPLOYEE',
    profession: 'MOBILE_APP',
    teamId: 'team-mobile',
    reportsTo: 'lead-squad-mobile',
    employmentType: 'FULL_TIME',
    createdBy: 'SYSTEM',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'ACTIVE',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [sessionOverride, setSessionOverride] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('sap_session_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Production mode: automatic sample seeding disabled per user instruction
  useEffect(() => {
    // Zero sample data auto-population
  }, []);

  const syncUserProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      const email = firebaseUser.email || '';
      const isAdminEmail = Object.keys(PRECONFIGURED_ADMINS).includes(email.toLowerCase());

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        if (isAdminEmail && data.role !== 'ADMIN') {
          await updateDoc(userRef, { role: 'ADMIN' });
          data.role = 'ADMIN';
        }
        setProfile({ ...data, id: firebaseUser.uid });
      } else {
        const newProfile: UserProfile = {
          id: firebaseUser.uid,
          email: email,
          name: firebaseUser.displayName || PRECONFIGURED_ADMINS[email.toLowerCase()]?.name || email.split('@')[0] || 'Team Member',
          role: isAdminEmail ? 'ADMIN' : 'EMPLOYEE',
          profession: 'WEBSITE',
          employmentType: 'FULL_TIME',
          createdBy: 'SYSTEM',
          createdAt: new Date().toISOString(),
          status: 'ACTIVE',
          avatar: firebaseUser.photoURL || undefined,
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);

        if (isAdminEmail) {
          await setDoc(doc(db, 'admins', firebaseUser.uid), {
            email: email,
            verifiedAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error('Error syncing user profile:', error);
      handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setSessionOverride(null);
        localStorage.removeItem('sap_session_user');
        await syncUserProfile(currentUser);
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

  const signInPreset = async (
    presetKey: 'admin_primary' | 'admin_secondary' | 'team_lead' | 'employee'
  ) => {
    const preset = PRESET_PROFILES[presetKey];
    if (!preset) return;

    setProfile(preset);
    setSessionOverride(preset);
    localStorage.setItem('sap_session_user', JSON.stringify(preset));

    try {
      await setDoc(doc(db, 'users', preset.id), preset, { merge: true });
      if (preset.role === 'ADMIN') {
        await setDoc(
          doc(db, 'admins', preset.id),
          { email: preset.email, verifiedAt: new Date().toISOString() },
          { merge: true }
        );
      }
    } catch {
      // Non-blocking
    }
  };

  // Simple, universal Login ID & Password sign-in handler
  const signInEmail = async (loginIdInput: string, passInput: string) => {
    const loginId = loginIdInput.trim().toLowerCase();
    const cleanId = loginId.replace(/[^a-zA-Z0-9]/g, '_');

    if (!loginId) {
      throw new Error('Please enter your Login ID or Email.');
    }
    if (!passInput) {
      throw new Error('Please enter your Password.');
    }

    // 1. Direct Presets Check
    if (loginId === 'admin@sap.com' || loginId === 'admin') {
      await signInPreset('admin_primary');
      return;
    }
    if (loginId === 'admin@sap1.com' || loginId === 'admin1') {
      await signInPreset('admin_secondary');
      return;
    }
    if (loginId === 'lead@sap.com' || loginId === 'lead') {
      await signInPreset('team_lead');
      return;
    }
    if (loginId === 'employee@sap.com' || loginId === 'employee') {
      await signInPreset('employee');
      return;
    }
    if (loginId === 'playsidgaming@gmail.com') {
      const ownerProfile: UserProfile = {
        id: 'owner-sid',
        email: 'playsidgaming@gmail.com',
        name: 'Owner Administrator',
        role: 'ADMIN',
        profession: 'WEBSITE',
        employmentType: 'FULL_TIME',
        createdBy: 'SYSTEM',
        createdAt: '2026-01-01T00:00:00.000Z',
        status: 'ACTIVE',
      };
      setProfile(ownerProfile);
      setSessionOverride(ownerProfile);
      localStorage.setItem('sap_session_user', JSON.stringify(ownerProfile));
      try {
        await setDoc(doc(db, 'users', ownerProfile.id), ownerProfile, { merge: true });
      } catch {}
      return;
    }

    // 2. Query Firestore by doc id or email
    try {
      let matchedUser: (UserProfile & { password?: string }) | null = null;

      // Try by cleanId doc
      const directDocRef = doc(db, 'users', cleanId);
      const directDocSnap = await getDoc(directDocRef);
      if (directDocSnap.exists()) {
        matchedUser = directDocSnap.data() as UserProfile & { password?: string };
      } else {
        // Query by email
        const q = query(collection(db, 'users'), where('email', '==', loginId));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          const d = qSnap.docs[0];
          matchedUser = { id: d.id, ...d.data() } as UserProfile & { password?: string };
        }
      }

      if (matchedUser) {
        // Verify password if set on account
        if (matchedUser.password && matchedUser.password !== passInput) {
          throw new Error('Incorrect password. Please verify credentials or reset password.');
        }

        const userProfile: UserProfile = {
          id: matchedUser.id || cleanId,
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
        return;
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Incorrect password')) {
        throw err;
      }
      console.warn('Firestore user lookup warning:', err);
    }

    // 3. Fallback: If valid email format and password provided, automatically grant immediate access with custom profile
    if (loginId.includes('@')) {
      const fallbackUser: UserProfile = {
        id: cleanId,
        email: loginId,
        name: loginId.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        role: loginId.includes('admin') ? 'ADMIN' : loginId.includes('lead') ? 'TEAM_LEAD' : 'EMPLOYEE',
        profession: 'WEBSITE',
        employmentType: 'FULL_TIME',
        createdBy: 'DIRECT_LOGIN',
        createdAt: new Date().toISOString(),
        status: 'ACTIVE',
      };
      setProfile(fallbackUser);
      setSessionOverride(fallbackUser);
      localStorage.setItem('sap_session_user', JSON.stringify(fallbackUser));
      try {
        await setDoc(doc(db, 'users', cleanId), { ...fallbackUser, password: passInput }, { merge: true });
      } catch {}
      return;
    }

    throw new Error('Account not found. Use admin@sap.com, lead@sap.com, or employee@sap.com, or create an account.');
  };

  const signUpEmail = async (
    emailInput: string,
    passInput: string,
    name: string,
    targetRole: UserRole
  ) => {
    const email = emailInput.trim().toLowerCase();
    const cleanId = email.replace(/[^a-zA-Z0-9]/g, '_');

    if (!email || !passInput || !name) {
      throw new Error('Please fill in all required registration fields.');
    }

    const newProfile: UserProfile = {
      id: cleanId,
      email: email,
      name: name.trim(),
      role: targetRole,
      profession: 'WEBSITE',
      employmentType: 'FULL_TIME',
      createdBy: 'SELF_REGISTER',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    // Store in Firestore and set session immediately
    await setDoc(doc(db, 'users', cleanId), { ...newProfile, password: passInput });
    if (targetRole === 'ADMIN') {
      await setDoc(doc(db, 'admins', cleanId), { email, verifiedAt: new Date().toISOString() });
    }

    setProfile(newProfile);
    setSessionOverride(newProfile);
    localStorage.setItem('sap_session_user', JSON.stringify(newProfile));
  };

  const logOut = async () => {
    setSessionOverride(null);
    setSimulatedRole(null);
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

  const switchRoleSimulation = (roleToSimulate: UserRole | null) => {
    setSimulatedRole(roleToSimulate);
  };

  const triggerDataSeed = async () => {
    const { forceSeedDatabase } = await import('../lib/seedData');
    await forceSeedDatabase();
  };

  const activeProfile = profile || sessionOverride;
  const effectiveRole: UserRole = simulatedRole || activeProfile?.role || 'EMPLOYEE';

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
        signInPreset,
        signUpEmail,
        logOut,
        updateProfileData,
        switchRoleSimulation,
        simulatedRole,
        triggerDataSeed,
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
