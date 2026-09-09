/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ActiveNavPage, AdminSession, VisitorStats, LiveSyncStatus } from '../types';
import { BRAND } from '../assets/branding';
import {
  Search,
  Info,
  CheckCircle,
  LogOut,
  Lock,
  LayoutDashboard,
  Users,
  Radio,
  PlusCircle,
  Clock,
  ShieldAlert,
  User,
} from 'lucide-react';

interface HeaderProps {
  activePage: ActiveNavPage;
  onSelectPage: (page: ActiveNavPage) => void;
  recordCount?: number;
  isDemoData?: boolean;
  adminSession: AdminSession | null;
  googleUser?: any | null;
  onLogout: () => void;
  visitorStats?: VisitorStats;
  liveSyncStatus?: LiveSyncStatus;
  onOpenUserSubmit?: () => void;
  pendingApprovalsCount?: number;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onSelectPage,
  adminSession,
  googleUser,
  onLogout,
  visitorStats,
  liveSyncStatus = 'connected',
  onOpenUserSubmit,
  pendingApprovalsCount = 0,
  onOpenProfile,
}) => {
  return (
    <header
      id="main-header"
      className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo & Brand + Main Desktop Nav */}
          <div className="flex items-center gap-6">
            <button
              id="brand-logo-btn"
              onClick={() => onSelectPage('search')}
              className="flex items-center gap-3 group text-left focus:outline-hidden cursor-pointer"
            >
              <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md shadow-indigo-950/30 shrink-0 group-hover:scale-105 transition-transform">
                <img
                  src={BRAND.shieldIcon}
                  alt="Fraud Risk Hub Shield Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-xl pointer-events-none" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                    <span>FRAUD RISK HUB</span>
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                    RCU / FCU
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 hidden sm:block uppercase">
                  Detect • Analyze • Prevent
                </p>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-slate-200">
              <button
                id="desktop-nav-search"
                onClick={() => onSelectPage('search')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activePage === 'search'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Hunter Search</span>
              </button>
              <button
                id="desktop-nav-about"
                onClick={() => onSelectPage('about')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activePage === 'about'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>About Hub</span>
              </button>
            </nav>
          </div>

          {/* Right: Visitor Counter, Live Sync Status & Admin session info */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Live Sync Status indicator */}
            <div
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-600"
              title="Real-time Cloud Database synchronization active"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Radio className="w-3 h-3 text-indigo-600" />
              <span>Live Cloud Sync</span>
            </div>

            {/* Live Visitor Counter Badge */}
            {visitorStats && (
              <div
                id="header-visitor-counter"
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-xs text-slate-700 transition-colors shadow-2xs"
                title={`Unique Visitors: ${visitorStats.totalVisits.toLocaleString()} | Unique Today: ${visitorStats.todayVisits.toLocaleString()}`}
              >
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <span className="font-semibold text-[11px] text-slate-600">
                  Visitors: <strong className="font-mono font-bold text-slate-900">{visitorStats.totalVisits.toLocaleString()}</strong>
                </span>
              </div>
            )}

            {/* Admin Session or Admin Login Button */}
            {adminSession?.isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  id="admin-dashboard-btn"
                  onClick={() => onSelectPage('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                    activePage === 'admin'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/30'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                  }`}
                  title="Admin Dashboard (Full Control)"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Admin Portal</span>
                  {pendingApprovalsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </button>

                {onOpenProfile ? (
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    id="header-admin-profile-btn"
                    className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors cursor-pointer"
                    title={`Logged in as Admin: ${adminSession.name} (${adminSession.username}) - Click to view profile`}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                      M
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        {adminSession.name}
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider block">
                        Admin
                      </span>
                    </div>
                  </button>
                ) : (
                  <div
                    className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-left"
                    title={`Logged in as Admin: ${adminSession.name} (${adminSession.username})`}
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                      M
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        {adminSession.name}
                      </span>
                      <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider block">
                        Admin
                      </span>
                    </div>
                  </div>
                )}

                <button
                  id="header-logout-btn"
                  onClick={onLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                  title="Sign Out / Exit Admin Mode"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : googleUser ? (
              <div className="flex items-center gap-2">
                {onOpenProfile ? (
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    id="header-user-profile-btn"
                    className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 text-left transition-colors cursor-pointer"
                    title={`Signed in as: ${googleUser.displayName || googleUser.email} - Click to view profile`}
                  >
                    {googleUser.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt={googleUser.displayName || 'User'}
                        className="w-6 h-6 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                        {(googleUser.displayName || googleUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="hidden sm:block">
                      <span className="text-xs font-bold text-slate-900 block leading-tight max-w-[120px] truncate">
                        {googleUser.displayName || googleUser.email?.split('@')[0]}
                      </span>
                      <span className="text-[9px] font-semibold text-indigo-600 uppercase tracking-wider block">
                        My Profile
                      </span>
                    </div>
                  </button>
                ) : (
                  <div
                    className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-left"
                    title={`Signed in as: ${googleUser.displayName || googleUser.email}`}
                  >
                    {googleUser.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt={googleUser.displayName || 'User'}
                        className="w-6 h-6 rounded-full object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                        {(googleUser.displayName || googleUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="hidden sm:block">
                      <span className="text-xs font-bold text-slate-900 block leading-tight max-w-[120px] truncate">
                        {googleUser.displayName || googleUser.email?.split('@')[0]}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Google Auth
                      </span>
                    </div>
                  </div>
                )}

                <button
                  id="header-user-logout-btn"
                  onClick={onLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>

                <button
                  id="header-admin-portal-btn"
                  onClick={() => onSelectPage('admin')}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  title="Admin Portal"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="header-login-btn"
                  onClick={() => onSelectPage('admin')}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  title="Admin Portal (Authorized Personnel Only)"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Admin Portal</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 overflow-x-auto gap-1">
          <button
            id="mobile-nav-search"
            onClick={() => onSelectPage('search')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activePage === 'search'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-600'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
          <button
            id="mobile-nav-about"
            onClick={() => onSelectPage('about')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
              activePage === 'about'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-600'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>About</span>
          </button>
          {adminSession?.isAuthenticated ? (
            <button
              id="mobile-nav-admin"
              onClick={() => onSelectPage('admin')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap relative ${
                activePage === 'admin'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'text-indigo-600 bg-indigo-50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Admin</span>
              {pendingApprovalsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              )}
            </button>
          ) : (
            <button
              id="mobile-nav-login"
              onClick={() => onSelectPage('admin')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                activePage === 'login'
                  ? 'bg-indigo-50 text-indigo-700 font-bold'
                  : 'text-slate-600'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}
          {(googleUser || adminSession?.isAuthenticated) && onOpenProfile && (
            <button
              id="mobile-nav-profile"
              onClick={onOpenProfile}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap text-indigo-700 bg-indigo-50/80 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
