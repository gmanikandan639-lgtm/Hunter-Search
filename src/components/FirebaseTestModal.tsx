import React, { useState, useEffect } from 'react';
import {
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Lock,
  X,
  ShieldCheck,
  KeyRound,
  UserCheck,
  LogIn,
  LogOut,
} from 'lucide-react';
import { runDetailedConnectionTest, DetailedConnectionTestReport } from '../lib/firebaseTest';
import { signInWithGoogle, logOut, auth } from '../lib/firebase';

interface FirebaseTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseTestModal: React.FC<FirebaseTestModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [result, setResult] = useState<DetailedConnectionTestReport | null>(null);

  const executeTest = async () => {
    setLoading(true);
    try {
      const res = await runDetailedConnectionTest();
      setResult(res);
    } catch (e: any) {
      console.error('Test execution error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInAndTest = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
      await executeTest();
    } catch (err) {
      console.error('Sign-in error:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOutAndTest = async () => {
    setLoading(true);
    try {
      await logOut();
      await executeTest();
    } catch (err) {
      console.error('Sign-out error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      executeTest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="firebase-test-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="firebase-test-modal-container"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Firebase Connection Diagnostics
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  Live Test
                </span>
              </h3>
              <p className="text-xs text-slate-500">Live communication test for NEW Firebase project</p>
            </div>
          </div>
          <button
            id="close-firebase-test-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {loading && !result ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Testing connection to Firebase...</p>
              <p className="text-xs text-slate-400">Verifying Web SDK, Auth, Google Sign-In, and Firestore</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Summary Banner */}
              <div
                className={`p-4 rounded-xl border ${
                  result.firestoreWrite === 'PASS' && result.firestoreRead === 'PASS'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : !result.authCurrentUserExists
                    ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.firestoreWrite === 'PASS' && result.firestoreRead === 'PASS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : !result.authCurrentUserExists ? (
                    <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      {result.firestoreWrite === 'PASS' && result.firestoreRead === 'PASS'
                        ? 'Authenticated Connection Verified'
                        : !result.authCurrentUserExists
                        ? 'Authentication Required for Firestore Access'
                        : 'Firestore Operation Blocked'}
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed font-medium">
                      {result.summaryMessage}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Grid - 7 Required Lines */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  System Diagnostics Status
                </h5>

                {/* 1. Firebase initialized */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                  <span className="text-slate-600 flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-slate-400" />
                    Firebase initialized:
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      result.firebaseInitialized === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {result.firebaseInitialized}
                  </span>
                </div>

                {/* 2. Firebase Auth initialized */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                  <span className="text-slate-600 flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    Firebase Auth initialized:
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      result.firebaseAuthInitialized === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {result.firebaseAuthInitialized}
                  </span>
                </div>

                {/* 3. Google login */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                  <span className="text-slate-600 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                    Google login:
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      result.googleLoginConfigured === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {result.googleLoginConfigured}
                  </span>
                </div>

                {/* 4. Current Firebase user exists */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                  <span className="text-slate-600 flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    Current Firebase user exists:
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      result.currentFirebaseUserExists === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {result.currentFirebaseUserExists}
                  </span>
                </div>

                {/* 5. Firestore initialized */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                  <span className="text-slate-600 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    Firestore initialized:
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      result.firestoreInitialized === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {result.firestoreInitialized}
                  </span>
                </div>

                {/* 6. Firestore write */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                  <span className="text-slate-600 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    Firestore write:
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      result.firestoreWrite === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {result.firestoreWrite}
                  </span>
                </div>

                {/* 7. Firestore read */}
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60 text-xs">
                  <span className="text-slate-600 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    Firestore read:
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      result.firestoreRead === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {result.firestoreRead}
                  </span>
                </div>

                {/* Firebase Project ID */}
                <div className="flex items-center justify-between py-1 text-xs">
                  <span className="text-slate-600">Firebase Project ID:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                    {result.projectId}
                  </span>
                </div>

                {result.adminVerification && (
                  <div className="pt-2 mt-2 border-t border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Firebase UID:</span>
                      <span className="font-mono font-bold text-slate-800 text-[11px] truncate max-w-[220px]">
                        {result.adminVerification.uid}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">User document created/updated:</span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          result.adminVerification.userDocCreatedUpdated === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {result.adminVerification.userDocCreatedUpdated}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Role:</span>
                      <span className="font-mono font-bold px-2 py-0.5 rounded text-[11px] bg-indigo-100 text-indigo-800 uppercase">
                        {result.adminVerification.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Firestore read:</span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          result.adminVerification.firestoreRead === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {result.adminVerification.firestoreRead}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Exact Diagnostic Operation Details */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Operation & Diagnostic Details
                </h5>

                <div className="text-xs py-1 border-b border-slate-200/50 flex justify-between">
                  <span className="text-slate-500 font-medium">Attempted operation:</span>
                  <span className="font-mono font-bold text-slate-800">{result.attemptedOperation}</span>
                </div>

                <div className="text-xs py-1 border-b border-slate-200/50 flex justify-between">
                  <span className="text-slate-500 font-medium">Target path:</span>
                  <span className="font-mono font-bold text-slate-800">{result.targetPath}</span>
                </div>

                <div className="text-xs py-1 border-b border-slate-200/50 flex justify-between">
                  <span className="text-slate-500 font-medium">auth.currentUser exists:</span>
                  <span className={`font-mono font-bold ${result.authCurrentUserExists ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {result.authCurrentUserExists ? `Yes (${result.userEmail || result.userUid})` : 'No (null)'}
                  </span>
                </div>

                {result.firebaseErrorCode && (
                  <div className="text-xs py-1 border-b border-slate-200/50 flex justify-between">
                    <span className="text-slate-500 font-medium">Firebase error code:</span>
                    <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                      {result.firebaseErrorCode}
                    </span>
                  </div>
                )}

                {result.firebaseErrorMessage && (
                  <div className="text-xs py-1">
                    <span className="text-slate-500 font-medium block mb-1">Firebase error message:</span>
                    <div className="font-mono text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200 break-all leading-relaxed">
                      {result.firebaseErrorMessage}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Banner for Auth if auth.currentUser is null */}
              {!result.authCurrentUserExists ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-900 block">Why is Firestore Write/Read failing?</span>
                      <p className="text-amber-800 mt-0.5 leading-relaxed">
                        Security Rule is <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">allow read, write: if request.auth != null;</code>.
                        Because <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">auth.currentUser</code> is <span className="font-bold">null</span>, Firestore rejects the request with code <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">permission-denied</code>.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignInAndTest}
                    disabled={isSigningIn}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    {isSigningIn ? 'Signing in with Google...' : 'Sign In with Google to Test Authenticated Access'}
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Signed in as <strong className="font-mono">{result.userEmail}</strong></span>
                  </div>
                  <button
                    onClick={handleSignOutAndTest}
                    className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    Sign Out & Re-test
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {result?.timestamp ? new Date(result.timestamp).toLocaleTimeString() : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              id="retest-firebase-btn"
              onClick={executeTest}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Re-test Connection
            </button>
            <button
              id="close-firebase-test-footer-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

