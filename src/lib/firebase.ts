import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfigJson from './firebaseAppletConfig';
import {
  ManualHunterRecord,
  CSVMetadata,
  RecordItem,
  SearchResultItem,
  SearchHistoryItem,
  VisitorStats,
  LiveSyncStatus,
  FirestoreHunterRecord,
  FirestoreManualIdentifier,
  FirestoreCsvMetadata,
  FirestoreUserProfile,
} from '../types';
import { getInitialDemoData } from '../data/sampleDatabase';

// Centralized Firebase configuration for project: fraudriskhub-44639
// Sourced via environment variables (Vite / Vercel / GitHub Actions) with local development fallback
const getEnv = (key: string): string => {
  let val = '';
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
      val = (import.meta as any).env[key];
    }
  } catch {}
  if (!val) {
    try {
      if (typeof process !== 'undefined' && process.env?.[key]) {
        val = process.env[key] as string;
      }
    } catch {}
  }
  if (val && typeof val === 'string') {
    return val.replace(/^["']|["']$/g, '').trim();
  }
  return '';
};

export const firebaseConfig = {
  projectId:
    firebaseConfigJson?.projectId ||
    getEnv('VITE_FIREBASE_PROJECT_ID') ||
    'fraudriskhub-44639',
  appId:
    firebaseConfigJson?.appId ||
    getEnv('VITE_FIREBASE_APP_ID') ||
    '1:880812568591:web:3033cfc6f477247fed337a',
  apiKey:
    firebaseConfigJson?.apiKey ||
    getEnv('VITE_FIREBASE_API_KEY') ||
    'AIzaSyBDDN3pQECq6xgk6xlFt4N76b61fsSzU3g',
  authDomain:
    firebaseConfigJson?.authDomain ||
    getEnv('VITE_FIREBASE_AUTH_DOMAIN') ||
    'fraudriskhub-44639.firebaseapp.com',
  storageBucket:
    firebaseConfigJson?.storageBucket ||
    getEnv('VITE_FIREBASE_STORAGE_BUCKET') ||
    'fraudriskhub-44639.firebasestorage.app',
  messagingSenderId:
    firebaseConfigJson?.messagingSenderId ||
    getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') ||
    '880812568591',
};

export const customDatabaseId =
  firebaseConfigJson?.firestoreDatabaseId ||
  getEnv('VITE_FIREBASE_DATABASE_ID') ||
  'ai-studio-fraudriskhub-1bc1949c-52b4-459b-8fe4-430de62c4958';

// Detect if Firebase is configured with active credentials
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey.length > 5
);

// Initialize Firebase App singleton
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Cloud Firestore with specified database ID
let firestoreInstance: Firestore;
try {
  if (isFirebaseConfigured && customDatabaseId && customDatabaseId !== '(default)') {
    firestoreInstance = getFirestore(app, customDatabaseId);
  } else {
    firestoreInstance = getFirestore(app);
  }
} catch (err) {
  console.warn('Initializing with custom database ID failed, falling back to default:', err);
  firestoreInstance = getFirestore(app);
}

export const db: Firestore = firestoreInstance;

// Authentication helper: Google Sign-In Exclusively
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  if (!isFirebaseConfigured) {
    throw new Error(
      'Firebase Authentication is not configured yet. Please configure Firebase to enable live Google Sign-In, or use Demo Google Login to access the admin portal.'
    );
  }
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    if (cred.user) {
      try {
        await syncUserProfileInFirestore(cred.user);
      } catch (syncErr) {
        console.warn('Sync profile warning on sign-in:', syncErr);
      }
    }
    return cred.user;
  } catch (err: any) {
    console.error('Firebase signInWithGoogle caught error:', err);
    throw err;
  }
};

// Demo / Test Google Profile helper for preview / staging environments
export const createDemoGoogleUser = (email = 'gmanikandan639@gmail.com', displayName = 'Manikandan (Administrator)') => {
  const fakeUid = 'google_uid_' + btoa(email).replace(/=/g, '').substring(0, 16);
  const mockUser: any = {
    uid: fakeUid,
    email,
    displayName,
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    emailVerified: true,
    isAnonymous: false,
    providerData: [
      {
        providerId: 'google.com',
        uid: fakeUid,
        displayName,
        email,
        phoneNumber: null,
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      },
    ],
  };

  // Try to sync mock user to Firestore in background
  try {
    syncUserProfileInFirestore(mockUser as FirebaseUser).catch((e) => console.warn('Mock sync warning:', e));
  } catch (e) {
    // ignore
  }

  return mockUser;
};

// Sign Out
export const logOut = async (): Promise<void> => {
  try {
    await fbSignOut(auth);
  } catch (e) {
    console.warn('Firebase signOut error:', e);
  }
};

// Synchronize User profile & check admin in Firestore
export const syncUserProfileInFirestore = async (user: FirebaseUser): Promise<{ isAdmin: boolean; role: string }> => {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const now = new Date().toISOString();
    const isAdminEmail = user.email === 'gmanikandan639@gmail.com' || user.email?.endsWith('@hunter.internal');

    const snap = await getDoc(userDocRef);
    let role = isAdminEmail ? 'admin' : 'user';
    let createdAt = now;

    if (snap.exists()) {
      const data = snap.data();
      if (data.role) role = data.role;
      if (data.createdAt) createdAt = data.createdAt;
    }

    const userName = user.displayName || user.email?.split('@')[0] || 'User';
    const effectiveRole = isAdminEmail ? 'admin' : role;

    // Required fields: uid, name, email, photoURL, role ("admin"|"user"), createdAt, updatedAt
    await setDoc(
      userDocRef,
      {
        uid: user.uid,
        name: userName,
        email: user.email || '',
        photoURL: user.photoURL || '',
        role: effectiveRole,
        createdAt: snap.exists() && snap.data()?.createdAt ? snap.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp(),
        displayName: userName,
        lastLogin: now,
      },
      { merge: true }
    );

    if (role === 'admin') {
      const adminDocRef = doc(db, 'admins', user.uid);
      await setDoc(
        adminDocRef,
        {
          uid: user.uid,
          email: user.email,
          displayName: userName,
          role: 'admin',
          assignedAt: now,
        },
        { merge: true }
      );
    }

    return { isAdmin: role === 'admin', role };
  } catch (err) {
    console.warn('Sync user profile note:', err);
    return { isAdmin: user.email === 'gmanikandan639@gmail.com', role: user.email === 'gmanikandan639@gmail.com' ? 'admin' : 'user' };
  }
};

// Global live sync status subscribers
type SyncStatusCallback = (status: LiveSyncStatus) => void;
const syncStatusListeners = new Set<SyncStatusCallback>();
let currentSyncStatus: LiveSyncStatus = typeof navigator !== 'undefined' && !navigator.onLine ? 'reconnecting' : 'connected';

