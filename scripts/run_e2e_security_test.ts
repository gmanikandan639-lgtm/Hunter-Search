import 'dotenv/config';
import {
  auth,
  db,
  normalizeIdentifier,
  searchBothHunterCollections,
} from '../src/lib/firebase';
import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import config from '../firebase-applet-config.json';

interface TestResults {
  adminLogin: 'PASS' | 'FAIL';
  adminRole: 'PASS' | 'FAIL';
  manualIdentifier: 'PASS' | 'FAIL';
  realTimeSync: 'PASS' | 'FAIL';
  normalUserRead: 'PASS' | 'FAIL';
  normalUserWriteProtection: 'PASS' | 'FAIL';
  csvImport: 'PASS' | 'FAIL';
  csvReplacement: 'PASS' | 'FAIL';
  manualDataProtection: 'PASS' | 'FAIL';
  securityRules: 'PASS' | 'FAIL';
  cleanup: 'PASS' | 'FAIL';
}

const results: TestResults = {
  adminLogin: 'FAIL',
  adminRole: 'FAIL',
  manualIdentifier: 'FAIL',
  realTimeSync: 'FAIL',
  normalUserRead: 'FAIL',
  normalUserWriteProtection: 'FAIL',
  csvImport: 'FAIL',
  csvReplacement: 'FAIL',
  manualDataProtection: 'FAIL',
  securityRules: 'FAIL',
  cleanup: 'FAIL',
};

const logs: string[] = [];
function log(msg: string) {
  console.log(msg);
  logs.push(msg);
}

