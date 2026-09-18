import { getDocs, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types';

export async function cleanupDuplicateUsers(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as UserProfile;
      const canonicalId = data.id || docSnap.id;
      const emailLower = (data.email || '').toLowerCase().trim();

      if (data.id && docSnap.id !== data.id) {
        await deleteDoc(doc(db, 'users', docSnap.id));
        continue;
      }

      if (seenIds.has(canonicalId) || (emailLower && seenEmails.has(emailLower))) {
        await deleteDoc(doc(db, 'users', docSnap.id));
      } else {
        seenIds.add(canonicalId);
        if (emailLower) seenEmails.add(emailLower);
      }
    }
  } catch (err) {
    console.warn('Duplicate user cleanup warning:', err);
  }
}

/**
 * Kept for interface compatibility, but disabled as per user requirement
 * to run a pristine database with zero dummy/sample data.
 */
export async function seedInitialDatabaseIfEmpty(): Promise<boolean> {
  return false;
}

export async function forceSeedDatabase(): Promise<void> {
  return;
}