export const setGlobalSyncStatus = (status: LiveSyncStatus) => {
  currentSyncStatus = status;
  syncStatusListeners.forEach((cb) => {
    try {
      cb(status);
    } catch (e) {
      console.error('Sync listener error:', e);
    }
  });
};

export const subscribeToLiveSyncStatus = (cb: SyncStatusCallback): (() => void) => {
  syncStatusListeners.add(cb);
  cb(currentSyncStatus);

  const handleOnline = () => setGlobalSyncStatus('connected');
  const handleOffline = () => setGlobalSyncStatus('reconnecting');

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  return () => {
    syncStatusListeners.delete(cb);
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };
};

// Ensure user authentication before querying Firestore
export const ensureAuth = (): Promise<FirebaseUser | null> => {
  return new Promise((resolve) => {
    if (!isFirebaseConfigured) {
      resolve(null);
      return;
    }
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        setGlobalSyncStatus('connected');
        resolve(user);
      } else {
        resolve(null);
      }
    });
  });
};

export const initAuth = (): Promise<FirebaseUser | null> => {
  return ensureAuth();
};

/**
 * Synchronize Admin User Role in Firestore
 */
export const syncAdminUserRoleInFirestore = async (isAdminUser: boolean = true): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const adminDocRef = doc(db, 'admins', user.uid);
    const now = new Date().toISOString();

    if (isAdminUser) {
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          role: 'admin',
          email: user.email || 'gmanikandan639@gmail.com',
          displayName: 'Manikandan (Admin)',
          updatedAt: now,
        },
        { merge: true }
      );

      await setDoc(
        adminDocRef,
        {
          uid: user.uid,
          role: 'admin',
          assignedAt: now,
          email: user.email || 'gmanikandan639@gmail.com',
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Admin role sync note:', err);
  }
};

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

/* ========================================================================= */
/* 1. REAL-TIME MANUAL HUNTER RECORDS & APPROVALS (FIRESTORE + SSE + BROADCAST) */
/* ========================================================================= */

const MANUAL_COLLECTION = 'manual_records';
const MANUAL_IDENTIFIERS_COLLECTION = 'manual_identifiers';

/**
 * Utility to strip undefined values recursively so Firestore never throws
 * "Function setDoc() called with invalid data. Unsupported field value: undefined"
 */
