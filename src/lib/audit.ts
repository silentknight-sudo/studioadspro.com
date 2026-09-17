import { addDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { AuditLog } from '../types';

export async function logAuditEvent(action: string, performedBy: string, details: string) {
  try {
    const auditData: Omit<AuditLog, 'id'> = {
      action,
      performedBy,
      details,
      timestamp: new Date().toISOString(),
    };
    await addDoc(collection(db, 'audits'), auditData);
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Silent fail so main action continues smoothly
  }
}
