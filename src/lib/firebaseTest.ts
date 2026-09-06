import { app, auth, googleProvider, db, firebaseConfig } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface AdminVerificationResult {
  uid: string;
  userDocCreatedUpdated: 'PASS' | 'FAIL';
  role: string;
  firestoreRead: 'PASS' | 'FAIL';
  error?: string;
}

export interface DetailedConnectionTestReport {
  firebaseInitialized: 'PASS' | 'FAIL';
  firebaseAuthInitialized: 'PASS' | 'FAIL';
  googleLoginConfigured: 'PASS' | 'FAIL';
  currentFirebaseUserExists: 'PASS' | 'FAIL';
  firestoreInitialized: 'PASS' | 'FAIL';
  firestoreWrite: 'PASS' | 'FAIL';
  firestoreRead: 'PASS' | 'FAIL';
  adminVerification?: AdminVerificationResult;
  projectId: string;
  expectedProjectId: string;
  isProjectIdMatching: boolean;
  userEmail?: string;
  userUid?: string;
  attemptedOperation: string;
  targetPath: string;
  authCurrentUserExists: boolean;
  firebaseErrorCode?: string;
  firebaseErrorMessage?: string;
  timestamp: string;
  summaryMessage: string;
}

/**
 * Configure and verify currently authenticated Firebase user as Admin
 */
export async function configureCurrentUserAsAdmin(): Promise<AdminVerificationResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      uid: '',
      userDocCreatedUpdated: 'FAIL',
      role: 'none',
      firestoreRead: 'FAIL',
      error: 'User is not authenticated (auth.currentUser is null)',
    };
  }

  const userDocRef = doc(db, 'users', currentUser.uid);
  try {
    // 1. Create or update the Firestore document: users/{currentUser.uid}
    await setDoc(
      userDocRef,
      {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Admin',
        email: currentUser.email || '',
        photoURL: currentUser.photoURL || '',
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Read back from Firestore to verify
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const isRoleAdmin = data?.role === 'admin';
      return {
        uid: currentUser.uid,
        userDocCreatedUpdated: 'PASS',
        role: data?.role || 'unknown',
        firestoreRead: isRoleAdmin ? 'PASS' : 'FAIL',
      };
    } else {
      return {
        uid: currentUser.uid,
        userDocCreatedUpdated: 'PASS',
        role: 'unknown',
        firestoreRead: 'FAIL',
        error: 'Document written but getDoc did not find document',
      };
    }
  } catch (err: any) {
    return {
      uid: currentUser.uid,
      userDocCreatedUpdated: 'FAIL',
      role: 'error',
      firestoreRead: 'FAIL',
      error: err?.message || String(err),
    };
  }
}

export async function runDetailedConnectionTest(): Promise<DetailedConnectionTestReport> {
  const expectedProjectId = 'fraudriskhub-44639';
  const currentProjectId = (firebaseConfig?.projectId || app?.options?.projectId || '').trim();
  const isProjectIdMatching = currentProjectId === expectedProjectId;

  // 1. Firebase Web SDK initialized
  let firebaseInitialized: 'PASS' | 'FAIL' = 'FAIL';
  try {
    if (app && app.name && isProjectIdMatching) {
      firebaseInitialized = 'PASS';
    }
  } catch {
    firebaseInitialized = 'FAIL';
  }

  // 2. Firebase Auth initialized
  let firebaseAuthInitialized: 'PASS' | 'FAIL' = 'FAIL';
  try {
    if (auth && typeof auth.onAuthStateChanged === 'function') {
      firebaseAuthInitialized = 'PASS';
    }
  } catch {
    firebaseAuthInitialized = 'FAIL';
  }

  // 3. Google Login configured
  let googleLoginConfigured: 'PASS' | 'FAIL' = 'FAIL';
  try {
    if (googleProvider && googleProvider.providerId === 'google.com') {
      googleLoginConfigured = 'PASS';
    }
  } catch {
    googleLoginConfigured = 'FAIL';
  }

  // 4. Firestore initialized
  let firestoreInitialized: 'PASS' | 'FAIL' = 'FAIL';
  try {
    if ((db && db.type === 'firestore-lite') || db?.app) {
      firestoreInitialized = 'PASS';
    }
  } catch {
    firestoreInitialized = 'FAIL';
  }

  // 5. Check if user is actually authenticated
  const currentUser = auth.currentUser;
  const currentFirebaseUserExists: 'PASS' | 'FAIL' = currentUser ? 'PASS' : 'FAIL';
  const authCurrentUserExists = !!currentUser;

  const targetPath = 'connection_test/firebase_test';
  let attemptedOperation = 'setDoc (Write)';
  let firestoreWrite: 'PASS' | 'FAIL' = 'FAIL';
  let firestoreRead: 'PASS' | 'FAIL' = 'FAIL';
  let firebaseErrorCode: string | undefined;
  let firebaseErrorMessage: string | undefined;
  let summaryMessage = '';

  const testDocRef = doc(db, 'connection_test', 'firebase_test');

  // Attempt Write operation using currently authenticated user
  try {
    attemptedOperation = 'setDoc (Write)';
    await setDoc(testDocRef, {
      test: true,
      message: 'Firebase connection successful',
      timestamp: serverTimestamp(),
    });
    firestoreWrite = 'PASS';

    // Attempt Read operation
    attemptedOperation = 'getDoc (Read)';
    const snap = await getDoc(testDocRef);
    if (snap.exists() && snap.data()?.test === true) {
      firestoreRead = 'PASS';
      summaryMessage = `Success: Firestore read & write verified on ${targetPath}.`;
    } else {
      firestoreRead = 'FAIL';
      summaryMessage = `Document was written but read did not return expected data.`;
    }
  } catch (err: any) {
    firebaseErrorCode = err?.code || 'unknown';
    firebaseErrorMessage = err?.message || String(err);
    if (!currentUser) {
      summaryMessage = `Firestore access denied: User is not authenticated (auth.currentUser is null). Security rule 'request.auth != null' rejected unauthenticated operation.`;
    } else {
      summaryMessage = `Firestore access error on ${attemptedOperation}: ${firebaseErrorMessage}`;
    }
  }

  // If user is authenticated, configure and verify Admin role in Firestore: users/{uid}
  let adminVerification: AdminVerificationResult | undefined;
  if (currentUser) {
    try {
      adminVerification = await configureCurrentUserAsAdmin();
    } catch (e: any) {
      adminVerification = {
        uid: currentUser.uid,
        userDocCreatedUpdated: 'FAIL',
        role: 'error',
        firestoreRead: 'FAIL',
        error: e?.message,
      };
    }
  }

  return {
    firebaseInitialized,
    firebaseAuthInitialized,
    googleLoginConfigured,
    currentFirebaseUserExists,
    firestoreInitialized,
    firestoreWrite,
    firestoreRead,
    adminVerification,
    projectId: currentProjectId,
    expectedProjectId,
    isProjectIdMatching,
    userEmail: currentUser?.email || undefined,
    userUid: currentUser?.uid || undefined,
    attemptedOperation,
    targetPath,
    authCurrentUserExists,
    firebaseErrorCode,
    firebaseErrorMessage,
    timestamp: new Date().toISOString(),
    summaryMessage,
  };
}

// Backward-compatible alias for existing imports
export const runFirebaseConnectionTest = runDetailedConnectionTest;
export type FirebaseTestResult = DetailedConnectionTestReport;

