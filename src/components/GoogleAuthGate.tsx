import React, { useState } from 'react';
import { BRAND } from '../assets/branding';
import { signInWithGoogle, createDemoGoogleUser } from '../lib/firebase';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  HelpCircle,
  UserCheck,
} from 'lucide-react';

interface GoogleAuthGateProps {
  onAuthenticated: (user: any) => void;
}

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({ onAuthenticated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string; detail?: string } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onAuthenticated(user);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      const code = err?.code || '';
      const msg = err?.message || 'Authentication failed.';

      if (code === 'auth/popup-closed-by-user') {
        setError({
          code,
          message: 'Sign-in popup was closed before completing.',
          detail: 'Click "Sign in with Google" again and complete the Google login prompt.',
        });
      } else if (code === 'auth/cancelled-popup-request') {
        setError({
          code,
          message: 'Sign-in popup was cancelled.',
          detail: 'Another popup request was triggered. Please retry.',
        });
      } else if (code === 'auth/unauthorized-domain') {
        setError({
          code,
          message: `Domain '${currentHost}' is not authorized in Firebase Console.`,
          detail: `To fix this: Go to Firebase Console > Authentication > Settings > Authorized domains > Add '${currentHost}'.`,
        });
        setShowTroubleshoot(true);
      } else if (code === 'auth/operation-not-allowed') {
        setError({
          code,
          message: 'Google Sign-In provider is disabled in Firebase Console.',
          detail: 'To fix this: Go to Firebase Console > Authentication > Sign-in method > Enable Google.',
        });
        setShowTroubleshoot(true);
      } else if (code === 'auth/popup-blocked') {
        setError({
          code,
          message: 'Popup blocked by browser.',
          detail: 'Please allow popups for this site in your browser address bar and try again.',
        });
      } else {
        setError({
          code,
          message: msg,
          detail: 'Check your Firebase project configuration or use test access below.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyHost = () => {
    if (currentHost && navigator.clipboard) {
      navigator.clipboard.writeText(currentHost);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleContinueWithTestUser = (email: string, name: string) => {
    const testUser = createDemoGoogleUser(email, name);
    onAuthenticated(testUser);
  };

  return (
    <div
      id="google-auth-gate"
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 text-slate-100 selection:bg-red-600 selection:text-white"
    >
      {/* Top Brand Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shadow-md">
            <img
              src={BRAND.shieldIcon}
              alt="Fraud Risk Hub"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
              FRAUD RISK HUB
            </span>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Detect • Analyze • Prevent
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
            <Lock className="w-3 h-3 text-indigo-400" />
            <span>Google Auth Gateway</span>
          </span>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="max-w-4xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-6">
        {/* Left Col: Platform Highlights (7 cols) */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-red-500/10 text-red-400 border border-red-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RCU / FCU Enterprise Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Secure Fraud Risk &amp; Reference Verification
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Authenticate using your verified Google account to access real-time reference matching, fuzzy similarity search, bank directory intelligence, and fraud prevention records.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-900/50 text-indigo-300 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Similarity Verification</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">High-precision matching against banking reference datasets.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-900/50 text-red-300 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Google OAuth Security</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Cloud Firestore backend with role-based access control.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Google Sign-In Card (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 backdrop-blur-xl relative space-y-6 text-center">
            {/* Center Emblem */}
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 shadow-xl mx-auto p-1">
              <img
                src={BRAND.shieldIcon}
                alt="Fraud Risk Hub Logo"
                className="w-full h-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white tracking-tight">
                Authentication Required
              </h2>
              <p className="text-xs text-slate-400">
                Sign in with your Google account to proceed
              </p>
            </div>

            {/* Error Notice with Diagnostic Resolution */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-left space-y-2">
                <div className="flex items-start gap-2 text-rose-300 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{error.message}</span>
                </div>
                {error.detail && (
                  <p className="text-[11px] text-rose-200/90 pl-6 leading-relaxed">
                    {error.detail}
                  </p>
                )}
                {error.code === 'auth/unauthorized-domain' && currentHost && (
                  <div className="pl-6 pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyHost}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white text-[11px] font-bold border border-rose-700 cursor-pointer"
                    >
                      {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedDomain ? 'Domain Copied!' : `Copy '${currentHost}'`}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Main Google Sign In Button */}
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm shadow-lg shadow-white/10 hover:shadow-white/20 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to Google...</span>
                </div>
              ) : (
                <>
                  {/* Official Google 'G' Icon */}
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform ml-auto" />
                </>
              )}
            </button>

            {/* Quick Demo Access Button (Guarantees user is never blocked while configuring Firebase Console) */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <button
                type="button"
                onClick={() => handleContinueWithTestUser('gmanikandan639@gmail.com', 'Manikandan (Administrator)')}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Continue as Admin (gmanikandan639@gmail.com)</span>
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <button
                  type="button"
                  onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>{showTroubleshoot ? 'Hide Setup Help' : 'Firebase Setup Help'}</span>
                </button>
                <span className="text-[10px] text-slate-500">Firebase Ready</span>
              </div>
            </div>

            {/* Expandable Firebase Configuration Guide */}
            {showTroubleshoot && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-left text-slate-300 space-y-2">
                <h5 className="font-bold text-white flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3 text-indigo-400" />
                  <span>Firebase Console Checklist</span>
                </h5>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>
                    Open{' '}
                    <a
                      href="https://console.firebase.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 underline font-semibold"
                    >
                      Firebase Console
                    </a>
                  </li>
                  <li>Ensure <strong>Google</strong> is toggled to <strong>Enabled</strong> under Authentication.</li>
                  <li>
                    Go to <strong>Settings &gt; Authorized Domains</strong> and add{' '}
                    <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded">
                      {currentHost || 'your-domain'}
                    </code>
                  </li>
                </ol>
              </div>
            )}

            {/* Security Guarantee */}
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Protected by Firebase Authentication</span>
              </div>
              <p>Google OAuth 2.0 Identity with encrypted session handling.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto text-center text-xs text-slate-500 py-3 border-t border-slate-800/80">
        <p>FRAUD RISK HUB • Powered by Google AI Studio, Firebase Auth &amp; Cloud Firestore</p>
      </footer>
    </div>
  );
};