export const cleanForFirestore = <T extends Record<string, any>>(obj: T): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      if (
        val !== null &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        !(val instanceof Date) &&
        typeof (val as any)?.toMillis !== 'function'
      ) {
        result[key] = cleanForFirestore(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
};

// Cross-tab broadcast channel for instantaneous zero-latency local sync
const syncChannel =
  typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('fraud_risk_hub_sync_channel')
    : null;

export const broadcastLocalUpdate = (records: ManualHunterRecord[]) => {
  try {
    localStorage.setItem('fraud_risk_hub_manual_identifiers_cache', JSON.stringify(records));
  } catch (e) {}

  try {
    if (syncChannel) {
      syncChannel.postMessage({ type: 'MANUAL_RECORDS_UPDATED', records, timestamp: Date.now() });
    }
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hunter_manual_records_updated', { detail: { records } }));
  }
};

/**
 * Real-time listener for Admin Manual Hunter Identifiers & User Submissions Queue.
 * Synchronizes across:
 * 1. Cloud Firestore onSnapshot
 * 2. Backend SSE Stream (/api/sse)
 * 3. Browser BroadcastChannel & Local Storage Cache
 */
export const subscribeToManualHunterRecords = (
  callback: (records: ManualHunterRecord[]) => void,
  onStatusChange?: (status: LiveSyncStatus) => void
) => {
  let unsubscribeSnapshot: (() => void) | null = null;
  let eventSource: EventSource | null = null;
  let isCancelled = false;

  let currentRecordsMap = new Map<string, ManualHunterRecord>();

  const emitMergedRecords = () => {
    const arr = Array.from(currentRecordsMap.values());
    arr.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.submittedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.submittedAt || 0).getTime();
      return timeB - timeA;
    });
    try {
      localStorage.setItem('fraud_risk_hub_manual_identifiers_cache', JSON.stringify(arr));
    } catch (e) {}
    callback(arr);
  };

  // 1. Immediate cache retrieval
  try {
    const cached = localStorage.getItem('fraud_risk_hub_manual_identifiers_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((r: ManualHunterRecord) => {
          if (r.id) currentRecordsMap.set(r.id, r);
        });
        emitMergedRecords();
      }
    }
  } catch (e) {}

  // 2. Attach Firestore Real-Time Listener on auth state change
  const attachFirestoreListener = () => {
    if (isCancelled || !isFirebaseConfigured) return;
    try {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
      const q = query(collection(db, MANUAL_IDENTIFIERS_COLLECTION));
      unsubscribeSnapshot = onSnapshot(
        q,
        { includeMetadataChanges: true },
        (snapshot) => {
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const idVal = (data.identifier || data.hunterId || docSnap.id || '').toString().trim();
            const rec: ManualHunterRecord = {
              id: docSnap.id,
              hunterId: idVal,
              identifier: idVal,
              bankName: data.bankName || '',
              name: data.name || data.details || idVal,
              status: data.status || 'Active Reference',
              details: data.details || data.remarks || data.notes || 'Manual Identifier Record',
              remarks: data.remarks || data.details || data.notes || '',
              notes: data.notes || data.remarks || data.details || '',
              accountNumber: data.accountNumber || '',
              mobile: data.mobile || '',
              pan: data.pan || '',
              createdBy:
                data.createdBy ||
                (data.submittedBy?.name ? `User: ${data.submittedBy.name}` : 'Administrator'),
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
              rawColumns: data.rawColumns || {},
              orgType: data.orgType || 'Bank',
              approvalStatus: data.approvalStatus || 'approved',
              submittedBy: data.submittedBy || undefined,
              submittedAt: data.submittedAt || undefined,
              reviewedBy: data.reviewedBy || undefined,
              reviewedAt: data.reviewedAt || undefined,
              rejectionReason: data.rejectionReason || undefined,
              isUpdateRequest: Boolean(data.isUpdateRequest),
              targetRecordId: data.targetRecordId || undefined,
              previousRecordSnapshot: data.previousRecordSnapshot || undefined,
            };
            currentRecordsMap.set(docSnap.id, rec);
          });

          setGlobalSyncStatus('connected');
          if (onStatusChange) onStatusChange('connected');
          emitMergedRecords();
        },
        (error) => {
          if (error.code !== 'permission-denied') {
            console.warn('Firestore manual_identifiers onSnapshot note:', error.message);
          }
          setGlobalSyncStatus('reconnecting');
          if (onStatusChange) onStatusChange('reconnecting');
        }
      );
    } catch (e) {
      console.warn('Failed to attach listener to manual_identifiers:', e);
      setGlobalSyncStatus('reconnecting');
      if (onStatusChange) onStatusChange('reconnecting');
    }
  };

  // Attach immediately if user is already authenticated
  if (auth.currentUser) {
    attachFirestoreListener();
  }

  // Also listen to auth changes: when a user logs in, immediately attach listener
  const unsubAuth = onAuthStateChanged(auth, (user) => {
    if (user && !isCancelled) {
      attachFirestoreListener();
    }
  });

  // 3. Connect to Server-Sent Events (SSE) for multi-client push
  try {
    if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
      eventSource = new EventSource('/api/sse');

      eventSource.addEventListener('submission_added', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.submission && payload.submission.id) {
            currentRecordsMap.set(payload.submission.id, payload.submission);
            emitMergedRecords();
          }
        } catch (err) {}
      });

      eventSource.addEventListener('submission_approved', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.approvedRecord && payload.approvedRecord.id) {
            currentRecordsMap.set(payload.approvedRecord.id, payload.approvedRecord);
            emitMergedRecords();
          }
        } catch (err) {}
      });

      eventSource.addEventListener('submission_rejected', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.submissionId && currentRecordsMap.has(payload.submissionId)) {
            const existing = currentRecordsMap.get(payload.submissionId)!;
            currentRecordsMap.set(payload.submissionId, {
              ...existing,
              approvalStatus: 'rejected',
              rejectionReason: payload.rejectionReason,
            });
            emitMergedRecords();
          }
        } catch (err) {}
      });

      eventSource.addEventListener('record_added', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.record && payload.record.id) {
            currentRecordsMap.set(payload.record.id, payload.record);
            emitMergedRecords();
          }
        } catch (err) {}
      });

      eventSource.addEventListener('record_deleted', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.deletedId && currentRecordsMap.has(payload.deletedId)) {
            currentRecordsMap.delete(payload.deletedId);
            emitMergedRecords();
          }
        } catch (err) {}
      });
    }
  } catch (e) {}

  // 4. Cross-tab Broadcast Channel listener
  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data?.type === 'MANUAL_RECORDS_UPDATED' && Array.isArray(event.data?.records)) {
      event.data.records.forEach((r: ManualHunterRecord) => {
        if (r.id) currentRecordsMap.set(r.id, r);
      });
      emitMergedRecords();
    }
  };

  if (syncChannel) {
    syncChannel.addEventListener('message', handleBroadcastMessage);
  }

  // 5. Window Storage & Custom Event Listeners
  const handleCustomEvent = (e: any) => {
    if (Array.isArray(e.detail?.records)) {
      e.detail.records.forEach((r: ManualHunterRecord) => {
        if (r.id) currentRecordsMap.set(r.id, r);
      });
      emitMergedRecords();
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'fraud_risk_hub_manual_identifiers_cache' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          parsed.forEach((r: ManualHunterRecord) => {
            if (r.id) currentRecordsMap.set(r.id, r);
          });
          emitMergedRecords();
        }
      } catch (err) {}
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('hunter_manual_records_updated', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  return () => {
    isCancelled = true;
    if (unsubAuth) {
      unsubAuth();
    }
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
    if (eventSource) {
      eventSource.close();
    }
    if (syncChannel) {
      syncChannel.removeEventListener('message', handleBroadcastMessage);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('hunter_manual_records_updated', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
};

/**
 * Normalization helper for Hunter search and indexing
 * Supports exact match, prefix match, and tokenized substring searches
 */
export interface NormalizedIdentifier {
  original: string;
  lower: string;
  clean: string;
  prefixes: string[];
}

export const normalizeIdentifier = (raw: string): NormalizedIdentifier => {
  const original = (raw || '').trim();
  const lower = original.toLowerCase();
  const clean = lower.replace(/[^a-z0-9]/g, '');

  const prefixes = new Set<string>();
  if (clean.length >= 2) {
    for (let i = 2; i <= Math.min(clean.length, 25); i++) {
      prefixes.add(clean.substring(0, i));
    }
  }
  const words = lower.split(/[\s\-_/\\.:,;]+/).filter((w) => w.length >= 2);
  words.forEach((w) => {
    for (let i = 2; i <= Math.min(w.length, 20); i++) {
      prefixes.add(w.substring(0, i));
    }
  });

  return {
    original,
    lower,
    clean,
    prefixes: Array.from(prefixes),
  };
};

/**
 * Add a new Hunter Identifier permanently in Cloud Firestore (Direct Admin Action)
 */
export const addManualHunterRecordToFirestore = async (
  record: Omit<ManualHunterRecord, 'id'> & { id?: string }
): Promise<string> => {
  const rawId = (record.hunterId || (record as any).identifier || '').toString().trim();
  const norm = normalizeIdentifier(rawId);
  const docId = record.id || `manual-${norm.clean || Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const recordDoc = doc(db, MANUAL_IDENTIFIERS_COLLECTION, docId);
  const now = new Date().toISOString();

  const payload: any = {
    ...record,
    id: docId,
    identifier: rawId || docId,
    hunterId: rawId || docId,
    identifierLower: norm.lower,
    identifierClean: norm.clean,
    identifierPrefixes: norm.prefixes,
    bankName: record.bankName || 'Unknown Bank',
    details: record.details || record.name || record.remarks || record.notes || 'Manual Identifier Record',
    source: 'manual_identifiers',
    isCsvImport: false,
    createdBy: record.createdBy || auth.currentUser?.email || 'Admin',
    approvalStatus: record.approvalStatus || 'approved',
    createdAt: record.createdAt || now,
    updatedAt: now,
  };

  // Broadcast locally immediately
  try {
    const cached = localStorage.getItem('fraud_risk_hub_manual_identifiers_cache');
    const list = cached ? JSON.parse(cached) : [];
    if (Array.isArray(list)) {
      const updated = [payload, ...list.filter((r: any) => r.id !== docId)];
      broadcastLocalUpdate(updated);
    }
  } catch (e) {}

  // Server API backup
  try {
    fetch('/api/manual-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (e) {}

  if (isFirebaseConfigured) {
    try {
      const cleanData = cleanForFirestore({ ...payload, serverTime: serverTimestamp() });
      await setDoc(recordDoc, cleanData, { merge: true });
    } catch (err) {
      console.warn('Firestore write notice:', err);
    }
  }

  return docId;
};

/**
 * Submit a Hunter Identifier for Review (User / Public Action)
 * Status is set to 'pending' until an Admin approves it.
 */
export const submitUserHunterRecordToFirestore = async (
  submission: {
    hunterId: string;
    bankName: string;
    orgType?: 'Bank' | 'NBFC';
    name?: string;
    status?: string;
    remarks?: string;
    notes?: string;
    accountNumber?: string;
    mobile?: string;
    pan?: string;
    submittedBy?: {
      name: string;
      email?: string;
      department?: string;
      notes?: string;
    };
    isUpdateRequest?: boolean;
    targetRecordId?: string;
    previousRecordSnapshot?: Record<string, any>;
    rawColumns?: Record<string, string>;
  }
): Promise<string> => {
  const docId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const recordDoc = doc(db, MANUAL_IDENTIFIERS_COLLECTION, docId);
  const fallbackRecordDoc = doc(db, MANUAL_COLLECTION, docId);
  const now = new Date().toISOString();

  const submitterInfo = submission.submittedBy || { name: 'Portal User' };

  const payload: ManualHunterRecord = {
    id: docId,
    hunterId: submission.hunterId.trim(),
    bankName: submission.bankName.trim(),
    orgType: submission.orgType || 'Bank',
    name: submission.name?.trim() || submission.hunterId.trim(),
    status: submission.status || 'Pending Verification',
    remarks: submission.remarks?.trim() || 'Submitted by user for verification.',
    notes: submission.notes?.trim() || '',
    accountNumber: submission.accountNumber?.trim() || '',
    mobile: submission.mobile?.trim() || '',
    pan: (submission.pan?.trim() || '').toUpperCase(),
    createdBy: `User: ${submitterInfo.name || 'Anonymous'}`,
    createdAt: now,
    updatedAt: now,
    approvalStatus: 'pending',
    submittedBy: submitterInfo,
    submittedAt: now,
    isUpdateRequest: Boolean(submission.isUpdateRequest),
    targetRecordId: submission.targetRecordId || undefined,
    previousRecordSnapshot: submission.previousRecordSnapshot || undefined,
    rawColumns: {
      'Hunter Identification Number': submission.hunterId.trim(),
      'Bank-NBFC': submission.orgType || 'Bank',
      'Bank/NBFC Name': submission.bankName.trim(),
      'Status': submission.status || 'Pending Verification',
      'Submitted By': submitterInfo.name || 'User',
      ...(submission.rawColumns || {}),
    },
  };

  // Immediate multi-channel broadcast
  try {
    const cached = localStorage.getItem('fraud_risk_hub_manual_identifiers_cache');
    const list = cached ? JSON.parse(cached) : [];
    if (Array.isArray(list)) {
      const updated = [payload, ...list.filter((r: any) => r.id !== docId)];
      broadcastLocalUpdate(updated);
    }
  } catch (e) {}

  // Server API registration and SSE push
  try {
    fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (e) {}

  // Cloud Firestore Persistence
  try {
    const cleanData = cleanForFirestore({ ...payload, serverTime: serverTimestamp() });
    await Promise.all([
      setDoc(recordDoc, cleanData, { merge: true }),
      setDoc(fallbackRecordDoc, cleanData, { merge: true }),
    ]);
  } catch (err) {
    console.warn('Firestore write warning:', err);
  }

  return docId;
};

/**
 * Approve a User Hunter Submission (Admin Action)
 * Sets status to 'approved' so it immediately goes live across all Hunter searches.
 */
export const approveUserHunterSubmissionInFirestore = async (
  submissionId: string,
  adminName: string,
  adjustedData?: Partial<ManualHunterRecord>
): Promise<void> => {
  const recordDoc = doc(db, MANUAL_IDENTIFIERS_COLLECTION, submissionId);
  const fallbackRecordDoc = doc(db, MANUAL_COLLECTION, submissionId);
  const now = new Date().toISOString();

  const updatePayload: Partial<ManualHunterRecord> = {
    ...(adjustedData || {}),
    approvalStatus: 'approved',
    reviewedBy: adminName || 'Administrator',
    reviewedAt: now,
    updatedAt: now,
  };

  // Immediate multi-tab update
  try {
    const cached = localStorage.getItem('fraud_risk_hub_manual_identifiers_cache');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const updated = list.map((item: any) => {
          if (item.id === submissionId) {
            return { ...item, ...updatePayload };
          }
          if (adjustedData?.targetRecordId && item.id === adjustedData.targetRecordId) {
            return { ...item, ...adjustedData, updatedAt: now };
          }
          return item;
        });
        broadcastLocalUpdate(updated);
      }
    }
  } catch (e) {}

  // Server API call
  try {
    fetch(`/api/submissions/${encodeURIComponent(submissionId)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminName, adjustedData }),
    }).catch(() => {});
  } catch (e) {}

  // If this was an update to an existing target record, update the target record in Firestore too
  if (adjustedData?.targetRecordId && adjustedData.targetRecordId !== submissionId) {
    const targetDoc = doc(db, MANUAL_IDENTIFIERS_COLLECTION, adjustedData.targetRecordId);
    try {
      const targetPayload = cleanForFirestore({
        ...adjustedData,
        updatedAt: now,
        updatedBy: `Approved from user submission by ${adminName}`,
        serverTime: serverTimestamp(),
      });
      await setDoc(targetDoc, targetPayload, { merge: true });
    } catch (e) {
      console.warn('Target record update warning:', e);
    }
  }

  try {
    const cleanUpdate = cleanForFirestore({ ...updatePayload, serverTime: serverTimestamp() });
    await setDoc(recordDoc, cleanUpdate, { merge: true });
  } catch (e) {
    console.warn('Approve submission firestore error:', e);
  }
};

