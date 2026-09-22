/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BRAND } from '../assets/branding';
import {
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { AdminSession } from '../types';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
  syncUserProfileInFirestore,
} from '../lib/firebase';

export interface AdminLoginProps {
  onLoginSuccess: (session: AdminSession) => void;
  onUserLoginSuccess?: (user: any) => void;
  onCancel?: () => void;
  pendingNotice?: { title: string; description: string } | null;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onUserLoginSuccess,
  onCancel,
  pendingNotice,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Form Fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset messages when switching modes
  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
    setPhoneNumber('');
  };

  // Helper to complete user authentication and dispatch to appropriate dashboard
  const handleAuthCompleted = (user: any, profile: { isAdmin: boolean; role: string; name: string }) => {
    if (profile.role === 'admin' || profile.isAdmin) {
      const adminSession: AdminSession = {
        isAuthenticated: true,
        username: user.email || 'Admin',
        name: profile.name || user.displayName || 'Administrator',
        role: 'Administrator',
        system: 'Hunter Risk Management',
        loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        token: user.uid,
      };
      setSuccessMessage('Administrator verified. Opening Admin Dashboard...');
      setTimeout(() => {
        onLoginSuccess(adminSession);
      }, 50);
    } else {
      setSuccessMessage('Authentication successful. Opening Hunter Verification...');
      setTimeout(() => {
        if (onUserLoginSuccess) {
          onUserLoginSuccess(user);
        } else {
          // Fallback if prop not provided
          onLoginSuccess({
            isAuthenticated: false,
            username: user.email || 'User',
            name: profile.name || user.displayName || 'User',
            role: 'User',
            system: 'Hunter Verification',
            loginTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            token: user.uid,
          });
        }
      }, 50);
    }
  };

  // 1. Google Authentication
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        const profile = await syncUserProfileInFirestore(user);
        handleAuthCompleted(user, profile);
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMessage('Google sign-in was cancelled before completion.');
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMessage('Google Sign-In is not authorized for this domain. Please sign in with Email & Password below.');
      } else {
        setErrorMessage('Google authentication could not be completed. Please try again or use Email & Password.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 2. Email Login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setErrorMessage('Email or Login ID is required.');
      return;
    }
    const isFrhLoginId = /^([a-zA-Z0-9._%+-]+)@frh$/i.test(cleanEmail);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!isFrhLoginId && !emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address or Login ID.');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Password is required.');
      return;
    }

    setIsLoading(true);

    try {
      const { user, profile } = await signInWithEmail(cleanEmail, cleanPass);
      handleAuthCompleted(user, profile);
    } catch (err: any) {
      console.warn('Email sign in error:', err?.code, err?.message);
      const code = err?.code || '';
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        setErrorMessage('Invalid email or password.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMessage('Too many failed login attempts. Please try again in a few moments or reset your password.');
      } else {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      }
      setIsLoading(false);
    }
  };

  // 3. Email Sign Up (Registration)
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phoneNumber.trim();
    const cleanPass = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanName) {
      setErrorMessage('Full Name is required.');
      return;
    }
    if (!cleanEmail) {
      setErrorMessage('Email Address is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    // Mobile number is strictly optional. If provided, validate standard digits
    if (cleanPhone && !/^[+]?[\d\s-]{7,15}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid mobile number or leave it blank.');
      return;
    }
    if (!cleanPass) {
      setErrorMessage('Password is required.');
      return;
    }
    if (cleanPass.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      setErrorMessage('Confirm Password must match Password.');
      return;
    }

    setIsLoading(true);

    try {
      const { user, profile } = await signUpWithEmail(
        cleanName,
        cleanEmail,
        cleanPass,
        cleanPhone || undefined
      );
      handleAuthCompleted(user, profile);
    } catch (err: any) {
      console.warn('Email sign up error:', err?.code, err?.message);
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Please use at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('Please enter a valid email address.');
      } else {
        setErrorMessage('Failed to create account. Please try again.');
      }
      setIsLoading(false);
    }
  };

  // 4. Password Reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address to receive reset instructions.');
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordReset(cleanEmail);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      console.warn('Password reset note:', err);
      setSuccessMessage('If an account exists with this email, reset instructions have been sent.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth-page-container" className="w-full max-w-5xl mx-auto flex items-center justify-center py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      {/* Main Authentication Card: 2-Column Responsive Layout (50% Image Left, 50% Login Form Right) */}
      <div
        id="auth-card"
        className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-900/10 overflow-hidden grid grid-cols-1 lg:grid-cols-2"
      >
        {/* =============================================================== */}
        {/* SECTION 1: LEFT SIDE – USER UPLOADED BANNER IMAGE (~50% DESKTOP) */}
        {/* =============================================================== */}
        <div
          id="login-left-image-section"
          className="relative w-full h-48 sm:h-64 lg:h-auto min-h-[200px] lg:min-h-[620px] bg-slate-950 flex flex-col justify-between overflow-hidden"
        >
          {BRAND.loginBanner ? (
            <img
              id="login-banner-image"
              src={BRAND.loginBanner}
              alt="Fraud Risk Hub Banner"
              className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-950 border border-indigo-700 p-2 flex items-center justify-center mb-4">
                <img src={BRAND.shieldIcon} alt="Shield" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-lg font-black tracking-tight">{BRAND.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{BRAND.tagline}</p>
            </div>
          )}

          {/* Visual gradient overlay for clean integration */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/20 pointer-events-none" />

          {/* Desktop & Tablet Lower Caption Badge */}
          <div className="absolute bottom-4 left-4 right-4 z-10 hidden sm:flex items-center justify-between text-white/95 backdrop-blur-md bg-slate-950/75 py-2.5 px-4 rounded-2xl border border-white/15 text-[11px] shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-extrabold tracking-wide">Enterprise Fraud Prevention</span>
            </div>
            <span className="text-slate-300 text-[10px] font-mono tracking-wider font-semibold">
              DETECT • ANALYZE • PREVENT
            </span>
          </div>
        </div>

        {/* =============================================================== */}
        {/* SECTION 2: RIGHT SIDE – LOGIN FUNCTIONALITY (~50% DESKTOP) */}
        {/* =============================================================== */}
        <div
          id="login-right-form-section"
          className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center space-y-6 relative overflow-hidden"
        >
          {/* Branding Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg shadow-indigo-950/40 p-1 flex items-center justify-center">
              <img
                src={BRAND.shieldIcon}
                alt="Fraud Risk Hub Logo"
                className="w-full h-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-1">
                FRAUD RISK HUB • RCU / FCU
              </div>
              <h1 id="auth-main-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                HUNTER VERIFICATION
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'login' && 'Sign in to access Hunter Verification'}
                {mode === 'signup' && 'Register an account to access Hunter Verification'}
                {mode === 'forgot' && 'Reset your password to regain account access'}
              </p>
            </div>
          </div>

          {/* Pending Action Notice (Contribute / Update Gate) */}
          {pendingNotice && (
            <div
              id="auth-pending-action-notice"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200/90 text-xs text-indigo-950 shadow-2xs"
            >
              <Info className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-extrabold text-indigo-900">{pendingNotice.title}</p>
                <p className="text-slate-600 leading-relaxed">{pendingNotice.description}</p>
              </div>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMessage && (
            <div
              id="auth-error-alert"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div
              id="auth-success-alert"
              className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* =============================================================== */}
          {/* MODE 1: LOGIN (Email + Password, Google, Register link) */}
          {/* =============================================================== */}
          {mode === 'login' && (
            <div className="space-y-4">
              <form id="email-login-form" onSubmit={handleEmailLogin} className="space-y-3.5">
                <div className="space-y-1">
                  <label
                    htmlFor="email-input"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Email or Login ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      id="email-input"
                      type="text"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="name@company.com or Login ID"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password-input"
                      className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <button
                      id="forgot-password-link"
                      type="button"
                      onClick={() => handleSwitchMode('forgot')}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      id="password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={isLoading || isGoogleLoading || !!successMessage}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <span>LOGIN</span>
                  )}
                </button>
              </form>

              {/* OR Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  OR
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Continue with Google Button */}
              <button
                id="google-signin-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading || !!successMessage}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs shadow-xs hover:border-slate-400 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isGoogleLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>Connecting Google...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Register Switch Link */}
              <div className="pt-2 text-center border-t border-slate-100">
                <span className="text-xs text-slate-500">Don't have an account? </span>
                <button
                  id="create-account-link"
                  type="button"
                  onClick={() => handleSwitchMode('signup')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  Register
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MODE 2: REGISTER (Full Name, Email, Password, Confirm, Google) */}
          {/* =============================================================== */}
          {mode === 'signup' && (
            <div className="space-y-4">
              <form id="signup-form" onSubmit={handleEmailSignUp} className="space-y-3.5">
                <div className="space-y-1">
                  <label
                    htmlFor="signup-name-input"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      id="signup-name-input"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="signup-email-input"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      id="signup-email-input"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="name@company.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Optional Mobile Number */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="signup-phone-input"
                      className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Mobile Number
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">Optional</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      id="signup-phone-input"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="+91 98765 43210 (Optional)"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="signup-password-input"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      id="signup-password-input"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="signup-confirm-password-input"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </div>
                    <input
                      id="signup-confirm-password-input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Confirm your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  id="signup-submit-btn"
                  type="submit"
                  disabled={isLoading || isGoogleLoading || !!successMessage}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    <span>REGISTER</span>
                  )}
                </button>
              </form>

              {/* OR Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  OR
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Continue with Google Button */}
              <button
                id="google-signup-btn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading || !!successMessage}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs shadow-xs hover:border-slate-400 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isGoogleLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>Connecting Google...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Login Switch Link */}
              <div className="pt-2 text-center border-t border-slate-100">
                <span className="text-xs text-slate-500">Already have an account? </span>
                <button
                  id="back-to-login-link"
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  Login
                </button>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* MODE 3: FORGOT PASSWORD */}
          {/* =============================================================== */}
          {mode === 'forgot' && (
            <form id="forgot-password-form" onSubmit={handlePasswordReset} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Enter your registered email address and we'll send a link to reset your password.
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reset-email-input"
                  className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    id="reset-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all outline-none"
                  />
                </div>
              </div>

              <button
                id="send-reset-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Reset Link...</span>
                  </div>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>

              <div className="pt-2 text-center border-t border-slate-100">
                <button
                  id="reset-back-to-login-link"
                  type="button"
                  onClick={() => handleSwitchMode('login')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
