/**
 * Firestore Utilities & Data Sanitizer
 * 
 * Guarantees zero `undefined` values, NaN sanitization, and safe document creation/updates
 * across the entire ZeroLag production application.
 */
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  setDoc, 
  DocumentReference, 
  CollectionReference, 
  SetOptions 
} from 'firebase/firestore';

/**
 * Recursively cleans any object or array so that:
 * - All `undefined` properties are removed (Firestore throws an error on `undefined`).
 * - All `NaN` numbers are converted to `0`.
 * - Preserves Date objects, Firestore Timestamps, and primitives.
 */
export function cleanFirestoreData<T = any>(obj: T): T {
  if (obj === undefined || obj === null) {
    return obj;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj;
  }

  // Handle Firestore FieldValues (serverTimestamp, deleteField, etc.) or Timestamps
  if (typeof obj === 'object' && ('_methodName' in (obj as any) || 'toMillis' in (obj as any) || 'seconds' in (obj as any))) {
    return obj;
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => cleanFirestoreData(item)) as unknown as T;
  }

  // Handle Numbers
  if (typeof obj === 'number') {
    return (isNaN(obj) ? 0 : obj) as unknown as T;
  }

  // Handle plain objects
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        result[key] = cleanFirestoreData(value);
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Safe addDoc wrapper that cleans data before writing to Firestore.
 */
export async function safeAddDoc(colRef: CollectionReference, data: any): Promise<DocumentReference> {
  const sanitized = cleanFirestoreData(data);
  return await addDoc(colRef, sanitized);
}

/**
 * Safe updateDoc wrapper that cleans data before updating in Firestore.
 */
export async function safeUpdateDoc(docRef: DocumentReference, data: any): Promise<void> {
  const sanitized = cleanFirestoreData(data);
  return await updateDoc(docRef, sanitized);
}

/**
 * Safe setDoc wrapper that cleans data before writing to Firestore.
 */
export async function safeSetDoc(docRef: DocumentReference, data: any, options?: SetOptions): Promise<void> {
  const sanitized = cleanFirestoreData(data);
  if (options) {
    return await setDoc(docRef, sanitized, options);
  }
  return await setDoc(docRef, sanitized);
}