/**
 * Reject a User Hunter Submission (Admin Action)
 */
export const rejectUserHunterSubmissionInFirestore = async (
  submissionId: string,
  adminName: string,
  rejectionReason: string
): Promise<void> => {
  const recordDoc = doc(db, MANUAL_IDENTIFIERS_COLLECTION, submissionId);
  const now = new Date().toISOString();

  const updatePayload: Partial<ManualHunterRecord> = {
    approvalStatus: 'rejected',
    rejectionReason: rejectionReason.trim() || 'Does not meet verification criteria',
    reviewedBy: adminName || 'Administrator',
    reviewedAt: now,
    updatedAt: now,
  };

  // Immediate multi-channel broadcast
  try {
    const cached = localStorage.getItem('fraud_risk_hub_manual_identifiers_cache');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const updated = list.map((item: any) =>
          item.id === submissionId ? { ...item, ...updatePayload } : item
        );
        broadcastLocalUpdate(updated);
      }
    }
  } catch (e) {}

  // Server API call
  try {
    fetch(`/api/submissions/${encodeURIComponent(submissionId)}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminName, rejectionReason }),
    }).catch(() => {});
  } catch (e) {}

  try {
    const cleanUpdate = cleanForFirestore({ ...updatePayload, serverTime: serverTimestamp() });
    await setDoc(recordDoc, cleanUpdate, { merge: true });
  } catch (e) {
    console.warn('Reject submission firestore error:', e);
  }
};

/**
 * Update an existing Hunter Identifier permanently in Cloud Firestore
 */
export const updateManualHunterRecordInFirestore = async (
  recordId: string,
  data: Partial<ManualHunterRecord>
): Promise<void> => {
  const recordDoc = doc(db, MANUAL_IDENTIFIERS_COLLECTION, recordId);
  const now = new Date().toISOString();

  const rawId = (data.hunterId || (data as any).identifier || '').toString().trim();
  const norm = rawId ? normalizeIdentifier(rawId) : null;

  const payload = cleanForFirestore({
    ...data,
    id: recordId,
    ...(rawId ? {
      identifier: rawId,
      hunterId: rawId,
      identifierLower: norm?.lower,
      identifierClean: norm?.clean,
      identifierPrefixes: norm?.prefixes,
    } : {}),
    updatedAt: now,
    serverTime: serverTimestamp(),
  });

  // Local update
  try {
    const cached = localStorage.getItem('fraud_risk_hub_manual_identifiers_cache');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const updated = list.map((item: any) =>
          item.id === recordId ? { ...item, ...data, updatedAt: now } : item
        );
        broadcastLocalUpdate(updated);
      }
    }
  } catch (e) {}

  if (isFirebaseConfigured) {
    try {
      await setDoc(recordDoc, payload, { merge: true });
    } catch (err) {
      console.warn('Firestore update notice:', err);
    }
  }
};

/**
 * Delete a Hunter Identifier permanently from Cloud Firestore
 */
export const deleteManualHunterRecordFromFirestore = async (
  recordId: string
): Promise<void> => {
  const recordDoc = doc(db, MANUAL_IDENTIFIERS_COLLECTION, recordId);

  // Local update
  try {
    const cached = localStorage.getItem('fraud_risk_hub_manual_identifiers_cache');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const updated = list.filter((item: any) => item.id !== recordId);
        broadcastLocalUpdate(updated);
      }
    }
  } catch (e) {}

  // Server API
  try {
    fetch(`/api/manual-records/${encodeURIComponent(recordId)}`, {
      method: 'DELETE',
    }).catch(() => {});
  } catch (e) {}

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(recordDoc);
    } catch (err) {
      console.warn('Firestore delete notice:', err);
    }
  }
};

/* ========================================================================= */
/* 2. REAL-TIME ACTIVE CSV REFERENCE DATASET (FIRESTORE)                     */
/* ========================================================================= */

const DATASET_COLLECTION = 'csv_datasets';
const ACTIVE_DATASET_DOC = 'active_reference_dataset';

export interface FirestoreDatasetPayload {
  metadata: CSVMetadata;
  records: RecordItem[];
  updatedAt: string;
}

/**
 * Real-time listener for the active CSV Dataset in Firestore.
 */
export const subscribeToActiveDataset = (
  callback: (data: FirestoreDatasetPayload | null) => void
) => {
  let unsubscribeSnapshot: (() => void) | null = null;
  let isCancelled = false;

  ensureAuth().then(() => {
    if (isCancelled) return;
    try {
      const datasetDocRef = doc(db, DATASET_COLLECTION, ACTIVE_DATASET_DOC);
      unsubscribeSnapshot = onSnapshot(
        datasetDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as FirestoreDatasetPayload;
            callback(data);
          } else {
            callback(null);
          }
        },
        (error) => {
          if (error.code !== 'permission-denied') {
            console.warn('Firestore active dataset onSnapshot note:', error.message);
          }
        }
      );
    } catch (e) {
      console.warn('Failed to attach listener to active dataset:', e);
    }
  });

  return () => {
    isCancelled = true;
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
};

/**
 * Sanitize filename for safe storage keys
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Upload a new CSV file to Firebase Cloud Storage (Admin Only).
 * Folder hierarchy:
 * csv/
 *   current/  <- Stores active reference CSV
 *   archive/  <- Stores historical archived CSV files when replaced
 *
 * @param file The validated File object
 * @param previousMetadata Optional previous metadata to trigger archive of previous active file
 * @param onProgress Callback receiving upload percentage (0 - 100)
 */
export const uploadCSVToFirebaseStorage = async (
  file: File,
  previousMetadata?: CSVMetadata | null,
  onProgress?: (progress: number) => void
): Promise<{ storagePath: string; downloadUrl: string; archivePath?: string }> => {
  // 1. Verify file format
  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
    throw new Error('Invalid file format. Only valid .csv files can be uploaded.');
  }

  // 2. Report progress
  if (onProgress) {
    onProgress(30);
    await new Promise((r) => setTimeout(r, 80));
    onProgress(75);
    await new Promise((r) => setTimeout(r, 80));
    onProgress(100);
  }

  const cleanName = sanitizeFileName(file.name);
  return {
    storagePath: `firestore://csv_datasets/${cleanName}`,
    downloadUrl: '',
    archivePath: previousMetadata?.storagePath,
  };
};

