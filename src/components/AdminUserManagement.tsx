/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  KeyRound,
  ShieldCheck,
  User,
  Mail,
  ShieldAlert,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Filter,
  Lock,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { FirestoreUserProfile, AdminSession } from '../types';
import { sendPasswordReset, updateUserStatusInFirestore, updateUserRoleInFirestore } from '../lib/firebase';

interface AdminUserManagementProps {
  users: FirestoreUserProfile[];
  adminSession: AdminSession | null;
  currentAdminEmail?: string;
  onTriggerToast: (toast: {
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
    subtext?: string;
  }) => void;
  onRefreshUsers?: () => void;
}

export const AdminUserManagement: React.FC<AdminUserManagementProps> = ({
  users,
  adminSession,
  currentAdminEmail,
  onTriggerToast,
  onRefreshUsers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'google' | 'password'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Password reset modal state
  const [resetTargetUser, setResetTargetUser] = useState<FirestoreUserProfile | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Copy Login ID helper
  const handleCopyLoginId = (email: string, id: string) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Trigger secure Password Reset email
  const handleConfirmPasswordReset = async () => {
    if (!resetTargetUser || !resetTargetUser.email) return;
    setIsResetting(true);
    try {
      await sendPasswordReset(resetTargetUser.email);
      onTriggerToast({
        type: 'success',
        title: 'Password Reset Dispatched',
        message: `Secure password reset link sent to ${resetTargetUser.email}.`,
        subtext: 'The user will receive an email with instructions to securely set a new password. Existing credentials are never revealed.',
      });
      setResetTargetUser(null);
    } catch (err: any) {
      console.warn('Password reset failed:', err);
      onTriggerToast({
        type: 'error',
        title: 'Reset Trigger Notice',
        message: err?.message || 'Unable to trigger password reset. Please verify network or user account.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Toggle user status (Active / Suspended)
  const handleToggleStatus = async (targetUser: FirestoreUserProfile) => {
    const isSelf =
      targetUser.email?.toLowerCase() === currentAdminEmail?.toLowerCase() ||
      targetUser.email?.toLowerCase() === adminSession?.username?.toLowerCase();

    if (isSelf) {
      onTriggerToast({
        type: 'warning',
        title: 'Action Restricted',
        message: 'You cannot suspend your own active administrator account.',
      });
      return;
    }

    const newStatus = targetUser.status === 'Suspended' ? 'Active' : 'Suspended';
    try {
      await updateUserStatusInFirestore(targetUser.uid, newStatus);
      onTriggerToast({
        type: 'success',
        title: 'Status Updated',
        message: `Account status for ${targetUser.name || targetUser.email} changed to ${newStatus}.`,
      });
    } catch (err: any) {
      onTriggerToast({
        type: 'error',
        title: 'Update Error',
        message: err?.message || 'Failed to update account status in Firestore.',
      });
    }
  };

  // Toggle role (Admin / User)
  const handleToggleRole = async (targetUser: FirestoreUserProfile) => {
    const isSelf =
      targetUser.email?.toLowerCase() === currentAdminEmail?.toLowerCase() ||
      targetUser.email?.toLowerCase() === adminSession?.username?.toLowerCase();

    if (isSelf) {
      onTriggerToast({
        type: 'warning',
        title: 'Action Restricted',
        message: 'You cannot alter the role of your own active administrator account.',
      });
      return;
    }

    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      await updateUserRoleInFirestore(targetUser.uid, newRole);
      onTriggerToast({
        type: 'success',
        title: 'Role Updated',
        message: `${targetUser.name || targetUser.email} has been set to ${newRole === 'admin' ? 'Administrator' : 'Standard User'}.`,
      });
    } catch (err: any) {
      onTriggerToast({
        type: 'error',
        title: 'Update Error',
        message: err?.message || 'Failed to update user role in Firestore.',
      });
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (u.name || '').toLowerCase().includes(q);
        const matchEmail = (u.email || '').toLowerCase().includes(q);
        const matchUid = (u.uid || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchUid) return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        const uRole = u.role === 'admin' ? 'admin' : 'user';
        if (uRole !== roleFilter) return false;
      }

      // Method filter
      if (methodFilter !== 'all') {
        const isGoogle =
          u.auth_provider === 'google.com' ||
          u.provider === 'google.com' ||
          (u.email && u.email.endsWith('@gmail.com') && u.auth_provider !== 'password');

        if (methodFilter === 'google' && !isGoogle) return false;
        if (methodFilter === 'password' && isGoogle) return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const uStatus = (u.status || 'Active').toLowerCase();
        if (statusFilter === 'active' && uStatus !== 'active') return false;
        if (statusFilter === 'suspended' && uStatus !== 'suspended') return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, methodFilter, statusFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let googleCount = 0;
    let passwordCount = 0;
    let adminCount = 0;
    let activeCount = 0;

    users.forEach((u) => {
      const isGoogle =
        u.auth_provider === 'google.com' ||
        u.provider === 'google.com' ||
        (u.email && u.email.endsWith('@gmail.com') && u.auth_provider !== 'password');

      if (isGoogle) googleCount++;
      else passwordCount++;

      if (u.role === 'admin') adminCount++;
      if ((u.status || 'Active').toLowerCase() === 'active') activeCount++;
    });

    return {
      total: users.length,
      googleCount,
      passwordCount,
      adminCount,
      activeCount,
    };
  }, [users]);

  // Export Users to CSV (STRICT ZERO-PASSWORD COMPLIANCE)
  const handleExportUsersCSV = () => {
    if (filteredUsers.length === 0) {
      onTriggerToast({
        type: 'warning',
        title: 'Export Empty',
        message: 'No user accounts match current filters to export.',
      });
      return;
    }

    // Explicitly safe headers without password or hash fields
    const headers = [
      'User Name',
      'Login ID / Email',
      'Authentication Method',
      'Role',
      'Account Status',
      'Account Created Date',
      'Firebase UID',
    ];

    const rows = filteredUsers.map((u) => {
      const isGoogle =
        u.auth_provider === 'google.com' ||
        u.provider === 'google.com' ||
        (u.email && u.email.endsWith('@gmail.com') && u.auth_provider !== 'password');
      const methodStr = isGoogle ? 'Google' : 'Email & Password';
      const roleStr = u.role === 'admin' ? 'Admin' : 'User';
      const statusStr = u.status || 'Active';
      const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A';

      const escapeCSV = (val: string) => `"${(val || '').replace(/"/g, '""')}"`;

      return [
        escapeCSV(u.name || 'User'),
        escapeCSV(u.email || ''),
        escapeCSV(methodStr),
        escapeCSV(roleStr),
        escapeCSV(statusStr),
        escapeCSV(dateStr),
        escapeCSV(u.uid || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `registered_users_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onTriggerToast({
      type: 'success',
      title: 'Users Exported',
      message: `Exported ${filteredUsers.length} user records to CSV securely.`,
      subtext: 'Zero-knowledge guarantee: No passwords, hashes, or tokens are ever exported.',
    });
  };

  return (
    <div id="admin-user-management" className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                User Account & Login Directory
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Admin Only
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Admin view of registered users, Login IDs, login methods, account status, and credential recovery.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshUsers && (
            <button
              type="button"
              onClick={onRefreshUsers}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Refresh Users List from Firestore"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportUsersCSV}
            className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export Registered Users Directory to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Users CSV</span>
          </button>
        </div>
      </div>

      {/* Zero-Knowledge Security Notice */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5 sm:mt-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
              <span>Zero-Knowledge Password Security Standard</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-200/70 text-emerald-900">
                Encrypted Auth
              </span>
            </h4>
            <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
              User passwords and password hashes are never stored in readable format, database collections, or application memory. Authentication is handled securely by Firebase Authentication. Administrators cannot view or retrieve plain passwords.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 shrink-0 bg-white/70 px-3 py-1.5 rounded-xl border border-emerald-200">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Passwords Concealed</span>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Registered</div>
          <div className="text-xl font-black text-slate-900 mt-1">{metrics.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">User accounts</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Google OAuth</div>
          <div className="text-xl font-black text-indigo-600 mt-1">{metrics.googleCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Instant sign-in</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email & Password</div>
          <div className="text-xl font-black text-slate-800 mt-1">{metrics.passwordCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Credential accounts</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Status</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{metrics.activeCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Permitted access</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Administrators</div>
          <div className="text-xl font-black text-amber-600 mt-1">{metrics.adminCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Full privilege</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by User Name or Login ID / Email..."
            className="w-full pl-9 pr-4 py-2 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="user">Standard Users</option>
          </select>

          {/* Login Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Login Methods</option>
            <option value="google">Google</option>
            <option value="password">Email & Password</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          {(searchQuery || roleFilter !== 'all' || methodFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setMethodFilter('all');
                setStatusFilter('all');
              }}
              className="px-2.5 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-extrabold text-[10px]">
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Login ID (Email)</th>
                <th className="py-3 px-4">Login Method</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Account Created Date</th>
                <th className="py-3 px-4 text-right">Actions / Password Security</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-600">No user accounts found</p>
                      <p className="text-[11px] text-slate-400">Try adjusting search query or active filter selections.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isGoogle =
                    u.auth_provider === 'google.com' ||
                    u.provider === 'google.com' ||
                    (u.email && u.email.endsWith('@gmail.com') && u.auth_provider !== 'password');
                  const roleIsAdmin = u.role === 'admin';
                  const isActive = (u.status || 'Active').toLowerCase() === 'active';

                  const formattedDate = u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Recent';

                  return (
                    <tr
                      key={u.uid}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* User Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {(u.name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">
                              {u.name || 'User'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              UID: {u.uid.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Login ID / Email ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-slate-800 text-[11px]">
                            {u.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLoginId(u.email, u.uid)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Copy Login ID"
                          >
                            {copiedId === u.uid ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Login Method */}
                      <td className="py-3.5 px-4">
                        {isGoogle ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            <svg className="w-3 h-3" viewBox="0 0 24 24">
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
                            <span>Google</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>Email & Password</span>
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {roleIsAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>User</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>Suspended</span>
                          </span>
                        )}
                      </td>

                      {/* Account Created Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* Actions / Password Security */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isGoogle ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200 select-none"
                              title="Google Account authentication is managed by Google OAuth. Local password reset is not applicable."
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>Google Account</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setResetTargetUser(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 transition-colors cursor-pointer shadow-2xs"
                              title={`Trigger secure password reset email to ${u.email}`}
                            >
                              <KeyRound className="w-3 h-3 text-indigo-600" />
                              <span>Reset Password</span>
                            </button>
                          )}

                          {/* Quick Admin Actions: Toggle status & role */}
                          <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                isActive
                                  ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              }`}
                              title={isActive ? 'Suspend account access' : 'Activate account access'}
                            >
                              {isActive ? 'Suspend' : 'Activate'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleRole(u)}
                              className="px-2 py-1 rounded text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors cursor-pointer"
                              title={`Switch role to ${roleIsAdmin ? 'user' : 'admin'}`}
                            >
                              {roleIsAdmin ? 'Make User' : 'Make Admin'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
            <span>Admin-only account directory. Passwords are never revealed, exported, or readable.</span>
          </div>
          <div className="font-semibold text-slate-600">
            Showing {filteredUsers.length} of {users.length} registered accounts
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Password Reset */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-black text-slate-900">
                Trigger Password Reset
              </h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to dispatch a secure password reset email for:
              </p>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-slate-900 break-all">
                {resetTargetUser.email}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-[11px] text-indigo-900 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span>Zero-Knowledge Security Flow</span>
              </div>
              <p>
                A time-limited password recovery link will be sent to the user&apos;s registered email. The user can securely choose a new password without existing credentials ever being exposed to anyone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setResetTargetUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmPasswordReset}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isResetting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Send Reset Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
