import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Creating a user with the Firebase client SDK signs the caller in as that
// new user. Admin-side account creation runs against a throwaway secondary
// app instance instead, so creating an employee's login never displaces the
// admin's own active session.
export async function createUserOnSecondaryApp(email: string, password: string): Promise<string> {
  const existing = getApps().find((a) => a.name === 'admin-provisioning');
  if (existing) {
    await deleteApp(existing);
  }
  const secondaryApp = initializeApp(firebaseConfig, 'admin-provisioning');
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return cred.user.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Internal diagnostic detail (Firestore paths, operation type, the caller's
// own auth metadata) is logged to the console for debugging only. It is
// never put in the thrown Error's message, since that message is shown
// directly to the user in toasts throughout the app — surfacing internal
// document paths and auth internals there would hand anyone probing the UI
// a map of the backend for free.
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', errInfo);

  const isPermissionDenied =
    error instanceof Error && error.message.toLowerCase().includes('permission');
  throw new Error(
    isPermissionDenied
      ? 'You do not have permission to perform this action.'
      : 'Something went wrong. Please try again.'
  );
}

// Skill constraint: Call getFromServer when booting to test connection
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration.');
    }
  }
}

testConnection();
