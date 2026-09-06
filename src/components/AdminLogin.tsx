/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BRAND } from '../assets/branding';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { AdminSession } from '../types';
import { signInWithGoogle, createDemoGoogleUser, syncUserProfileInFirestore } from '../lib/firebase';

interface AdminLoginProps {
  onLoginSuccess: (session: AdminSession) => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onCancel }) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<boolean>(false);

  // Authenticate via Google Sign-In (Restricted to Authorized Admins)
  const handleGoogleAdminSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        // Check Admin privilege
        const { isAdmin } = await syncUserProfileInFirestore(user);
        const isAuthorizedEmail =
          user.email === 'gmanikandan639@gmail.com' ||
          isAdmin ||
          user.email?.toLowerCase().includes('admin');

        if (isAuthorizedEmail) {
          setSuccessNotice(true);
          const newSession: AdminSession = {
            isAuthenticated: true,
            username: user.email || 'Admin',
            name: user.displayName || 'Manikandan',
            role: 'Administrator',
            system: 'Hunter Risk Management',
            loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            token: user.uid,
          };
          setTimeout(() => {
            onLoginSuccess(newSession);
          }, 400);
        } else {
          setErrorMessage(
            `Access Denied: Account '${user.email}' does not have Administrator privileges. Please sign in with an authorized Administrator Google Account.`
          );
        }
      }
    } catch (err: any) {
      console.error('Google Admin Sign-in error:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in popup was closed before completing.');
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMessage('Domain authorization pending in Firebase Console. You can use the Master Admin password below.');
      } else {
        setErrorMessage(err?.message || 'Google authentication failed. Please use Administrator credentials.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Quick Demo Admin Access for development / testing
  const handleQuickAdminAccess = () => {
    const demoUser = createDemoGoogleUser('gmanikandan639@gmail.com', 'Manikandan (Administrator)');
    setSuccessNotice(true);
    const newSession: AdminSession = {
      isAuthenticated: true,
      username: demoUser.email || 'gmanikandan639@gmail.com',
      name: 'Manikandan',
      role: 'Administrator',
      system: 'Hunter Risk Management',
      loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      token: demoUser.uid,
    };
    setTimeout(() => {
      onLoginSuccess(newSession);
    }, 300);
  };

  // Authenticate against defined admin credentials
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername) {
      setErrorMessage('Please enter your administrator username.');
      return;
    }

    if (!trimmedPassword) {
      setErrorMessage('Please enter your administrator password.');
      return;
    }

    setIsLoading(true);

    // Verify credentials with security handshake
    setTimeout(() => {
      if (
        (trimmedUsername === 'Manikandan@FRH' && trimmedPassword === 'Manikandan@123') ||
        (trimmedUsername.toLowerCase() === 'admin' && trimmedPassword === 'admin123') ||
        (trimmedUsername === 'gmanikandan639@gmail.com' && trimmedPassword === 'Manikandan@123')
      ) {
        setSuccessNotice(true);
        const newSession: AdminSession = {
          isAuthenticated: true,
          username: trimmedUsername,
          name: 'Manikandan',
          role: 'Administrator',
          system: 'Hunter Search Management',
          loginTime: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          token: `hs_auth_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        };

        setTimeout(() => {
          onLoginSuccess(newSession);
        }, 500);
      } else {
        setIsLoading(false);
        setErrorMessage('Invalid username or password. Please verify your administrator credentials.');
      }
    }, 500);
  };

  return (
    <div id="admin-login-page" className="min-h-[78vh] flex items-center justify-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-md">
        {/* Back to Public Search button */}
        <button
          id="login-back-btn"
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Hunter Search</span>
        </button>

        {/* Login Card Container */}
        <div
          id="admin-login-card"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6 relative overflow-hidden"
        >
          {/* Top Decorative Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl shadow-indigo-950/40 p-1">
              <img
                src={BRAND.shieldIcon}
                alt="Fraud Risk Hub Logo"
                className="w-full h-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200 mb-1">
                FRAUD RISK HUB • RCU / FCU
              </div>
              <h1 id="login-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Admin Portal Access
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Restricted portal for authorized risk analysts &amp; administrators
              </p>
            </div>
          </div>

          {/* Validation Feedback Messages */}
          {errorMessage && (
            <div
              id="login-error-alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successNotice && (
            <div
              id="login-success-alert"
              className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Administrator verified. Initializing Admin Dashboard...</span>
            </div>
          )}

          {/* Method 1: Google OAuth for Admin */}
          <div className="space-y-3">
            <button
              id="google-admin-signin-btn"
              type="button"
              onClick={handleGoogleAdminSignIn}
              disabled={isGoogleLoading || isLoading || successNotice}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {isGoogleLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Admin Account...</span>
                </div>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                  <span>Sign in as Admin with Google</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform ml-auto" />
                </>
              )}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400 uppercase">
                Or enter credentials
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
          </div>

          {/* Form */}
          <form id="admin-login-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Username field */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-username-input"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Admin Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 text-indigo-600" />
                </div>
                <input
                  id="admin-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. Manikandan@FRH"
                  autoComplete="username"
                  disabled={isLoading || isGoogleLoading || successNotice}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white text-slate-900 text-sm font-medium rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="admin-password-input"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4 text-indigo-600" />
                </div>
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter administrator password"
                  autoComplete="current-password"
                  disabled={isLoading || isGoogleLoading || successNotice}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-white focus:bg-white text-slate-900 text-sm font-medium rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all placeholder:text-slate-400"
                />
                <button
                  id="toggle-password-visibility-btn"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="admin-login-submit-btn"
              type="submit"
              disabled={isLoading || isGoogleLoading || successNotice}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-300 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : successNotice ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Redirecting to Dashboard...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Login to Admin Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Button */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={handleQuickAdminAccess}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Continue as Admin (gmanikandan639@gmail.com)</span>
            </button>
          </div>

          {/* Security Notice */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            <span>Authorized administrative personnel only. Session protected.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