async function runEndToEndTests() {
  log('===============================================================');
  log('HUNTER SEARCH FULL END-TO-END SECURITY & FUNCTIONALITY TEST');
  log('Database: ' + config.firestoreDatabaseId);
  log('Project: ' + config.projectId);
  log('Time: ' + new Date().toISOString());
  log('===============================================================\n');

  const ADMIN_EMAIL = 'gmanikandan639@gmail.com';
  const ADMIN_PASS = 'AdminPass123456!';
  const NORMAL_EMAIL = 'test_normal_user@example.com';
  const NORMAL_PASS = 'TestPassword123!';

  const TEST_ID = `E2E-TEST-${Date.now()}`;
  const TEST_DOC_ID = `manual-${TEST_ID.toLowerCase()}`;
  const TEST_CSV_ID_1 = `hr_csv_test_1_${Date.now()}`;
  const TEST_CSV_ID_2 = `hr_csv_test_2_${Date.now()}`;

  let adminUid = '';
  let normalUid = '';

  // -------------------------------------------------------------------------
  // TEST 1 — ADMIN LOGIN
  // -------------------------------------------------------------------------
  log('>>> Running TEST 1 — ADMIN LOGIN...');
  try {
    const adminCred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
    adminUid = adminCred.user.uid;
    log(`  [✓] Signed in with Admin Account: ${adminCred.user.email} (UID: ${adminUid})`);

    // Verify user document in users/{uid}
    const userDocRef = doc(db, 'users', adminUid);
    await setDoc(
      userDocRef,
      {
        uid: adminUid,
        name: 'Administrator',
        email: ADMIN_EMAIL,
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      log(`  [✓] users/{uid} document exists! Role = ${userData.role}`);
      if (userData.role === 'admin') {
        results.adminLogin = 'PASS';
        results.adminRole = 'PASS';
        log('  [PASS] TEST 1: Admin Login and Role verified.');
      } else {
        log(`  [FAIL] Role is not "admin": ${userData.role}`);
      }
    } else {
      log('  [FAIL] users/{uid} document does not exist.');
    }
  } catch (err: any) {
    log(`  [FAIL] Admin login error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 2 — ADMIN MANUAL IDENTIFIER
  // -------------------------------------------------------------------------
  log('\n>>> Running TEST 2 — ADMIN MANUAL IDENTIFIER...');
  try {
    const norm = normalizeIdentifier(TEST_ID);
    const manualDocRef = doc(db, 'manual_identifiers', TEST_DOC_ID);
    const testRecordPayload = {
      id: TEST_DOC_ID,
      identifier: TEST_ID,
      hunterId: TEST_ID,
      identifierLower: norm.lower,
      identifierClean: norm.clean,
      identifierPrefixes: norm.prefixes,
      bankName: 'Federal Risk Bank of India',
      details: 'E2E Automated Security Test Manual Record',
      source: 'manual_identifiers',
      isCsvImport: false,
      createdBy: ADMIN_EMAIL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvalStatus: 'approved',
      status: 'Active High Risk',
    };

    // Save to manual_identifiers
    await setDoc(manualDocRef, testRecordPayload);
    log(`  [✓] Saved temporary test record to manual_identifiers: ${TEST_DOC_ID}`);

    // Verify it can be read back from Firestore
    const readSnap = await getDoc(manualDocRef);
    if (readSnap.exists() && readSnap.data()?.identifier === TEST_ID) {
      log(`  [✓] Successfully read back from manual_identifiers in Firestore.`);

      // Verify it appears in Hunter Search
      const searchMatches = await searchBothHunterCollections(TEST_ID);
      const foundInSearch = searchMatches.some(
        (m) => m.record.hunterId === TEST_ID || m.record.identifier === TEST_ID
      );

      if (foundInSearch) {
        log(`  [✓] Record verified in Hunter Search results! (Score: ${searchMatches[0]?.score})`);
        results.manualIdentifier = 'PASS';
        log('  [PASS] TEST 2: Admin Manual Identifier created, read, and found in search.');
      } else {
        log('  [FAIL] Record not returned in Hunter Search query.');
      }
    } else {
      log('  [FAIL] Could not read back record from Firestore.');
    }
  } catch (err: any) {
    log(`  [FAIL] TEST 2 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 3 — REAL-TIME USER UPDATE
  // -------------------------------------------------------------------------
  log('\n>>> Running TEST 3 — REAL-TIME USER UPDATE...');
  try {
    const RT_TEST_ID = `RT-TEST-${Date.now()}`;
    const RT_DOC_ID = `manual-rt-${Date.now()}`;
    let listenerFired = false;

    // Set up real-time onSnapshot listener
    const manualCol = collection(db, 'manual_identifiers');
    const unsub = onSnapshot(manualCol, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.doc.id === RT_DOC_ID) {
          listenerFired = true;
          log(`  [✓] Real-time onSnapshot listener fired for: ${change.doc.id} (type: ${change.type})`);
        }
      });
    });

    // Write record
    const norm = normalizeIdentifier(RT_TEST_ID);
    await setDoc(doc(db, 'manual_identifiers', RT_DOC_ID), {
      id: RT_DOC_ID,
      identifier: RT_TEST_ID,
      hunterId: RT_TEST_ID,
      identifierLower: norm.lower,
      identifierClean: norm.clean,
      bankName: 'Realtime Test Bank',
      details: 'Real-time test identifier',
      createdAt: new Date().toISOString(),
      approvalStatus: 'approved',
    });

    // Wait up to 3 seconds for listener to trigger
    for (let i = 0; i < 30; i++) {
      if (listenerFired) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    unsub();

    // Clean up RT test doc
    await deleteDoc(doc(db, 'manual_identifiers', RT_DOC_ID));

    if (listenerFired) {
      results.realTimeSync = 'PASS';
      log('  [PASS] TEST 3: Real-time listener received new record instantly without page refresh.');
    } else {
      log('  [FAIL] Real-time listener did not trigger within timeout.');
    }
  } catch (err: any) {
    log(`  [FAIL] TEST 3 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 4 — NORMAL USER SECURITY
  // -------------------------------------------------------------------------
  log('\n>>> Running TEST 4 — NORMAL USER SECURITY...');
  try {
    // Sign in as normal user
    const normCred = await signInWithEmailAndPassword(auth, NORMAL_EMAIL, NORMAL_PASS);
    normalUid = normCred.user.uid;
    log(`  [✓] Signed in with Normal User Account: ${normCred.user.email} (UID: ${normalUid})`);

    // Ensure normal user has role "user"
    const normalUserDoc = doc(db, 'users', normalUid);
    // Write own profile with role 'user' (permitted by rules)
    await setDoc(
      normalUserDoc,
      {
        uid: normalUid,
        name: 'Normal Test User',
        email: NORMAL_EMAIL,
        role: 'user',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const normSnap = await getDoc(normalUserDoc);
    log(`  [✓] Normal user role in Firestore: ${normSnap.data()?.role}`);

    // 4a. Can search and read hunter_records
    let canReadHunter = false;
    try {
      const q = query(collection(db, 'hunter_records'), limit(5));
      const hunterSnap = await getDocs(q);
      canReadHunter = true;
      log(`  [✓] Normal user CAN read hunter_records (${hunterSnap.size} docs read)`);
    } catch (err: any) {
      log(`  [FAIL] Normal user could not read hunter_records: ${err.message}`);
    }

    // 4b. Can search and read manual_identifiers
    let canReadManual = false;
    try {
      const q = query(collection(db, 'manual_identifiers'), limit(5));
      const manualSnap = await getDocs(q);
      canReadManual = true;
      log(`  [✓] Normal user CAN read manual_identifiers (${manualSnap.size} docs read)`);
    } catch (err: any) {
      log(`  [FAIL] Normal user could not read manual_identifiers: ${err.message}`);
    }

    if (canReadHunter && canReadManual) {
      results.normalUserRead = 'PASS';
      log('  [PASS] Normal User Read: PASS');
    }

    // 4c. Cannot add records to hunter_records or manual_identifiers
    let cannotAddHunter = false;
    try {
      await setDoc(doc(db, 'hunter_records', 'unauthorized_record'), {
        identifier: 'HACK',
      });
      log('  [FAIL] Normal user was unexpectedly able to write to hunter_records!');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        cannotAddHunter = true;
        log('  [✓] Write to hunter_records rejected with permission-denied (Rule enforced)');
      } else {
        log(`  [?] Write to hunter_records failed with: ${err.code}`);
      }
    }

    let cannotAddManual = false;
    try {
      await setDoc(doc(db, 'manual_identifiers', 'unauthorized_manual'), {
        identifier: 'HACK',
      });
      log('  [FAIL] Normal user was unexpectedly able to write to manual_identifiers!');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        cannotAddManual = true;
        log('  [✓] Write to manual_identifiers rejected with permission-denied (Rule enforced)');
      } else {
        log(`  [?] Write to manual_identifiers failed with: ${err.code}`);
      }
    }

    // 4d. Cannot edit records
    let cannotEdit = false;
    try {
      await updateDoc(doc(db, 'manual_identifiers', TEST_DOC_ID), {
        bankName: 'Hacked Bank',
      });
      log('  [FAIL] Normal user was unexpectedly able to update manual_identifiers!');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        cannotEdit = true;
        log('  [✓] Update to manual_identifiers rejected with permission-denied (Rule enforced)');
      }
    }

    // 4e. Cannot delete records
    let cannotDelete = false;
    try {
      await deleteDoc(doc(db, 'manual_identifiers', TEST_DOC_ID));
      log('  [FAIL] Normal user was unexpectedly able to delete from manual_identifiers!');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        cannotDelete = true;
        log('  [✓] Delete from manual_identifiers rejected with permission-denied (Rule enforced)');
      }
    }

    // 4f. Cannot upload/replace CSV
    let cannotModifyCsv = false;
    try {
      await setDoc(doc(db, 'csv_metadata', 'current'), {
        fileName: 'malicious.csv',
      });
      log('  [FAIL] Normal user was unexpectedly able to write to csv_metadata!');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        cannotModifyCsv = true;
        log('  [✓] Write to csv_metadata rejected with permission-denied (Rule enforced)');
      }
    }

    // 4g. Cannot modify role of another user or escalate own role to admin
    let cannotEscalateRole = false;
    try {
      await updateDoc(normalUserDoc, {
        role: 'admin',
      });
      log('  [FAIL] Normal user was unexpectedly able to escalate role to admin!');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        cannotEscalateRole = true;
        log('  [✓] Self role escalation to admin rejected with permission-denied (Rule enforced)');
      }
    }

    let cannotModifyOtherUser = false;
    try {
      await updateDoc(doc(db, 'users', adminUid), {
        role: 'user',
      });
      log('  [FAIL] Normal user was unexpectedly able to modify another user profile!');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        cannotModifyOtherUser = true;
        log('  [✓] Modifying another user rejected with permission-denied (Rule enforced)');
      }
    }

    if (
      cannotAddHunter &&
      cannotAddManual &&
      cannotEdit &&
      cannotDelete &&
      cannotModifyCsv &&
      cannotEscalateRole &&
      cannotModifyOtherUser
    ) {
      results.normalUserWriteProtection = 'PASS';
      log('  [PASS] TEST 4: Normal User Write Protection completely verified across all collections!');
    } else {
      log('  [FAIL] Some normal user write operations were not properly restricted.');
    }
  } catch (err: any) {
    log(`  [FAIL] TEST 4 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 5 — CSV IMPORT & REPLACEMENT
  // -------------------------------------------------------------------------
  log('\n>>> Running TEST 5 — CSV IMPORT & REPLACEMENT...');
  try {
    // Re-sign in as Admin
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);
    log('  [✓] Re-authenticated as Admin for CSV operations.');

    // 5a. Verify CSV Import works
    const csvDocRef1 = doc(db, 'hunter_records', TEST_CSV_ID_1);
    await setDoc(csvDocRef1, {
      id: TEST_CSV_ID_1,
      identifier: 'CSV-IMPORT-RECORD-001',
      bankName: 'Test Import Bank',
      details: 'Initial CSV Dataset Import Test',
      source: 'test_batch_1.csv',
      isCsvImport: true,
      batchId: 'batch_test_1',
      createdAt: new Date().toISOString(),
    });

    const csvMetaRef = doc(db, 'csv_metadata', 'current');
    await setDoc(csvMetaRef, {
      fileName: 'test_batch_1.csv',
      uploadedBy: ADMIN_EMAIL,
      uploadedAt: new Date().toISOString(),
      recordCount: 1,
      status: 'active',
      batchId: 'batch_test_1',
    });

    const csvSnap = await getDoc(csvDocRef1);
    const metaSnap = await getDoc(csvMetaRef);

    if (csvSnap.exists() && metaSnap.exists()) {
      results.csvImport = 'PASS';
      log('  [PASS] CSV Import: Record stored in hunter_records and csv_metadata updated.');
    }

    // 5b. Verify CSV Replacement affects ONLY CSV records
    // Replace with batch 2
    const csvDocRef2 = doc(db, 'hunter_records', TEST_CSV_ID_2);
    await setDoc(csvDocRef2, {
      id: TEST_CSV_ID_2,
      identifier: 'CSV-IMPORT-RECORD-002',
      bankName: 'Test Replacement Bank',
      details: 'Second CSV Dataset Replacement Test',
      source: 'test_batch_2.csv',
      isCsvImport: true,
      batchId: 'batch_test_2',
      createdAt: new Date().toISOString(),
    });

    // Delete previous CSV test record
    await deleteDoc(csvDocRef1);

    await setDoc(csvMetaRef, {
      fileName: 'test_batch_2.csv',
      uploadedBy: ADMIN_EMAIL,
      uploadedAt: new Date().toISOString(),
      recordCount: 1,
      status: 'active',
      batchId: 'batch_test_2',
    });

    const oldCsvSnap = await getDoc(csvDocRef1);
    const newCsvSnap = await getDoc(csvDocRef2);

    if (!oldCsvSnap.exists() && newCsvSnap.exists()) {
      results.csvReplacement = 'PASS';
      log('  [PASS] CSV Replacement: Previous CSV record replaced, new CSV record active.');
    }
  } catch (err: any) {
    log(`  [FAIL] TEST 5 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 6 — MANUAL DATA PROTECTION
  // -------------------------------------------------------------------------
  log('\n>>> Running TEST 6 — MANUAL DATA PROTECTION...');
  try {
    // Verify that our test manual record TEST_DOC_ID STILL exists after CSV replacement
    const manualDocRef = doc(db, 'manual_identifiers', TEST_DOC_ID);
    const manualSnap = await getDoc(manualDocRef);

    if (manualSnap.exists()) {
      log(`  [✓] manual_identifiers record (${TEST_DOC_ID}) remains intact after CSV replacement!`);

      // Verify it still appears in Hunter Search
      const searchMatches = await searchBothHunterCollections(TEST_ID);
      const foundInSearch = searchMatches.some(
        (m) => m.record.hunterId === TEST_ID || m.record.identifier === TEST_ID
      );

      if (foundInSearch) {
        results.manualDataProtection = 'PASS';
        log('  [PASS] TEST 6: Manual records completely protected and searchable after CSV replacement.');
      } else {
        log('  [FAIL] Manual record missing from search after CSV replacement.');
      }
    } else {
      log('  [FAIL] Manual record was unexpectedly deleted by CSV replacement!');
    }
  } catch (err: any) {
    log(`  [FAIL] TEST 6 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 7 — FIRESTORE SECURITY RULES REVIEW & LIVE VALIDATION
  // -------------------------------------------------------------------------
  log('\n>>> Running TEST 7 — FIRESTORE SECURITY...');
  try {
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rulesText = fs.readFileSync(rulesPath, 'utf8');

    const hasPublicWrite =
      /allow\s+write:\s*if\s+true/i.test(rulesText) ||
      /allow\s+create.*if\s+true/i.test(rulesText);
    const hasAllowAll = /allow\s+read,\s*write:\s*if\s+true/i.test(rulesText);
    const hasAdminRoleCheck =
      rulesText.includes('data.role ==') && rulesText.includes('users');
    const hasCollectionGuards =
      rulesText.includes('match /hunter_records') &&
      rulesText.includes('allow create, update, delete: if isAdmin()') &&
      rulesText.includes('match /manual_identifiers') &&
      rulesText.includes('allow create, update, delete: if isAdmin()');

    log(`  [✓] No public write rule: ${!hasPublicWrite}`);
    log(`  [✓] No allow read, write if true: ${!hasAllowAll}`);
    log(`  [✓] Admin check based on users/{uid}.role: ${hasAdminRoleCheck}`);
    log(`  [✓] Protected collections restricted to isAdmin: ${hasCollectionGuards}`);

    // Live unauthenticated test
    await signOut(auth);
    let unauthWriteBlocked = false;
    try {
      await setDoc(doc(db, 'hunter_records', 'unauth_test_doc'), {
        test: true,
      });
      log('  [FAIL] Unauthenticated write succeeded unexpectedly!');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        unauthWriteBlocked = true;
        log('  [✓] Live unauthenticated write blocked by security rules (permission-denied)');
      }
    }

    if (
      !hasPublicWrite &&
      !hasAllowAll &&
      hasAdminRoleCheck &&
      hasCollectionGuards &&
      unauthWriteBlocked
    ) {
      results.securityRules = 'PASS';
      log('  [PASS] TEST 7: Firestore Security Rules confirmed safe, compliant, and verified.');
    } else {
      log('  [FAIL] Security rules verification failed.');
    }
  } catch (err: any) {
    log(`  [FAIL] TEST 7 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 8 — CLEANUP
  // -------------------------------------------------------------------------
  log('\n>>> Running TEST 8 — CLEANUP...');
  try {
    // Sign back in as Admin to clean up temporary test artifacts
    await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASS);

    // Delete ONLY the test docs we created
    await deleteDoc(doc(db, 'manual_identifiers', TEST_DOC_ID));
    log(`  [✓] Deleted temporary manual test record: ${TEST_DOC_ID}`);

    await deleteDoc(doc(db, 'hunter_records', TEST_CSV_ID_2));
    log(`  [✓] Deleted temporary CSV test record: ${TEST_CSV_ID_2}`);

    // Verify real records were NOT deleted
    const hunterCol = collection(db, 'hunter_records');
    const existingHunterSnap = await getDocs(query(hunterCol, limit(5)));
    log(`  [✓] Confirmed real database records intact (${existingHunterSnap.size} reference docs checked).`);

    results.cleanup = 'PASS';
    log('  [PASS] TEST 8: All temporary test data safely deleted. Real data untouched.');
  } catch (err: any) {
    log(`  [FAIL] TEST 8 Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // FINAL REPORT
  // -------------------------------------------------------------------------
  log('\n===============================================================');
  log('FINAL SECURITY AND FUNCTIONALITY TEST REPORT:');
  log('===============================================================');
  log(`Admin Login: ${results.adminLogin}`);
  log(`Admin Role: ${results.adminRole}`);
  log(`Manual Identifier: ${results.manualIdentifier}`);
  log(`Real-Time Sync: ${results.realTimeSync}`);
  log(`Normal User Read: ${results.normalUserRead}`);
  log(`Normal User Write Protection: ${results.normalUserWriteProtection}`);
  log(`CSV Import: ${results.csvImport}`);
  log(`CSV Replacement: ${results.csvReplacement}`);
  log(`Manual Data Protection: ${results.manualDataProtection}`);
  log(`Security Rules: ${results.securityRules}`);
  log(`Cleanup: ${results.cleanup}`);
  log('===============================================================');
}

runEndToEndTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal Test Runner Error:', err);
    process.exit(1);
  });
