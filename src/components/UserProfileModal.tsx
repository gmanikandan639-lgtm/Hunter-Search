/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  User,
  Mail,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Edit2,
  Save,
  LogOut,
  Building2,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ManualHunterRecord } from '../types';
import { updateUserProfileInFirestore } from '../lib/firebase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  userRole: 'admin' | 'user';
  userSubmissions: ManualHunterRecord[];
  onLogout: () => void;
  onOpenSubmitNew?: () => void;
  onProfileUpdated?: (newName: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userRole,
  userSubmissions,
  onLogout,
  onOpenSubmitNew,
  onProfileUpdated,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(
    currentUser?.displayName || currentUser?.name || currentUser?.email?.split('@')[0] || 'User'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);
  const [submissionsFilter, setSubmissionsFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  if (!isOpen || !currentUser) return null;

  const isAdmin = userRole === 'admin';
  const mySubmissions = userSubmissions.filter(
    (s) => s.submittedBy?.email === currentUser.email || s.createdBy === currentUser.email || (s as any).submittedBy === currentUser.uid
  );

  const filteredSubmissions = mySubmissions.filter((s) => {
    const status = s.approvalStatus || 'pending';
    if (submissionsFilter === 'all') return true;
    return status === submissionsFilter;
  });

  const handleCopyUid = () => {
    if (currentUser?.uid) {
      navigator.clipboard.writeText(currentUser.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleSaveName = async () => {
    if (!displayName.trim() || !currentUser.uid) return;
    setIsSaving(true);
    try {
      await updateUserProfileInFirestore(currentUser.uid, { name: displayName.trim() });
      setIsEditingName(false);
      setSaveSuccess(true);
      if (onProfileUpdated) {
        onProfileUpdated(displayName.trim());
      }
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update profile name:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="user-profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="user-profile-modal-dialog"
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/90 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">User Account Profile</h3>
              <p className="text-xs text-slate-500 font-medium">
                Hunter Verification Security Credentials & Contributions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Top Profile Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200/80 flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative shrink-0">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={displayName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md shadow-indigo-950/10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-indigo-600/30">
                  {displayName[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white ${
                  isAdmin ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}
                title={isAdmin ? 'Administrator Access' : 'Standard Risk Analyst'}
              >
                {isAdmin ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-1.5 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="px-3 py-1 text-sm font-bold text-slate-900 bg-white border border-indigo-400 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-100"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={isSaving}
                      className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                      title="Save Name"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h4 className="text-lg font-black text-slate-900">{displayName}</h4>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(true)}
                      className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-white transition-colors cursor-pointer"
                      title="Edit Display Name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {saveSuccess && (
                      <span className="text-[11px] font-bold text-emerald-600 animate-in fade-in">
                        ✓ Saved
                      </span>
                    )}
                  </div>
                )}

                {/* Role Pill */}
                <div>
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      Administrator
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      Risk Analyst / Standard User
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-600 font-medium">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentUser.email}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Google Verified
                </span>
              </div>
            </div>
          </div>

          {/* Account Security & RBAC Specifications */}
          <div className="space-y-3">
            <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Account & Security Specifications</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Firebase User UID
                </div>
                <div className="flex items-center justify-between gap-2 font-mono text-[11px] font-semibold text-slate-800 break-all">
                  <span className="truncate">{currentUser.uid}</span>
                  <button
                    type="button"
                    onClick={handleCopyUid}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
                    title="Copy UID"
                  >
                    {copiedUid ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Role Enforcement
                </div>
                <div className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cloud Firestore Security Rules (RBAC)</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Role Modification Policy:</strong> Account permissions and roles are
                authoritatively assigned in Firestore database records (<code className="font-mono font-bold">users/{'{uid}'}.role</code>). Roles cannot be self-modified by standard accounts.
              </div>
            </div>
          </div>

          {/* Section: My Submissions & Proposals */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  My Submitted Records & Updates ({mySubmissions.length})
                </h5>
              </div>
              {onOpenSubmitNew && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSubmitNew();
                  }}
                  className="text-xs font-extrabold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  + Propose Record
                </button>
              )}
            </div>

            {/* Submissions Filter Pills */}
            <div className="flex items-center gap-1.5 text-xs">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSubmissionsFilter(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                    submissionsFilter === tab
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-6 px-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 space-y-1">
                <p className="font-semibold">No {submissionsFilter !== 'all' ? submissionsFilter : ''} submissions found</p>
                <p className="text-[11px] text-slate-400">
                  You can submit new Hunter identifiers or propose updates from the Hunter Search interface.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredSubmissions.map((sub) => {
                  const status = sub.approvalStatus || 'pending';
                  const isPending = status === 'pending';
                  const isApproved = status === 'approved';
                  const isRejected = status === 'rejected';

                  return (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 truncate">
                            {sub.hunterId || (sub as any).identifier || sub.id}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                              sub.isUpdateRequest
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {sub.isUpdateRequest ? 'Update Request' : 'New Identifier'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{sub.bankName || 'Financial Entity'}</span>
                          <span>•</span>
                          <span>{sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'Recent'}</span>
                        </div>
                        {isRejected && sub.rejectionReason && (
                          <div className="text-[10px] text-rose-600 font-medium pt-0.5">
                            Reason: {sub.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* Status Tag */}
                      <div className="shrink-0">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Pending Admin Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved & Live
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="px-3.5 py-2 rounded-xl text-rose-700 hover:bg-rose-50 border border-rose-200/80 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