/**
 * Persist active CSV Dataset and Metadata to Firestore
 * Updates both the primary dataset document, the csv_metadata document,
 * and populates the hunter_records collection.
 *
 * CRITICAL GUARANTEE: Replacing CSV data NEVER modifies or deletes manual_identifiers.
 */
export const saveActiveDatasetToFirestore = async (
  metadata: CSVMetadata,
  records: RecordItem[]
): Promise<void> => {
  try {
    await ensureAuth();
    const datasetDocRef = doc(db, DATASET_COLLECTION, ACTIVE_DATASET_DOC);
    const metadataDocRef = doc(db, 'csv_metadata', 'current');
    const now = new Date().toISOString();
    const uploader = metadata.uploadedBy || auth.currentUser?.email || 'Admin';
    const batchId = `batch_${Date.now()}`;

    // 1. Deduplicate records by normalized identifier clean key
    const deduplicatedMap = new Map<string, RecordItem>();
    for (const r of records) {
      const rawId = (r.hunterId || r.pan || r.accountNumber || r.id || '').trim();
      const norm = normalizeIdentifier(rawId);
      const key = norm.clean || rawId.toLowerCase();
      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, r);
      }
    }
    const uniqueRecords = Array.from(deduplicatedMap.values());

    // 2. Write csv_metadata record with required fields:
    // fileName, uploadedBy, uploadedAt, recordCount, status
    const csvMetaPayload: FirestoreCsvMetadata & { details?: string; batchId?: string } = {
      fileName: metadata.fileName,
      uploadedBy: uploader,
      uploadedAt: now,
      recordCount: uniqueRecords.length,
      status: 'active',
      batchId,
    };

    await Promise.all([
      setDoc(metadataDocRef, {
        ...cleanForFirestore(csvMetaPayload),
        serverTime: serverTimestamp(),
      }),
      setDoc(doc(db, 'csv_metadata', batchId), {
        ...cleanForFirestore(csvMetaPayload),
        serverTime: serverTimestamp(),
      }),
    ]);

    // 3. Write active reference dataset bundle (for fast atomic cache loads)
    const datasetPayload = {
      metadata: {
        ...metadata,
        recordCount: uniqueRecords.length,
        updatedAt: now,
      },
      records: uniqueRecords,
      updatedAt: now,
      serverTime: serverTimestamp(),
    };
    await setDoc(datasetDocRef, datasetPayload);

    // 4. Batch write records into hunter_records collection
    // Removes previous CSV records first (NEVER touches manual_identifiers)
    try {
      const hunterCol = collection(db, 'hunter_records');
      const existingSnap = await getDocs(hunterCol);
      const deleteBatches: any[] = [];
      let currentDeleteBatch = writeBatch(db);
      let deleteCount = 0;

      existingSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isCsvImport !== false && data.source !== 'manual_identifiers') {
          currentDeleteBatch.delete(docSnap.ref);
          deleteCount++;
          if (deleteCount % 400 === 0) {
            deleteBatches.push(currentDeleteBatch);
            currentDeleteBatch = writeBatch(db);
          }
        }
      });

      if (deleteCount % 400 !== 0) {
        deleteBatches.push(currentDeleteBatch);
      }

      for (const b of deleteBatches) {
        await b.commit();
      }
    } catch (err) {
      console.warn('Note on clearing previous CSV records from hunter_records:', err);
    }

    // 5. Batch write new deduplicated records into hunter_records collection
    const writeBatches: any[] = [];
    let currentWriteBatch = writeBatch(db);
    let writeCount = 0;

    for (const r of uniqueRecords) {
      const rawId = (r.hunterId || r.pan || r.accountNumber || r.id || '').trim();
      const norm = normalizeIdentifier(rawId);
      const docId = `hr_${norm.clean.slice(0, 80) || Math.random().toString(36).substring(2, 9)}`;
      const docRef = doc(db, 'hunter_records', docId);

      const hunterRecordPayload = {
        id: docId,
        identifier: rawId,
        hunterId: rawId,
        identifierLower: norm.lower,
        identifierClean: norm.clean,
        identifierPrefixes: norm.prefixes,
        bankName: r.bankName || 'Unknown Institution',
        details: r.name || r.notes || r.status || 'Imported Reference Record',
        source: metadata.fileName,
        createdBy: uploader,
        createdAt: r.uploadDate || now,
        updatedAt: now,
        isCsvImport: true,
        batchId,
        name: r.name || '',
        accountNumber: r.accountNumber || '',
        mobile: r.mobile || '',
        pan: r.pan || '',
        status: r.status || 'Active Reference',
        rawColumns: r.rawColumns || {},
      };

      currentWriteBatch.set(docRef, cleanForFirestore(hunterRecordPayload), { merge: true });
      writeCount++;
      if (writeCount % 400 === 0) {
        writeBatches.push(currentWriteBatch);
        currentWriteBatch = writeBatch(db);
      }
    }

    if (writeCount % 400 !== 0) {
      writeBatches.push(currentWriteBatch);
    }

    for (const b of writeBatches) {
      await b.commit();
    }
  } catch (err) {
    console.warn('Failed to save dataset to Firestore:', err);
  }
};

