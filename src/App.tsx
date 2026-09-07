/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActiveNavPage,
  AdminSession,
  CSVMetadata,
  RecordItem,
  SearchFilters,
  SearchResultItem,
  SearchHistoryItem,
  VisitorStats,
  ManualHunterRecord,
  LiveSyncStatus,
} from './types';
import { getInitialDemoData } from './data/sampleDatabase';
import { parseCSVText, exportToCSV } from './utils/csvParser';
import { searchDatabase } from './utils/similarity';
import { getOrCreateVisitorId } from './utils/visitorId';
import { Header } from './components/Header';
import { SearchPanel } from './components/SearchPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { RecordDetailModal } from './components/RecordDetailModal';
import { AboutAdminPage } from './components/AboutAdminPage';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { AddManualRecordModal, ManualRecordInput } from './components/AddManualRecordModal';
import { UserSubmitIdentifierModal } from './components/UserSubmitIdentifierModal';
import { ReplaceConfirmModal } from './components/ReplaceConfirmModal';
import { ClearConfirmModal } from './components/ClearConfirmModal';
import { ToastNotification, ToastMessage } from './components/ToastNotification';
import { GoogleAuthGate } from './components/GoogleAuthGate';
import { FirebaseTestModal } from './components/FirebaseTestModal';
import { BRAND } from './assets/branding';
import {
  auth,
  logOut,
  initAuth,
  subscribeToManualHunterRecords,
  addManualHunterRecordToFirestore,
  updateManualHunterRecordInFirestore,
  deleteManualHunterRecordFromFirestore,
  approveUserHunterSubmissionInFirestore,
  rejectUserHunterSubmissionInFirestore,
  subscribeToActiveDataset,
  saveActiveDatasetToFirestore,
  uploadCSVToFirebaseStorage,
  subscribeToSearchHistory,
  addSearchHistoryToFirestore,
  subscribeToVisitorStats,
  incrementVisitorStatsInFirestore,
  subscribeToLiveSyncStatus,
  syncAdminUserRoleInFirestore,
  syncUserProfileInFirestore,
  searchBothHunterCollections,
  seedDefaultHunterRecordsIfEmpty,
  subscribeToLiveIdentifiers,
  subscribeToSubmissions,
  approveSubmissionInFirestore,
  rejectSubmissionInFirestore,
  adminDirectAddLiveIdentifier,
  adminDirectUpdateLiveIdentifier,
  adminDirectDeleteLiveIdentifier,
  downloadLiveIdentifiersAsCSV,
  seedLiveIdentifiersIfEmpty,
  LiveIdentifierRecord,
  SubmissionRecord,
} from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [activePage, setActivePage] = useState<ActiveNavPage>('search');
  const [liveSyncStatus, setLiveSyncStatus] = useState<LiveSyncStatus>('connected');
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isFirebaseTestOpen, setIsFirebaseTestOpen] = useState<boolean>(false);

  // Admin Session State with SessionStorage persistence
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => {
    try {
      const saved = sessionStorage.getItem('hunter_admin_session');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Listen to Google Authentication state exclusively
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setGoogleUser(user);
        const { isAdmin } = await syncUserProfileInFirestore(user);
        if (isAdmin || user.email === 'gmanikandan639@gmail.com') {
          setAdminSession({
            isAuthenticated: true,
            username: user.email || 'Admin',
            name: user.displayName || 'Manikandan',
            role: 'Administrator',
            system: 'Hunter Risk Management',
            loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            token: user.uid,
          });
        }
      } else {
        setGoogleUser(null);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // Initial Preloaded Demo Data (CSV Dataset)
  const initial = useMemo(() => getInitialDemoData(), []);
  const [records, setRecords] = useState<RecordItem[]>(initial.records);
  const [csvMetadata, setCsvMetadata] = useState<CSVMetadata>(initial.metadata);
  const [uniqueBanks, setUniqueBanks] = useState<string[]>(initial.uniqueBanks || []);

  // Central Database: Manual Hunter Records (Real-time Sync & Persistent)
  const [manualRecords, setManualRecords] = useState<ManualHunterRecord[]>([]);
  const [isAddManualRecordModalOpen, setIsAddManualRecordModalOpen] = useState<boolean>(false);

  // Master Database: Cloud Firestore live_identifiers and submissions
  const [liveIdentifiers, setLiveIdentifiers] = useState<LiveIdentifierRecord[]>([]);
  const [submissionsList, setSubmissionsList] = useState<SubmissionRecord[]>([]);

  // User Frontend Submission Modal State
  const [isUserSubmitModalOpen, setIsUserSubmitModalOpen] = useState<boolean>(false);
  const [userSubmitInitialRecord, setUserSubmitInitialRecord] = useState<RecordItem | null>(null);
  const [userSubmitMode, setUserSubmitMode] = useState<'new' | 'update'>('new');

  // Pending Approvals Count Memo
  const pendingApprovalsCount = useMemo(() => {
    const manualPending = manualRecords.filter((r) => r.approvalStatus === 'pending').length;
    const subPending = submissionsList.filter((s) => s.status === 'pending').length;
    return Math.max(manualPending, subPending);
  }, [manualRecords, submissionsList]);

  // Firebase Storage Upload States
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Combined Active Search Set: Cloud Firestore LIVE Identifiers + Manual Records + Dataset Records
  const combinedRecords = useMemo(() => {
    const seenIds = new Set<string>();
    const result: RecordItem[] = [];

    // 1. Primary Master: Cloud Firestore Live Identifiers
    liveIdentifiers.forEach((l) => {
      const idVal = (l.identifier || l.hunterId || l.id || '').toString().trim();
      const key = idVal.toUpperCase();
      if (!seenIds.has(key)) {
        seenIds.add(key);
        result.push({
          id: l.id,
          hunterId: idVal,
          identifier: idVal,
          name: l.details || l.name || idVal,
          bankName: l.bankName || 'Financial Institution',
          details: l.details || 'Approved Master Live Identifier',
          accountNumber: '',
          mobile: '',
          pan: '',
          status: l.status || 'Active Reference',
          notes: l.source ? `Source: ${l.source}` : 'Cloud Firestore Live Master',
          uploadedBy: l.approvedBy || l.createdBy || 'Administrator',
          uploadDate: l.approvedAt || l.createdAt || '',
          lastUpdated: l.updatedAt || l.approvedAt || l.createdAt || '',
          rawColumns: {
            'Hunter Identification Number': idVal,
            'Bank/NBFC Name': l.bankName,
            'Status': l.status || 'Approved',
            'Details': l.details || '',
            'Source': l.source || 'Cloud Firestore',
            ...(l.rawColumns || {}),
          },
        });
      }
    });

    // 2. Secondary: Active Manual Records
    const activeManual = manualRecords.filter((m) => m.approvalStatus !== 'rejected');
    activeManual.forEach((m) => {
      const idVal = (m.hunterId || (m as any).identifier || m.id || '').toString().trim();
      const key = idVal.toUpperCase();
      if (!seenIds.has(key)) {
        seenIds.add(key);
        result.push({
          id: m.id,
          hunterId: idVal,
          identifier: idVal,
          name: m.name || m.details || idVal,
          bankName: m.bankName || 'Unknown Financial Institution',
          details: m.details || m.remarks || m.notes || 'Manual Identifier Record',
          accountNumber: m.accountNumber || '',
          mobile: m.mobile || '',
          pan: m.pan || '',
          status: m.status || 'Active Reference',
          notes: m.remarks || m.notes || m.details || 'Registered Hunter Record',
          uploadedBy: m.submittedBy?.name || m.createdBy || 'Administrator',
          uploadDate: m.submittedAt || m.createdAt || '',
          lastUpdated: m.updatedAt || m.createdAt || '',
          rawColumns: {
            'Hunter Identification Number': idVal,
            'Bank/NBFC Name': m.bankName,
            'Status': m.status || '',
            'Remarks': m.remarks || m.notes || m.details || '',
            ...(m.rawColumns || {}),
          },
        });
      }
    });

    // 3. Fallback: CSV Dataset Records
    records.forEach((r) => {
      const idVal = (r.hunterId || r.id || '').toString().trim();
      const key = idVal.toUpperCase();
      if (!seenIds.has(key)) {
        seenIds.add(key);
        result.push(r);
      }
    });

    return result;
  }, [liveIdentifiers, manualRecords, records]);

  // Combined Unique Banks
  const combinedUniqueBanks = useMemo(() => {
    const bankSet = new Set<string>();
    combinedRecords.forEach((r) => {
      if (r.bankName && r.bankName.trim()) {
        bankSet.add(r.bankName.trim());
      }
    });
    return Array.from(bankSet).sort();
  }, [combinedRecords]);

  // Effective Database Metadata (CSV metadata + manual records count)
  const effectiveMetadata = useMemo<CSVMetadata>(() => {
    const totalCount = combinedRecords.length;
    if (totalCount === 0) {
      return {
        fileName: 'No Reference File Uploaded',
        fileSize: '0 KB',
        uploadDate: '—',
        uploadedBy: '—',
        recordCount: 0,
        columnCount: 0,
        bankCount: 0,
        headers: [],
        status: 'EMPTY',
        isDemo: false,
      };
    }
    return {
      ...csvMetadata,
      recordCount: totalCount,
      bankCount: combinedUniqueBanks.length,
      status: 'ACTIVE',
      fileName:
        csvMetadata.status === 'EMPTY' || csvMetadata.fileName === 'No Reference File Uploaded'
          ? 'Central Reference Database'
          : csvMetadata.fileName,
    };
  }, [csvMetadata, combinedRecords.length, combinedUniqueBanks.length]);

  // Real-Time Firebase Firestore Synchronization (Live Master Identifiers, Submissions, Manual Records, Dataset, Visitor Stats)
  useEffect(() => {
    // 1. Ensure Firebase Auth initialization
    initAuth().catch((err) => console.warn('Firebase auth initialization note:', err));

    // 2. Subscribe to Global Live Sync Status
    const unsubscribeSync = subscribeToLiveSyncStatus((status) => {
      setLiveSyncStatus(status);
    });

    // 3. Real-Time Master Listener: Cloud Firestore live_identifiers
    // Fires instantly for both unauthenticated search users and authenticated admins
    const unsubscribeLive = subscribeToLiveIdentifiers(
      (liveDocs) => {
        setLiveIdentifiers(liveDocs);
      },
      (status) => {
        setLiveSyncStatus(status);
      }
    );

    // 4. Real-Time Submissions Listener: Public contributions queue for Admin approval
    const unsubscribeSubmissions = subscribeToSubmissions((subs) => {
      setSubmissionsList(subs);
    });

    // 5. Real-Time Listener: Manual Hunter Identifiers (Sync & Fallback)
    const unsubscribeManual = subscribeToManualHunterRecords(
      (remoteRecords) => {
        setManualRecords(remoteRecords);
      },
      (status) => {
        setLiveSyncStatus(status);
      }
    );

    // 6. Real-Time Listener: Central Active Reference Dataset
    const unsubscribeDataset = subscribeToActiveDataset((data) => {
      if (data && Array.isArray(data.records) && data.metadata) {
        setRecords(data.records);
        setCsvMetadata(data.metadata);
        const banks = Array.from(
          new Set(data.records.map((r) => r.bankName).filter(Boolean) as string[])
        ).sort();
        setUniqueBanks(banks);
      }
    });

    // 7. Real-Time Listener: Search History Audit Logs
    const unsubscribeHistory = subscribeToSearchHistory((remoteHistory) => {
      if (remoteHistory && remoteHistory.length > 0) {
        setSearchHistory(remoteHistory);
      }
    });

    // 8. Real-Time Listener: Visitor Metrics
    const unsubscribeStats = subscribeToVisitorStats((remoteStats) => {
      if (remoteStats) {
        setVisitorStats(remoteStats);
      }
    });

    // Increment visitor count in Firestore
    const { isNew } = getOrCreateVisitorId();
    incrementVisitorStatsInFirestore(isNew).catch(() => {});

    // Seed master live identifiers if database is newly initialized
    seedLiveIdentifiersIfEmpty().catch(() => {});
    seedDefaultHunterRecordsIfEmpty().catch(() => {});

    return () => {
      unsubscribeSync();
      unsubscribeLive();
      unsubscribeSubmissions();
      unsubscribeManual();
      unsubscribeDataset();
      unsubscribeHistory();
      unsubscribeStats();
    };
  }, []);


  // Search History Log
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => [
    {
      id: 'hist-init-1',
      query: '2024061800212',
      searchType: 'ALL',
      threshold: 70,
      timestamp: 'Initial System Verification',
      matchCount: 1,
      highestScore: 100,
    },
  ]);

  // Search State
  const [defaultThreshold, setDefaultThreshold] = useState<number>(70);
  const [searchQuery, setSearchQuery] = useState<string>('2024061800212');
  const [hasSearched, setHasSearched] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [filters, setFilters] = useState<SearchFilters>({
    searchType: 'ALL',
    threshold: 70,
  });

  // Results State
  const [results, setResults] = useState<SearchResultItem[]>([]);

  // Modals & Notifications State
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    parsed: ReturnType<typeof parseCSVText>;
  } | null>(null);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState<boolean>(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Selected Record for Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<{
    record: RecordItem;
    score: number;
    matchedFields: { field: string; value: string; score: number }[];
  } | null>(null);

  // Visitor Count Details State (Unique visitor metrics across sessions)
  const [visitorStats, setVisitorStats] = useState<VisitorStats>(() => {
    try {
      const saved = localStorage.getItem('hunter_visitor_stats');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return {
      totalVisits: 1421,
      todayVisits: 69,
      lastVisit: new Date().toISOString(),
      uniqueSessions: 1421,
    };
  });

  // Track & Register Unique Visitor once per user
  useEffect(() => {
    let isMounted = true;

    const recordVisitorEntry = async () => {
      const { visitorId, isNew } = getOrCreateVisitorId();

      try {
        const res = await fetch('/api/visitors/increment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId }),
        });

        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.totalVisits) {
            const stats: VisitorStats = {
              totalVisits: data.totalVisits,
              todayVisits: data.todayVisits,
              lastVisit: data.lastVisit || new Date().toISOString(),
              uniqueSessions: data.uniqueVisitors || data.totalVisits,
            };
            setVisitorStats(stats);
            try {
              localStorage.setItem('hunter_visitor_stats', JSON.stringify(stats));
            } catch {
              // ignore
            }
            return;
          }
        }
      } catch {
        // Offline or backend unavailable - fallback handled below
      }

      // Offline / Local fallback: Only increment if this is genuinely a fresh, new visitor
      if (isNew) {
        setVisitorStats((prev) => {
          const todayStr = new Date().toISOString().split('T')[0];
          const prevDate = prev.lastVisit ? prev.lastVisit.split('T')[0] : '';
          const isNewDay = todayStr !== prevDate;
          const updated: VisitorStats = {
            totalVisits: (prev.totalVisits || 1420) + 1,
            todayVisits: isNewDay ? 1 : (prev.todayVisits || 68) + 1,
            lastVisit: new Date().toISOString(),
            uniqueSessions: (prev.totalVisits || 1420) + 1,
          };
          try {
            localStorage.setItem('hunter_visitor_stats', JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      }
    };

    recordVisitorEntry();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sync admin session to sessionStorage
  useEffect(() => {
    try {
      if (adminSession) {
        sessionStorage.setItem('hunter_admin_session', JSON.stringify(adminSession));
      } else {
        sessionStorage.removeItem('hunter_admin_session');
      }
    } catch {
      // ignore
    }
  }, [adminSession]);

  // Show auto-dismissing toast
  const triggerToast = (message: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}`;
    setToast({ ...message, id });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 5000);
  };

  // Safe Navigation with Auth Guard for Admin Dashboard
  const handleNavigatePage = (page: ActiveNavPage) => {
    if (page === 'admin') {
      if (!adminSession?.isAuthenticated) {
        setActivePage('login');
        return;
      }
    }
    setActivePage(page);
  };

  // Handle Admin Login Success
  const handleLoginSuccess = (session: AdminSession) => {
    setAdminSession(session);
    syncAdminUserRoleInFirestore(true).catch(() => {});
    setActivePage('admin');
    triggerToast({
      type: 'success',
      title: 'Administrator Logged In',
      message: `Welcome, ${session.name}. Hunter Admin Dashboard active.`,
      subtext: `Session: ${session.username} • ${session.system}`,
    });
  };

  // Handle User & Admin Logout (Google Sign-Out)
  const handleLogout = async () => {
    try {
      await logOut();
    } catch (e) {
      console.warn('Logout note:', e);
    }
    setGoogleUser(null);
    setAdminSession(null);
    setActivePage('search');
    triggerToast({
      type: 'info',
      title: 'Signed Out',
      message: 'Exited Admin session. Public Hunter Search is active.',
    });
  };

  // Execute search across BOTH hunter_records and manual_identifiers in Cloud Firestore
  const performSearch = useCallback(
    async (
      queryText: string,
      currentFilters: SearchFilters,
      currentRecords: RecordItem[] = combinedRecords
    ) => {
      const q = queryText.trim();
      if (!q) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      const logHistory = (searchRes: SearchResultItem[]) => {
        const highest = searchRes.length > 0 ? Math.max(...searchRes.map((r) => r.score)) : 0;
        const historyItem: SearchHistoryItem = {
          id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          query: q,
          searchType: currentFilters.searchType,
          threshold: currentFilters.threshold,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          matchCount: searchRes.length,
          highestScore: highest,
        };

        setSearchHistory((prev) => [historyItem, ...prev.slice(0, 49)]);
        addSearchHistoryToFirestore(historyItem).catch(() => {});
      };

      try {
        // Query BOTH hunter_records and manual_identifiers collections in Cloud Firestore
        const firestoreResults = await searchBothHunterCollections(q, manualRecords);

        if (firestoreResults && firestoreResults.length > 0) {
          setResults(firestoreResults);
          logHistory(firestoreResults);
          setIsSearching(false);
          return;
        }

        // Fallback to client-side database search across combined records
        const searchRes = searchDatabase(currentRecords, q, currentFilters);
        setResults(searchRes);
        logHistory(searchRes);
      } catch (err) {
        console.warn('Firestore Hunter search fallback notice:', err);
        const searchRes = searchDatabase(currentRecords, q, currentFilters);
        setResults(searchRes);
        logHistory(searchRes);
      } finally {
        setIsSearching(false);
      }
    },
    [combinedRecords, manualRecords]
  );

  // Run initial search on mount
  useEffect(() => {
    performSearch(searchQuery, filters, combinedRecords);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh active search results whenever real-time Firestore manual records or CSV datasets update
  // Ensures normal users see Admin additions or updates without needing to refresh the page
  useEffect(() => {
    if (searchQuery.trim() && hasSearched) {
      performSearch(searchQuery, filters, combinedRecords);
    }
  }, [manualRecords, combinedRecords.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Execute CSV upload to Firebase Cloud Storage and synchronization
  const executeUploadToStorage = async (file: File, parsed: ReturnType<typeof parseCSVText>) => {
    // 1. Authenticated Admin check
    if (!adminSession?.isAuthenticated) {
      triggerToast({
        type: 'error',
        title: 'Upload Unauthorized',
        message: 'Only authenticated Administrator users can upload CSV reference files.',
      });
      return;
    }

    // 2. Validate CSV file format
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      triggerToast({
        type: 'error',
        title: 'Unsupported File Format',
        message: 'Only .csv format files are accepted for Hunter Reference Datasets.',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formattedDate =
        new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }) +
        `, ` +
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 3. Upload to Firebase Cloud Storage (stores in csv/current/, archives previous active CSV to csv/archive/)
      const storageResult = await uploadCSVToFirebaseStorage(
        file,
        csvMetadata,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      const newMetadata: CSVMetadata = {
        fileName: file.name,
        fileSize: `${Math.round((file.size / 1024) * 10) / 10} KB`,
        recordCount: parsed.rowCount,
        columnCount: parsed.columnCount,
        bankCount: parsed.uniqueBanks.length,
        uploadedAt: formattedDate,
        uploadedBy: adminSession.name || adminSession.username || 'Administrator',
        headers: parsed.headers,
        detectedNameCol: parsed.detectedNameCol,
        detectedBankCol: parsed.detectedBankCol,
        isDemo: false,
        status: 'ACTIVE',
        storagePath: storageResult.storagePath,
        downloadUrl: storageResult.downloadUrl,
        archivePath: storageResult.archivePath,
      };

      // 4. Update memory state (STRICT SINGLE ACTIVE CSV: Set ONLY new records)
      // Note: Manual Hunter Identifiers in manual_records remain preserved in Firestore
      setRecords(parsed.records);
      setCsvMetadata(newMetadata);
      setUniqueBanks(parsed.uniqueBanks);
      setSearchQuery('');
      setResults([]);
      setHasSearched(false);
      setFilters({
        searchType: 'ALL',
        threshold: defaultThreshold,
        bankFilter: undefined,
      });
      setSelectedRecord(null);

      // 5. Persist dataset and metadata directly to Cloud Firestore for real-time synchronization
      await saveActiveDatasetToFirestore(newMetadata, parsed.records);

      triggerToast({
        type: 'success',
        title: '✓ CSV Uploaded to Firebase Cloud Storage',
        message: `Successfully uploaded "${file.name}" to Storage (csv/current/) with ${parsed.rowCount.toLocaleString()} records.`,
        subtext: `${parsed.uniqueBanks.length} Banks Detected • Manual Hunter Identifiers Preserved • Real-time Sync Active`,
      });
    } catch (err: any) {
      console.error('Firebase Storage CSV upload error:', err);
      triggerToast({
        type: 'error',
        title: 'Storage Upload Failed',
        message: err.message || 'Could not upload CSV to Firebase Storage. Please verify permissions.',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  // Step 1: Admin selects or drops a new CSV file -> Parse and apply (or confirm replacement)
  const handleInitiateUpload = (file: File) => {
    // Verify Admin authentication before processing
    if (!adminSession?.isAuthenticated) {
      triggerToast({
        type: 'error',
        title: 'Upload Access Denied',
        message: 'Only authenticated Administrator users can upload reference files.',
      });
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      triggerToast({
        type: 'error',
        title: 'Invalid File Extension',
        message: 'Only .csv files are supported. Please select a valid CSV spreadsheet.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSVText(text);

        if (parsed.rowCount === 0) {
          triggerToast({
            type: 'error',
            title: 'Empty CSV File',
            message: 'No valid data rows found in the selected CSV file.',
          });
          return;
        }

        // If no file currently loaded, upload and load directly without confirmation
        if (records.length === 0) {
          await executeUploadToStorage(file, parsed);
          return;
        }

        // If active dataset exists, prompt confirmation to replace previous CSV in storage/firestore
        setPendingUpload({
          file,
          parsed,
        });
        setIsReplaceModalOpen(true);
      } catch (err: any) {
        triggerToast({
          type: 'error',
          title: 'CSV Parsing Error',
          message: err.message || 'Please upload a valid CSV reference file.',
        });
      }
    };
    reader.readAsText(file);
  };

  // Step 2: User confirms replacement -> execute storage upload & strictly REPLACE previous dataset
  const handleConfirmReplacement = async () => {
    if (!pendingUpload) return;
    const { file, parsed } = pendingUpload;

    // Close Modal immediately
    setIsReplaceModalOpen(false);
    setPendingUpload(null);

    // Execute Cloud Storage Upload, archiving previous CSV, and updating Firestore
    await executeUploadToStorage(file, parsed);
  };

  const handleCancelReplacement = () => {
    setIsReplaceModalOpen(false);
    setPendingUpload(null);
  };

  // Step 3: Handle Clear Database flow
  const handleInitiateClearDatabase = () => {
    setIsClearModalOpen(true);
  };

  const handleConfirmClearDatabase = () => {
    const emptyMeta: CSVMetadata = {
      fileName: 'No Reference File Uploaded',
      fileSize: '0 KB',
      recordCount: 0,
      columnCount: 0,
      bankCount: 0,
      uploadedAt: '—',
      headers: [],
      isDemo: false,
      status: 'EMPTY',
    };

    // Completely clear reference database
    setRecords([]);
    setCsvMetadata(emptyMeta);
    setUniqueBanks([]);
    saveActiveDatasetToFirestore(emptyMeta, []);

    setSearchQuery('');
    setResults([]);
    setHasSearched(false);
    setFilters({
      searchType: 'ALL',
      threshold: defaultThreshold,
      bankFilter: undefined,
    });
    setSelectedRecord(null);
    setIsClearModalOpen(false);

    triggerToast({
      type: 'info',
      title: 'Existing CSV Data Deleted',
      message:
        'All records, search results, and bank data have been removed. Please upload a new CSV file to start Hunter Search.',
    });
  };

  // Step 4: Reset to default preloaded demo dataset
  const handleResetToDemo = () => {
    const demo = getInitialDemoData();
    setRecords(demo.records);
    setCsvMetadata(demo.metadata);
    setUniqueBanks(demo.uniqueBanks);
    saveActiveDatasetToFirestore(demo.metadata, demo.records);

    const demoCombined: RecordItem[] = [
      ...manualRecords.map((m) => ({
        id: m.id,
        hunterId: m.hunterId,
        name: m.name || m.hunterId,
        bankName: m.bankName,
        accountNumber: m.accountNumber || '',
        mobile: m.mobile || '',
        pan: m.pan || '',
        status: m.status || 'Active Reference',
        notes: m.remarks || m.notes || 'Manually registered by Admin',
        uploadedBy: m.createdBy || 'Administrator',
        uploadDate: m.createdAt || '',
        lastUpdated: m.updatedAt || m.createdAt || '',
        rawColumns: {
          'Hunter Identification Number': m.hunterId,
          'Bank/NBFC Name': m.bankName,
          'Status': m.status || '',
          'Remarks': m.remarks || m.notes || '',
          ...(m.rawColumns || {}),
        },
      })),
      ...demo.records,
    ];

    setSearchQuery('2024061800212');
    setFilters({
      searchType: 'ALL',
      threshold: defaultThreshold,
    });
    performSearch('2024061800212', { searchType: 'ALL', threshold: defaultThreshold }, demoCombined);

    triggerToast({
      type: 'info',
      title: 'Demo Reference Database Loaded',
      message: 'Sample banking reference dataset loaded with preconfigured test records.',
      subtext: `Active: sample_hunter_reference.csv • ${demo.records.length} records`,
    });
  };

  // Step 5: Column remapping handler
  const handleRemapColumns = (nameCol: string, bankCol: string) => {
    const banks = Array.from(
      new Set(
        records
          .map((r) => (r.rawColumns ? r.rawColumns[bankCol] : r.bankName))
          .filter(Boolean) as string[]
      )
    ).sort();

    const updatedRecords: RecordItem[] = records.map((r) => ({
      ...r,
      name: (r.rawColumns ? r.rawColumns[nameCol] : r.name) || r.name,
      bankName: (r.rawColumns ? r.rawColumns[bankCol] : r.bankName) || r.bankName,
    }));

    const updatedMeta: CSVMetadata = {
      ...csvMetadata,
      detectedNameCol: nameCol,
      detectedBankCol: bankCol,
      bankCount: banks.length,
    };

    setRecords(updatedRecords);
    setUniqueBanks(banks);
    setCsvMetadata(updatedMeta);
    saveActiveDatasetToFirestore(updatedMeta, updatedRecords);

    if (searchQuery.trim()) {
      performSearch(searchQuery, filters, updatedRecords);
    }

    triggerToast({
      type: 'success',
      title: 'Column Mapping Applied',
      message: `Name mapped to "${nameCol}" • Bank mapped to "${bankCol}".`,
    });
  };

  // Step 6: Handle Manual Hunter Record Entry (Admin Only - Cloud Firestore Real-Time Database)
  const handleAddManualRecord = async (input: ManualRecordInput) => {
    const formattedDate = new Date().toISOString();
    const tempId = `manual-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: ManualHunterRecord = {
      id: tempId,
      hunterId: input.hunterId,
      name: input.name || input.hunterId,
      bankName: input.bankName,
      accountNumber: input.accountNumber || '',
      mobile: input.mobile || '',
      pan: input.pan || '',
      status: input.status || 'Active Reference',
      remarks: input.remarks || input.notes || '',
      notes: input.notes || input.remarks || '',
      createdBy: adminSession?.name || 'Manikandan (Admin)',
      createdAt: formattedDate,
      updatedAt: formattedDate,
      rawColumns: input.rawColumns || {},
    };

    // Optimistic UI state update
    setManualRecords((prev) => [newRecord, ...prev]);

    try {
      // 1. Write to master live_identifiers collection
      await adminDirectAddLiveIdentifier(
        {
          identifier: input.hunterId,
          bankName: input.bankName,
          details: input.remarks || input.notes || input.name || '',
          source: 'admin_direct',
          status: input.status || 'Active Reference',
          rawColumns: input.rawColumns,
        },
        adminSession?.name || 'Administrator Manikandan'
      );

      // 2. Direct write to Cloud Firestore manual_identifiers
      await addManualHunterRecordToFirestore(newRecord);

      // 3. Also notify backend API proxy
      fetch('/api/manual-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession?.token || 'ADMIN_SESSION_TOKEN_XYZ'}`,
        },
        body: JSON.stringify(input),
      }).catch(() => {});
    } catch (err) {
      console.warn('Firestore add note:', err);
    }

    triggerToast({
      type: 'success',
      title: '✓ Hunter Identifier Added & Live',
      message: `Record "${input.hunterId}" (${input.bankName}) saved directly to Cloud Firestore LIVE database.`,
      subtext: 'Instantly synced across all connected public search devices',
    });
  };

  // Step 7: Handle Manual Hunter Record Edit (Admin Only)
  const handleEditManualRecord = async (input: ManualRecordInput) => {
    if (!input.id) return;
    const recordId = input.id;

    // Optimistic UI update
    setManualRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? {
              ...r,
              hunterId: input.hunterId,
              bankName: input.bankName,
              name: input.name || input.hunterId,
              accountNumber: input.accountNumber || '',
              mobile: input.mobile || '',
              pan: input.pan || '',
              status: input.status || r.status,
              remarks: input.remarks || input.notes || '',
              notes: input.notes || input.remarks || '',
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );

    try {
      // 1. Direct write to master live_identifiers
      await adminDirectUpdateLiveIdentifier(
        recordId,
        {
          identifier: input.hunterId,
          bankName: input.bankName,
          details: input.remarks || input.notes || input.name || '',
          status: input.status || undefined,
        },
        adminSession?.name || 'Administrator Manikandan'
      );

      // 2. Write to Cloud Firestore manual_identifiers
      await updateManualHunterRecordInFirestore(recordId, input);

      // 3. Also notify backend API proxy
      fetch(`/api/manual-records/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminSession?.token || 'ADMIN_SESSION_TOKEN_XYZ'}`,
        },
        body: JSON.stringify(input),
      }).catch(() => {});
    } catch (err) {
      console.warn('Firestore edit note:', err);
    }

    triggerToast({
      type: 'success',
      title: '✓ Hunter Identifier Updated',
      message: `Record "${input.hunterId}" (${input.bankName}) updated in Cloud Firestore.`,
    });
  };

  // Step 8: Handle Manual Hunter Record Deletion (Admin Only)
  const handleDeleteManualRecord = async (recordId: string) => {
    const target = manualRecords.find((r) => r.id === recordId);
    // Optimistic UI update
    setManualRecords((prev) => prev.filter((r) => r.id !== recordId));
    setLiveIdentifiers((prev) => prev.filter((r) => r.id !== recordId));

    try {
      // 1. Direct delete from master live_identifiers
      await adminDirectDeleteLiveIdentifier(recordId, adminSession?.name || 'Administrator Manikandan');

      // 2. Delete from Cloud Firestore manual_identifiers
      await deleteManualHunterRecordFromFirestore(recordId);

      // 3. Also notify backend API proxy
      fetch(`/api/manual-records/${recordId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminSession?.token || 'ADMIN_SESSION_TOKEN_XYZ'}`,
        },
      }).catch(() => {});
    } catch (err) {
      console.warn('Firestore delete note:', err);
    }

    triggerToast({
      type: 'info',
      title: 'Manual Record Deleted',
      message: `Hunter Identifier "${target?.hunterId || recordId}" removed from Cloud Firestore.`,
    });
  };

  // Step 8.1: Handle User Open Submission Modal
  const handleOpenUserSubmit = (initialRecord?: RecordItem, mode: 'new' | 'update' = 'new') => {
    setUserSubmitInitialRecord(initialRecord || null);
    setUserSubmitMode(mode);
    setIsUserSubmitModalOpen(true);
  };

  // Step 8.2: Handle User Submission Success Notification
  const handleUserSubmissionSuccess = (
    submissionId?: string,
    hunterId?: string,
    newRecord?: ManualHunterRecord
  ) => {
    if (newRecord) {
      setManualRecords((prev) => {
        if (prev.some((r) => r.id === newRecord.id)) return prev;
        return [newRecord, ...prev];
      });
    }

    triggerToast({
      type: 'success',
      title: '✓ Identifier Submitted for Admin Approval',
      message: `Identifier "${hunterId || 'Record'}" has been submitted to the Admin Portal.`,
      subtext: 'Accepts all alphabetic, numeric, and special character formats. Pending review by Administrator Manikandan.',
    });
  };

  // Step 8.3: Handle Admin Approving a User Submission
  const handleApproveSubmission = async (
    submissionId: string,
    adminName: string,
    adjustedData?: Partial<ManualHunterRecord>
  ) => {
    // Optimistic UI update
    setManualRecords((prev) =>
      prev.map((r) =>
        r.id === submissionId
          ? {
              ...r,
              ...(adjustedData || {}),
              approvalStatus: 'approved',
              reviewedBy: adminName,
              reviewedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
    setSubmissionsList((prev) =>
      prev.map((s) => (s.id === submissionId ? { ...s, status: 'approved' } : s))
    );

    try {
      // 1. Promote to master live_identifiers in Cloud Firestore
      await approveSubmissionInFirestore(submissionId, adminName, {
        identifier: adjustedData?.hunterId,
        bankName: adjustedData?.bankName,
        details: adjustedData?.remarks || adjustedData?.notes || adjustedData?.name,
      });

      // 2. Legacy collection sync
      await approveUserHunterSubmissionInFirestore(submissionId, adminName, adjustedData);
    } catch (err) {
      console.warn('Firestore approval sync note:', err);
    }

    const target = manualRecords.find((r) => r.id === submissionId);
    triggerToast({
      type: 'success',
      title: '✓ Identifier Approved & Live',
      message: `Record "${target?.hunterId || submissionId}" is now live and searchable across all users.`,
    });
  };

  // Step 8.4: Handle Admin Rejecting a User Submission
  const handleRejectSubmission = async (
    submissionId: string,
    adminName: string,
    reason: string
  ) => {
    // Optimistic UI update
    setManualRecords((prev) =>
      prev.map((r) =>
        r.id === submissionId
          ? {
              ...r,
              approvalStatus: 'rejected',
              reviewedBy: adminName,
              reviewedAt: new Date().toISOString(),
              rejectionReason: reason,
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );
    setSubmissionsList((prev) =>
      prev.map((s) =>
        s.id === submissionId ? { ...s, status: 'rejected', rejectionReason: reason } : s
      )
    );

    try {
      // 1. Master submissions collection rejection in Cloud Firestore
      await rejectSubmissionInFirestore(submissionId, adminName, reason);

      // 2. Legacy collection sync
      await rejectUserHunterSubmissionInFirestore(submissionId, adminName, reason);
    } catch (err) {
      console.warn('Firestore rejection sync note:', err);
    }

    const target = manualRecords.find((r) => r.id === submissionId);
    triggerToast({
      type: 'info',
      title: 'Submission Rejected',
      message: `Record "${target?.hunterId || submissionId}" was marked as rejected with reason recorded.`,
    });
  };

  // Step 9: Handle Single CSV Record Deletion (Admin Only)
  const handleDeleteRecord = (recordId: string) => {
    const target = records.find((r) => r.id === recordId);
    const updated = records.filter((r) => r.id !== recordId);
    setRecords(updated);

    const remainingBanks = Array.from(
      new Set(updated.map((r) => r.bankName).filter(Boolean) as string[])
    ).sort();
    setUniqueBanks(remainingBanks);

    const updatedMeta: CSVMetadata = {
      ...csvMetadata,
      recordCount: updated.length,
      bankCount: remainingBanks.length,
      status: updated.length === 0 ? 'EMPTY' : csvMetadata.status,
    };

    setCsvMetadata(updatedMeta);
    saveActiveDatasetToFirestore(updatedMeta, updated);

    triggerToast({
      type: 'info',
      title: 'Record Removed',
      message: `Record "${target?.hunterId || target?.name || recordId}" was deleted from active database.`,
    });
  };

  // Re-run search when user clicks Search or presses Enter
  const handleExecuteSearch = () => {
    performSearch(searchQuery, filters, combinedRecords);
  };

  // Unified submissions and manual records for Admin dashboard and approvals queue
  const combinedManualAndSubmissions = useMemo<ManualHunterRecord[]>(() => {
    const list = [...manualRecords];
    const existingIds = new Set(list.map((r) => r.id));

    submissionsList.forEach((s) => {
      const id = s.id || s.submissionId;
      if (!existingIds.has(id)) {
        existingIds.add(id);
        list.push({
          id,
          hunterId: s.identifier,
          bankName: s.bankName,
          orgType: 'Bank',
          name: s.identifier,
          status: 'Pending Verification',
          remarks: s.details,
          createdBy: s.submittedBy || 'Public User',
          createdAt: s.submittedAt,
          updatedAt: s.submittedAt,
          approvalStatus: s.status,
          submittedBy: { name: s.submittedBy || 'Public User' },
          submittedAt: s.submittedAt,
          reviewedBy: s.reviewedBy,
          reviewedAt: s.reviewedAt,
          rejectionReason: s.rejectionReason,
          isUpdateRequest: s.submissionType === 'update' || (s as any).type === 'update',
          targetRecordId: s.existingRecordId || (s as any).targetRecordId,
          rawColumns: (s as any).rawColumns || {},
        });
      }
    });

    return list;
  }, [manualRecords, submissionsList]);

  // Export entire dataset to CSV (Admin Portal only - Requirement 13 & 14)
  const handleExportDataset = () => {
    if (combinedRecords.length === 0) return;

    // Convert all active combined live records to live identifiers format for complete export
    const exportItems: LiveIdentifierRecord[] = combinedRecords.map((r) => {
      const matchingLive = liveIdentifiers.find((l) => l.id === r.id || l.identifier === r.hunterId);
      return {
        id: r.id,
        identifier: r.hunterId || r.id,
        bankName: r.bankName,
        details: r.details || r.name || 'Hunter Identifier Reference',
        source: matchingLive?.source || r.notes || 'Master Live Database',
        status: matchingLive?.status || r.status || 'Active Reference',
        createdAt: matchingLive?.createdAt || r.uploadDate || '',
        updatedAt: matchingLive?.updatedAt || r.lastUpdated || '',
        approvedAt: matchingLive?.approvedAt || r.uploadDate || '',
        approvedBy: matchingLive?.approvedBy || r.uploadedBy || 'Administrator',
      };
    });

    downloadLiveIdentifiersAsCSV(exportItems);
    triggerToast({
      type: 'success',
      title: '✓ Live CSV Export Complete',
      message: `Downloaded ${exportItems.length.toLocaleString()} LIVE identifiers from active master database with one click.`,
    });
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    triggerToast({
      type: 'info',
      title: 'Search History Cleared',
      message: 'All search query audit entries have been cleared from this session.',
    });
  };

  // Handle Google User Authentication
  const handleAuthenticatedUser = async (user: any) => {
    setGoogleUser(user);
    try {
      const { isAdmin } = await syncUserProfileInFirestore(user);
      if (isAdmin || user.email === 'gmanikandan639@gmail.com') {
        setAdminSession({
          isAuthenticated: true,
          username: user.email || 'Admin',
          name: user.displayName || 'Manikandan',
          role: 'Administrator',
          system: 'Hunter Risk Management',
          loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          token: user.uid,
        });
      }
    } catch (e) {
      if (user.email === 'gmanikandan639@gmail.com') {
        setAdminSession({
          isAuthenticated: true,
          username: user.email || 'Admin',
          name: user.displayName || 'Manikandan',
          role: 'Administrator',
          system: 'Hunter Risk Management',
          loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          token: user.uid,
        });
      }
    }
  };

  return (
    <div
      id="app-root"
      className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white"
    >
      {/* Top Header */}
      <Header
        activePage={activePage}
        onSelectPage={handleNavigatePage}
        recordCount={combinedRecords.length}
        isDemoData={csvMetadata.isDemo}
        adminSession={adminSession}
        googleUser={googleUser}
        onLogout={handleLogout}
        visitorStats={visitorStats}
        liveSyncStatus={liveSyncStatus}
        pendingApprovalsCount={pendingApprovalsCount}
        onOpenUserSubmit={() => handleOpenUserSubmit()}
      />


      {/* Main Content Container */}
      <main
        id="main-content-container"
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6"
      >
        {/* VIEW 1: PUBLIC HUNTER SEARCH */}
        {activePage === 'search' && (
          <div
            id="hunter-search-page-layout"
            className="flex flex-col lg:flex-row items-start gap-6"
          >
            {/* LEFT SIDE – 40% (HUNTER SEARCH) */}
            <div className="w-full lg:w-[40%] shrink-0 lg:sticky lg:top-24">
              <SearchPanel
                csvMetadata={effectiveMetadata}
                uniqueBanks={combinedUniqueBanks}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onExecuteSearch={handleExecuteSearch}
                filters={filters}
                setFilters={setFilters}
                isSearching={isSearching}
                onRemapColumns={handleRemapColumns}
                adminSession={adminSession}
                onOpenAddManualRecord={() => setIsAddManualRecordModalOpen(true)}
                onOpenUserSubmit={() => handleOpenUserSubmit()}
                pendingApprovalsCount={pendingApprovalsCount}
              />
            </div>

            {/* RIGHT SIDE – 60% (HUNTER MATCH RESULTS) */}
            <div className="w-full lg:w-[60%] flex-1 min-w-0">
              <ResultsPanel
                results={results}
                hasSearched={hasSearched}
                searchQuery={searchQuery}
                isSearching={isSearching}
                csvMetadata={effectiveMetadata}
                threshold={filters.threshold}
                onSelectRecord={(record, score, matchedFields) =>
                  setSelectedRecord({ record, score, matchedFields })
                }
                onProposeUpdate={(rec) => handleOpenUserSubmit(rec, 'update')}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: ABOUT PAGE */}
        {activePage === 'about' && (
          <AboutAdminPage
            csvMetadata={effectiveMetadata}
            adminSession={adminSession}
            onNavigateToSearch={() => setActivePage('search')}
            onNavigateToAdmin={() => handleNavigatePage('admin')}
            onNavigateToLogin={() => setActivePage('login')}
          />
        )}

        {/* VIEW 3: ADMIN LOGIN PAGE */}
        {activePage === 'login' && (
          <AdminLogin
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => setActivePage('search')}
          />
        )}

        {/* VIEW 4: ADMIN DASHBOARD (PROTECTED) */}
        {activePage === 'admin' && (
          adminSession?.isAuthenticated ? (
            <AdminDashboard
              adminSession={adminSession}
              csvMetadata={csvMetadata}
              records={records}
              manualRecords={combinedManualAndSubmissions}
              uniqueBanks={combinedUniqueBanks}
              searchHistory={searchHistory}
              onLogout={handleLogout}
              onInitiateUpload={handleInitiateUpload}
              onInitiateClearDatabase={handleInitiateClearDatabase}
              onResetToDemo={handleResetToDemo}
              onNavigateToPublic={() => setActivePage('search')}
              onClearHistory={handleClearHistory}
              onExportDataset={handleExportDataset}
              defaultThreshold={defaultThreshold}
              setDefaultThreshold={setDefaultThreshold}
              onAddManualRecord={handleAddManualRecord}
              onEditManualRecord={handleEditManualRecord}
              onDeleteManualRecord={handleDeleteManualRecord}
              onDeleteRecord={handleDeleteRecord}
              onApproveSubmission={handleApproveSubmission}
              onRejectSubmission={handleRejectSubmission}
              visitorStats={visitorStats}
              uploadProgress={uploadProgress}
              isUploading={isUploading}
            />
          ) : (
            <AdminLogin
              onLoginSuccess={handleLoginSuccess}
              onCancel={() => setActivePage('search')}
            />
          )
        )}
      </main>

      {/* Confirmation Modal for CSV Dataset Replacement */}
      {isReplaceModalOpen && pendingUpload && (
        <ReplaceConfirmModal
          isOpen={isReplaceModalOpen}
          newFileDetails={{
            fileName: pendingUpload.file.name,
            fileSize: `${Math.round((pendingUpload.file.size / 1024) * 10) / 10} KB`,
            recordCount: pendingUpload.parsed.rowCount,
            columnCount: pendingUpload.parsed.columnCount,
            bankCount: pendingUpload.parsed.bankCount,
            detectedNameCol: pendingUpload.parsed.detectedNameCol,
            detectedBankCol: pendingUpload.parsed.detectedBankCol,
          }}
          currentFileName={csvMetadata.fileName}
          onConfirm={handleConfirmReplacement}
          onCancel={handleCancelReplacement}
        />
      )}

      {/* Confirmation Modal for Clearing Database */}
      <ClearConfirmModal
        isOpen={isClearModalOpen}
        currentFileName={csvMetadata.fileName}
        recordCount={records.length}
        onConfirm={handleConfirmClearDatabase}
        onCancel={() => setIsClearModalOpen(false)}
      />

      {/* Dynamic Record Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord.record}
          score={selectedRecord.score}
          matchedFields={selectedRecord.matchedFields}
          onClose={() => setSelectedRecord(null)}
          onProposeUpdate={(rec) => handleOpenUserSubmit(rec, 'update')}
        />
      )}

      {/* Quick Add Manual Hunter Record Modal (Admin Only, accessible from Public Search) */}
      <AddManualRecordModal
        isOpen={isAddManualRecordModalOpen}
        onClose={() => setIsAddManualRecordModalOpen(false)}
        onSave={async (data) => {
          await handleAddManualRecord(data);
          setIsAddManualRecordModalOpen(false);
        }}
        uniqueBanks={combinedUniqueBanks}
        currentHeaders={effectiveMetadata.headers}
      />

      {/* Front-End User Hunter Identifier Submission / Proposal Modal */}
      <UserSubmitIdentifierModal
        isOpen={isUserSubmitModalOpen}
        onClose={() => setIsUserSubmitModalOpen(false)}
        onSubmitSuccess={handleUserSubmissionSuccess}
        uniqueBanks={combinedUniqueBanks}
        initialRecord={userSubmitInitialRecord}
        mode={userSubmitMode}
      />

      {/* Global Toast Notification */}
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />

      {/* Enterprise Banking Footer */}
      <footer
        id="app-footer"
        className="border-t border-slate-200 bg-white py-5 text-xs text-slate-500 mt-auto"
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
              <img
                src={BRAND.shieldIcon}
                alt="Fraud Risk Hub"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight">FRAUD RISK HUB</span>
              <span>•</span>
              <span className="text-slate-600 font-medium">Banking, NBFC, RCU & FCU Risk Intelligence</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-mono font-bold text-slate-700">DETECT • ANALYZE • PREVENT</span>
            <span>•</span>
            <span>Administrator: <span className="font-semibold text-slate-800">Manikandan</span></span>
            <span>•</span>
            <button
              id="footer-firebase-test-btn"
              onClick={() => setIsFirebaseTestOpen(true)}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
              title="Click to run live Firebase connection diagnostics (Step 6)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Firebase Test
            </button>
          </div>
        </div>
      </footer>

      {/* Temporary Firebase Connection Diagnostics Modal (Step 6) */}
      <FirebaseTestModal
        isOpen={isFirebaseTestOpen}
        onClose={() => setIsFirebaseTestOpen(false)}
      />
    </div>
  );
}