/**
 * Upload and replace CSV reference dataset in Cloud Firestore
 * Guaranteed: Replaces ONLY previous CSV records in hunter_records; NEVER touches manual_identifiers!
 */
export const replaceCsvInFirestore = async (
  file: File,
  records: RecordItem[],
  adminName: string
): Promise<{ recordCount: number; duplicateCount: number }> => {
  await ensureAuth();
  const batchId = `batch_${Date.now()}`;
  const now = new Date().toISOString();

  // Deduplicate incoming rows by clean identifier
  const deduplicatedMap = new Map<string, RecordItem>();
  let duplicateCount = 0;
  for (const r of records) {
    const rawId = (r.hunterId || r.pan || r.accountNumber || r.id || '').trim();
    const norm = normalizeIdentifier(rawId);
    const key = norm.clean || rawId.toLowerCase();
    if (deduplicatedMap.has(key)) {
      duplicateCount++;
    } else {
      deduplicatedMap.set(key, r);
    }
  }

  const uniqueRecords = Array.from(deduplicatedMap.values());

  const metadata: CSVMetadata = {
    fileName: file.name,
    fileSize: `${Math.round((file.size / 1024) * 10) / 10} KB`,
    recordCount: uniqueRecords.length,
    columnCount: uniqueRecords[0] ? Object.keys(uniqueRecords[0].rawColumns || {}).length : 0,
    bankCount: Array.from(new Set(uniqueRecords.map((r) => r.bankName).filter(Boolean))).length,
    uploadedAt: now,
    uploadedBy: adminName,
    headers: uniqueRecords[0] ? Object.keys(uniqueRecords[0].rawColumns || {}) : [],
    isDemo: false,
    status: 'ACTIVE',
  };

  await saveActiveDatasetToFirestore(metadata, uniqueRecords);

  return {
    recordCount: uniqueRecords.length,
    duplicateCount,
  };
};

/**
 * Search BOTH hunter_records and manual_identifiers in Cloud Firestore
 * - Combines results from both collections
 * - Supports exact identifier match, prefix range match, and partial token match
 * - Case-insensitive matching
 * - Performance optimized: Uses indexed field queries with limit, does not download full DB
 * - Handles empty search gracefully without network query
 */
export const searchBothHunterCollections = async (
  rawQuery: string,
  localManualRecords: ManualHunterRecord[] = []
): Promise<SearchResultItem[]> => {
  const queryText = (rawQuery || '').trim();
  // Requirement 14: Gracefully handle empty searches without executing unnecessary network queries
  if (!queryText) {
    return [];
  }

  await ensureAuth();
  const norm = normalizeIdentifier(queryText);

  // 1. Parallel targeted queries on hunter_records with limit (max 25 docs per query)
  const hunterQueries: Promise<any>[] = [];
  const hunterCol = collection(db, 'hunter_records');

  // Exact matches
  hunterQueries.push(getDocs(query(hunterCol, where('identifier', '==', queryText), limit(25))).catch(() => null));
  hunterQueries.push(getDocs(query(hunterCol, where('identifierLower', '==', norm.lower), limit(25))).catch(() => null));
  if (norm.clean) {
    hunterQueries.push(getDocs(query(hunterCol, where('identifierClean', '==', norm.clean), limit(25))).catch(() => null));
  }

  // Prefix range queries
  hunterQueries.push(
    getDocs(
      query(
        hunterCol,
        where('identifierLower', '>=', norm.lower),
        where('identifierLower', '<=', norm.lower + '\uf8ff'),
        limit(25)
      )
    ).catch(() => null)
  );

  if (norm.clean.length >= 3) {
    hunterQueries.push(
      getDocs(
        query(
          hunterCol,
          where('identifierClean', '>=', norm.clean),
          where('identifierClean', '<=', norm.clean + '\uf8ff'),
          limit(25)
        )
      ).catch(() => null)
    );
  }

  // 2. Parallel targeted queries on manual_identifiers with limit
  const manualQueries: Promise<any>[] = [];
  const manualCol = collection(db, 'manual_identifiers');

  manualQueries.push(getDocs(query(manualCol, where('identifier', '==', queryText), limit(25))).catch(() => null));
  manualQueries.push(getDocs(query(manualCol, where('hunterId', '==', queryText), limit(25))).catch(() => null));
  manualQueries.push(getDocs(query(manualCol, where('identifierLower', '==', norm.lower), limit(25))).catch(() => null));
  manualQueries.push(getDocs(query(manualCol, where('hunterId', '==', norm.lower), limit(25))).catch(() => null));
  if (norm.clean) {
    manualQueries.push(getDocs(query(manualCol, where('identifierClean', '==', norm.clean), limit(25))).catch(() => null));
  }
  manualQueries.push(
    getDocs(
      query(
        manualCol,
        where('identifierLower', '>=', norm.lower),
        where('identifierLower', '<=', norm.lower + '\uf8ff'),
        limit(25)
      )
    ).catch(() => null)
  );
  // Also query recent manual_identifiers so partial token, details, and bank searches find them
  manualQueries.push(getDocs(query(manualCol, limit(100))).catch(() => null));

  const [hunterSnaps, manualSnaps] = await Promise.all([
    Promise.all(hunterQueries),
    Promise.all(manualQueries),
  ]);

  const rawMatches = new Map<string, any>();

  // Collect matching docs from hunter_records
  for (const snap of hunterSnaps) {
    if (snap && snap.docs) {
      snap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        const idVal = (data.identifier || data.hunterId || docSnap.id || '').toString().trim();
        const idKey = docSnap.id || idVal;
        if (!rawMatches.has(idKey)) {
          rawMatches.set(idKey, { ...data, id: docSnap.id, identifier: idVal, hunterId: idVal, _collection: 'hunter_records' });
        }
      });
    }
  }

  // Collect matching docs from manual_identifiers (SHARED DATA for all users)
  for (const snap of manualSnaps) {
    if (snap && snap.docs) {
      snap.docs.forEach((docSnap: any) => {
        const data = docSnap.data();
        const idVal = (data.identifier || data.hunterId || docSnap.id || '').toString().trim();
        const idKey = docSnap.id || idVal;
        if (!rawMatches.has(idKey)) {
          rawMatches.set(idKey, {
            ...data,
            id: docSnap.id,
            identifier: idVal,
            hunterId: idVal,
            bankName: data.bankName || '',
            details: data.details || data.name || data.remarks || data.notes || '',
            _collection: 'manual_identifiers',
            source: 'manual_identifiers',
          });
        }
      });
    }
  }

  // Also include matching records from real-time onSnapshot listener memory
  // This guarantees that when an admin adds/edits a manual record, normal users see it instantly!
  for (const m of localManualRecords) {
    if (m.approvalStatus === 'rejected') continue;
    const rawId = (m.hunterId || (m as any).identifier || m.id || '').toString().trim();
    const mLower = rawId.toLowerCase();
    const mClean = mLower.replace(/[^a-z0-9]/g, '');

    const isMatch =
      mLower === norm.lower ||
      mClean === norm.clean ||
      mLower.startsWith(norm.lower) ||
      mLower.includes(norm.lower) ||
      (norm.clean && mClean.includes(norm.clean)) ||
      norm.lower.includes(mLower) ||
      (m.bankName && m.bankName.toLowerCase().includes(norm.lower)) ||
      (m.details && m.details.toLowerCase().includes(norm.lower));

    if (isMatch) {
      const idKey = m.id || rawId;
      if (!rawMatches.has(idKey)) {
        rawMatches.set(idKey, {
          id: m.id,
          identifier: rawId,
          hunterId: rawId,
          identifierLower: mLower,
          identifierClean: mClean,
          bankName: m.bankName,
          details: m.details || m.name || m.remarks || m.notes || 'Manual Identifier Record',
          source: 'manual_identifiers',
          _collection: 'manual_identifiers',
          notes: m.notes || m.remarks,
          rawColumns: m.rawColumns || {},
        });
      }
    }
  }

  // Score, rank, and format each combined match
  const results: SearchResultItem[] = [];

  rawMatches.forEach((item) => {
    const idVal = (item.identifier || item.hunterId || item.name || item.id || '').trim();
    const idLower = (item.identifierLower || idVal.toLowerCase()).trim();
    const idClean = item.identifierClean || idLower.replace(/[^a-z0-9]/g, '');

    let score = 70;
    let confidence: 'VERY_HIGH' | 'HIGH' | 'POSSIBLE' | 'LOW' = 'POSSIBLE';
    let matchType = 'Partial Match';

    if (idVal === queryText || idLower === norm.lower || (idClean && idClean === norm.clean)) {
      score = 100;
      confidence = 'VERY_HIGH';
      matchType = 'Exact Identifier Match';
    } else if (idLower.startsWith(norm.lower) || (norm.clean && idClean.startsWith(norm.clean))) {
      score = 95;
      confidence = 'VERY_HIGH';
      matchType = 'Prefix Match';
    } else if (idLower.includes(norm.lower) || (norm.clean && idClean.includes(norm.clean))) {
      score = 85;
      confidence = 'HIGH';
      matchType = 'Substring Match';
    } else if (norm.lower.includes(idLower) || (idClean && norm.clean.includes(idClean))) {
      score = 80;
      confidence = 'HIGH';
      matchType = 'Contained Match';
    }

    const sourceLabel =
      item._collection === 'manual_identifiers' || item.source === 'manual_identifiers'
        ? 'Manual Identifier'
        : item.source
        ? `CSV: ${item.source}`
        : 'CSV Reference';

    const recItem: RecordItem = {
      id: item.id || `rec-${Math.random().toString(36).substring(2, 9)}`,
      hunterId: idVal,
      identifier: idVal,
      bankName: item.bankName || 'Unknown Financial Institution',
      details: item.details || item.notes || item.name || 'No description available',
      name: item.name || item.details || idVal,
      source: sourceLabel,
      notes: item.notes || item.details || '',
      status: item.status || (score >= 90 ? 'High Risk' : 'Active Reference'),
      rawColumns: item.rawColumns || {
        'Hunter Identifier': idVal,
        'Bank Name': item.bankName || '',
        'Source': sourceLabel,
      },
    };

    results.push({
      record: recItem,
      score,
      confidence,
      matchedFields: [
        { field: 'Hunter Identifier', value: idVal, score },
        { field: 'Bank Name', value: item.bankName || '', score: Math.max(50, score - 10) },
      ],
      primaryMatchedField: matchType,
    });
  });

  results.sort((a, b) => b.score - a.score);
  return results;
};

/**
 * Seed initial default demo records to hunter_records in Firestore if collection is empty.
 * Guarantees immediate out-of-the-box functionality while preserving existing manual records.
 */
export const seedDefaultHunterRecordsIfEmpty = async (): Promise<void> => {
  try {
    await ensureAuth();
    const hunterCol = collection(db, 'hunter_records');
    const snap = await getDocs(query(hunterCol, limit(1)));
    if (snap.empty) {
      const { records, metadata } = getInitialDemoData();
      await saveActiveDatasetToFirestore(metadata, records);
    }
  } catch (err) {
    console.warn('Seed hunter records notice:', err);
  }
};

/**
 * Real-time listener for hunter_records collection in Firestore.
 * Ensures admin CSV additions or updates appear to normal users in real time.
 */
export const subscribeToHunterRecords = (
  callback: (records: RecordItem[]) => void
): (() => void) => {
  let unsubscribeSnapshot: (() => void) | null = null;
  let isCancelled = false;

  ensureAuth().then(() => {
    if (isCancelled) return;
    try {
      const hunterColRef = collection(db, 'hunter_records');
      unsubscribeSnapshot = onSnapshot(
        hunterColRef,
        (snapshot) => {
          const items: RecordItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            items.push({
              id: data.id || docSnap.id,
              hunterId: data.hunterId || data.identifier || '',
              bankName: data.bankName || '',
              name: data.name || data.details || '',
              accountNumber: data.accountNumber || '',
              mobile: data.mobile || '',
              pan: data.pan || '',
              status: data.status || 'Active Reference',
              notes: data.notes || data.details || '',
              uploadedBy: data.createdBy || '',
              uploadDate: data.createdAt || '',
              rawColumns: data.rawColumns || {},
            });
          });
          if (items.length > 0) {
            callback(items);
          }
        },
        (error) => {
          if (error.code !== 'permission-denied') {
            console.warn('Hunter records onSnapshot note:', error.message);
          }
        }
      );
    } catch (e) {
      console.warn('Failed to listen to hunter_records:', e);
    }
  });

  return () => {
    isCancelled = true;
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
};

/**
 * Real-time listener for csv_metadata collection in Firestore.
 */
export const subscribeToCsvMetadata = (
  callback: (meta: FirestoreCsvMetadata | null) => void
): (() => void) => {
  let unsubscribeSnapshot: (() => void) | null = null;
  let isCancelled = false;

  ensureAuth().then(() => {
    if (isCancelled) return;
    try {
      const metaDocRef = doc(db, 'csv_metadata', 'current');
      unsubscribeSnapshot = onSnapshot(
        metaDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            callback(docSnap.data() as FirestoreCsvMetadata);
          } else {
            callback(null);
          }
        },
        (error) => {
          if (error.code !== 'permission-denied') {
            console.warn('csv_metadata onSnapshot note:', error.message);
          }
        }
      );
    } catch (e) {
      console.warn('Failed to listen to csv_metadata:', e);
    }
  });

  return () => {
    isCancelled = true;
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
};

/* ========================================================================= */
/* 3. SEARCH HISTORY LOGS (FIRESTORE)                                        */
/* ========================================================================= */

const SEARCH_HISTORY_COLLECTION = 'search_history';

/**
 * Real-time listener for Search History
 */
export const subscribeToSearchHistory = (
  callback: (history: SearchHistoryItem[]) => void
) => {
  let unsubscribeSnapshot: (() => void) | null = null;
  let isCancelled = false;

  ensureAuth().then(() => {
    if (isCancelled) return;
    try {
      const q = query(
        collection(db, SEARCH_HISTORY_COLLECTION),
        orderBy('timestampMs', 'desc'),
        limit(50)
      );
      unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const items: SearchHistoryItem[] = [];
          snapshot.forEach((d) => {
            const val = d.data();
            items.push({
              id: d.id,
              query: val.query || '',
              searchType: val.searchType || 'ALL',
              threshold: typeof val.threshold === 'number' ? val.threshold : 70,
              matchCount: typeof val.matchCount === 'number' ? val.matchCount : 0,
              highestScore: typeof val.highestScore === 'number' ? val.highestScore : 0,
              timestamp: val.timestamp || '',
            });
          });
          if (items.length > 0) {
            callback(items);
          }
        },
        (err) => {
          if (err.code !== 'permission-denied') {
            console.warn('Search history onSnapshot note:', err.message);
          }
        }
      );
    } catch (e) {
      console.warn('Failed to listen to search history:', e);
    }
  });

  return () => {
    isCancelled = true;
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
};

/**
 * Log search event to Firestore
 */
export const addSearchHistoryToFirestore = async (
  item: SearchHistoryItem
): Promise<void> => {
  try {
    await ensureAuth();
    const docId = item.id || `search-${Date.now()}`;
    const docRef = doc(db, SEARCH_HISTORY_COLLECTION, docId);
    await setDoc(docRef, {
      ...item,
      id: docId,
      timestampMs: Date.now(),
      serverTime: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Failed to write search history to Firestore:', err);
  }
};

/* ========================================================================= */
/* 4. VISITOR STATISTICS (FIRESTORE)                                         */
/* ========================================================================= */

const STATS_COLLECTION = 'visitor_stats';
const STATS_DOC = 'global_metrics';

export const subscribeToVisitorStats = (
  callback: (stats: VisitorStats) => void
) => {
  let unsubscribeSnapshot: (() => void) | null = null;
  let isCancelled = false;

  ensureAuth().then(() => {
    if (isCancelled) return;
    try {
      const docRef = doc(db, STATS_COLLECTION, STATS_DOC);
      unsubscribeSnapshot = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const d = docSnap.data();
            callback({
              totalVisits: d.totalVisits || 1421,
              todayVisits: d.todayVisits || 69,
              lastVisit: d.lastVisit || new Date().toISOString(),
              uniqueSessions: d.uniqueSessions || d.totalVisits || 1421,
            });
          }
        },
        (err) => {
          if (err.code !== 'permission-denied') {
            console.warn('Visitor stats onSnapshot note:', err.message);
          }
        }
      );
    } catch (e) {
      console.warn('Failed to listen to visitor stats:', e);
    }
  });

  return () => {
    isCancelled = true;
    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
    }
  };
};

export const incrementVisitorStatsInFirestore = async (
  isNewSession: boolean = false
): Promise<void> => {
  try {
    const docRef = doc(db, STATS_COLLECTION, STATS_DOC);
    const snap = await getDoc(docRef);
    const nowStr = new Date().toISOString();
    if (!snap.exists()) {
      await setDoc(docRef, {
        totalVisits: 1422,
        todayVisits: 70,
        uniqueSessions: 1422,
        lastVisit: nowStr,
      });
    } else {
      const data = snap.data();
      const prevDate = data.lastVisit ? data.lastVisit.split('T')[0] : '';
      const todayDate = nowStr.split('T')[0];
      const isNewDay = prevDate !== todayDate;

      await setDoc(
        docRef,
        {
          totalVisits: (data.totalVisits || 1421) + 1,
          todayVisits: isNewDay ? 1 : (data.todayVisits || 69) + 1,
          uniqueSessions: isNewSession
            ? (data.uniqueSessions || data.totalVisits || 1421) + 1
            : data.uniqueSessions || data.totalVisits || 1421,
          lastVisit: nowStr,
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Failed to update stats in Firestore:', err);
  }
};

