/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ManualHunterRecord,
  AdminSession,
  ApprovalStatus,
} from '../types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building2,
  User,
  Mail,
  FileText,
  AlertTriangle,
  Edit3,
  Trash2,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Copy,
  ExternalLink,
  Filter,
  Layers,
} from 'lucide-react';
import { AddManualRecordModal, ManualRecordInput } from './AddManualRecordModal';

interface AdminApprovalsManagerProps {
  submissions: ManualHunterRecord[];
  adminSession: AdminSession;
  uniqueBanks: string[];
  currentHeaders?: string[];
  onApproveSubmission: (
    submissionId: string,
    adminName: string,
    adjustedData?: Partial<ManualHunterRecord>
  ) => Promise<void> | void;
  onRejectSubmission: (
    submissionId: string,
    adminName: string,
    reason: string
  ) => Promise<void> | void;
  onDeleteSubmission?: (submissionId: string) => Promise<void> | void;
}

export const AdminApprovalsManager: React.FC<AdminApprovalsManagerProps> = ({
  submissions,
  adminSession,
  uniqueBanks,
  currentHeaders = [],
  onApproveSubmission,
  onRejectSubmission,
  onDeleteSubmission,
}) => {
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'new' | 'update'>('all');

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingRecord, setRejectingRecord] = useState<ManualHunterRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editingRecord, setEditingRecord] = useState<ManualHunterRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status counts
  const pendingCount = useMemo(
    () => submissions.filter((s) => s.approvalStatus === 'pending').length,
    [submissions]
  );
  const approvedCount = useMemo(
    () => submissions.filter((s) => s.approvalStatus === 'approved' || !s.approvalStatus).length,
    [submissions]
  );
  const rejectedCount = useMemo(
    () => submissions.filter((s) => s.approvalStatus === 'rejected').length,
    [submissions]
  );

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      // 1. Status filter
      const itemStatus: ApprovalStatus = item.approvalStatus || 'approved';
      if (filterStatus !== 'all' && itemStatus !== filterStatus) {
        return false;
      }

      // 2. Type filter
      if (filterType === 'new' && item.isUpdateRequest) return false;
      if (filterType === 'update' && !item.isUpdateRequest) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchHunterId = (item.hunterId || '').toLowerCase().includes(q);
        const matchBank = (item.bankName || '').toLowerCase().includes(q);
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchRemarks = (item.remarks || item.notes || '').toLowerCase().includes(q);
        const matchSubmitterName = (item.submittedBy?.name || item.createdBy || '')
          .toLowerCase()
          .includes(q);
        const matchSubmitterEmail = (item.submittedBy?.email || '').toLowerCase().includes(q);
        const matchSubmitterDept = (item.submittedBy?.department || '').toLowerCase().includes(q);

        return (
          matchHunterId ||
          matchBank ||
          matchName ||
          matchRemarks ||
          matchSubmitterName ||
          matchSubmitterEmail ||
          matchSubmitterDept
        );
      }

      return true;
    });
  }, [submissions, filterStatus, filterType, searchQuery]);

  const handleApprove = async (record: ManualHunterRecord) => {
    setProcessingId(record.id);
    try {
      await onApproveSubmission(
        record.id,
        adminSession.name || 'Administrator',
        undefined
      );
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRecord) return;
    setProcessingId(rejectingRecord.id);
    try {
      await onRejectSubmission(
        rejectingRecord.id,
        adminSession.name || 'Administrator',
        rejectionReason.trim() || 'Record does not meet verification requirements'
      );
      setRejectingRecord(null);
      setRejectionReason('');
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div id="admin-approvals-manager" className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Status Summary Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                User Submissions & Admin Approval Queue
              </h2>
              {pendingCount > 0 && (
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-xs animate-pulse">
                  {pendingCount} Pending Review
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Review and approve Hunter Identifiers submitted by front-end users. Once approved, records <strong>instantly become searchable live across all users</strong> via real-time Cloud Firestore.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Total in Queue:</span>
            <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
              {submissions.length} Records
            </span>
          </div>
        </div>

        {/* Status Tab Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              filterStatus === 'pending'
                ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/30'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-950 mt-1">{pendingCount}</div>
            <p className="text-[10px] text-amber-700 font-medium">Awaiting decision</p>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('approved')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              filterStatus === 'approved'
                ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/30'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold uppercase tracking-wider">Approved & Live</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950 mt-1">{approvedCount}</div>
            <p className="text-[10px] text-emerald-700 font-medium">Active in Hunter search</p>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('rejected')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              filterStatus === 'rejected'
                ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-400/30'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-rose-800">
              <span className="text-xs font-bold uppercase tracking-wider">Rejected</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-950 mt-1">{rejectedCount}</div>
            <p className="text-[10px] text-rose-700 font-medium">Archived / Dismissed</p>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-400/30'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-indigo-800">
              <span className="text-xs font-bold uppercase tracking-wider">All Submissions</span>
              <Layers className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-indigo-950 mt-1">{submissions.length}</div>
            <p className="text-[10px] text-indigo-700 font-medium">Full submission history</p>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by Submitter name, Email, Hunter ID, Bank, Remarks..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-hidden font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type Filter Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setFilterType('new')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'new' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              ➕ New Records
            </button>
            <button
              type="button"
              onClick={() => setFilterType('update')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'update' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              ✏️ Updates
            </button>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/90 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-slate-900">
              {searchQuery
                ? 'No matching submissions found'
                : filterStatus === 'pending'
                ? 'Approval Queue is Clear!'
                : 'No submissions in this category'}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {filterStatus === 'pending' && !searchQuery
                ? 'All user-submitted Hunter Identifiers have been reviewed and approved.'
                : 'Try adjusting your search query or switching status filters.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub) => {
            const isPending = sub.approvalStatus === 'pending';
            const isApproved = sub.approvalStatus === 'approved' || !sub.approvalStatus;
            const isRejected = sub.approvalStatus === 'rejected';
            const isProcessing = processingId === sub.id;

            return (
              <div
                key={sub.id}
                id={`submission-card-${sub.id}`}
                className={`bg-white rounded-2xl border shadow-xs overflow-hidden transition-all duration-200 ${
                  isPending
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : isApproved
                    ? 'border-slate-200/90 hover:border-emerald-300'
                    : 'border-rose-200/90 bg-rose-50/10'
                }`}
              >
                {/* Top Info Header Bar */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Pill */}
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                        <Clock className="w-3.5 h-3.5" />
                        Pending Approval
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Live in Hunter Database
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                        <XCircle className="w-3.5 h-3.5" />
                        Rejected
                      </span>
                    )}

                    {/* Submission Type Pill */}
                    {sub.isUpdateRequest ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <Edit3 className="w-3 h-3" />
                        Proposed Update
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Sparkles className="w-3 h-3" />
                        New Identifier
                      </span>
                    )}

                    {/* Org Type */}
                    <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {sub.orgType || 'Bank'}
                    </span>
                  </div>

                  {/* Submission Timestamp Attribution */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Submitted on{' '}
                      <span className="font-mono text-[11px] font-semibold text-slate-700">
                        {formatDate(sub.submittedAt || sub.createdAt)}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Main Card Content */}
                <div className="p-5 space-y-4">
                  {/* Grid: Core Record Data */}
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Hunter Identifier Number
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-slate-900 tracking-tight">
                          {sub.hunterId}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(sub.hunterId, sub.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                          title="Copy Hunter ID"
                        >
                          {copiedId === sub.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Bank / NBFC Name
                      </span>
                      <div className="font-bold text-indigo-950 flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>{sub.bankName}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                          {sub.orgType || 'Bank'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison Box for Update Requests */}
                  {sub.isUpdateRequest && sub.previousRecordSnapshot && (
                    <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-950">
                        <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Proposed Changes Comparison (Previous vs. User Update)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {/* Original Snapshot */}
                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            Original Record
                          </span>
                          <div>
                            <strong>Bank / NBFC:</strong> {sub.previousRecordSnapshot.bankName || '—'}
                          </div>
                        </div>

                        {/* Proposed Update */}
                        <div className="p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200 space-y-1">
                          <span className="text-[10px] font-bold uppercase text-indigo-600 block">
                            Proposed User Values
                          </span>
                          <div>
                            <strong>Bank / NBFC:</strong>{' '}
                            <span className="text-indigo-900 font-bold">{sub.bankName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rejection / Reviewer Banner */}
                  {isRejected && sub.rejectionReason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-950">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Rejection Reason ({sub.reviewedBy || 'Admin'}):</span>
                      </div>
                      <p className="text-rose-800">{sub.rejectionReason}</p>
                    </div>
                  )}

                  {isApproved && sub.reviewedBy && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Approved by <strong>{sub.reviewedBy}</strong> on {formatDate(sub.reviewedAt)}
                      </span>
                    </div>
                  )}

                  {/* Action Controls Toolbar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-500 font-mono">
                      Ref ID: <span className="text-slate-800">{sub.id}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* If Pending: Approve, Edit & Approve, Reject */}
                      {isPending && (
                        <>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => setRejectingRecord(sub)}
                            className="py-2 px-3.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject Submission</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => setEditingRecord(sub)}
                            className="py-2 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Edit & Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(sub)}
                            className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            {isProcessing ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                <span>Publishing Live...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Approve & Publish Live</span>
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {/* If Approved: Edit, Revoke/Reject, Delete */}
                      {isApproved && (
                        <>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => setEditingRecord(sub)}
                            className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-600" />
                            <span>Edit Record</span>
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => setRejectingRecord(sub)}
                            className="py-1.5 px-3 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <X className="w-3 h-3" />
                            <span>Revoke / Reject</span>
                          </button>

                          {onDeleteSubmission && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => onDeleteSubmission(sub.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete submission from records"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      )}

                      {/* If Rejected: Re-approve, Delete */}
                      {isRejected && (
                        <>
                          {onDeleteSubmission && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => onDeleteSubmission(sub.id)}
                              className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                              <span>Delete Record</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleApprove(sub)}
                            className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Check className="w-3 h-3" />
                            <span>Re-Approve & Make Live</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {rejectingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Reject Hunter Submission
                </h3>
                <p className="text-xs text-slate-500">
                  Identifier: <span className="font-mono font-bold text-slate-800">{rejectingRecord.hunterId}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              This record will NOT be published to the live search engine. Please specify a reason for rejection for audit records:
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Duplicate identifier with conflicting status, missing primary documentation, etc."
              className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-white"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRecord(null)}
                className="py-2 px-3.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit & Approve Modal */}
      {editingRecord && (
        <AddManualRecordModal
          isOpen={!!editingRecord}
          onClose={() => setEditingRecord(null)}
          onSave={async (adjusted) => {
            if (!editingRecord) return;
            setProcessingId(editingRecord.id);
            try {
              await onApproveSubmission(
                editingRecord.id,
                adminSession.name || 'Administrator',
                {
                  hunterId: adjusted.hunterId,
                  bankName: adjusted.bankName,
                  name: adjusted.name,
                  status: adjusted.status,
                  remarks: adjusted.remarks || adjusted.notes,
                  accountNumber: adjusted.accountNumber,
                  mobile: adjusted.mobile,
                  pan: adjusted.pan,
                }
              );
              setEditingRecord(null);
            } catch (err) {
              console.error('Failed to edit & approve:', err);
            } finally {
              setProcessingId(null);
            }
          }}
          uniqueBanks={uniqueBanks}
          currentHeaders={currentHeaders}
          initialRecord={editingRecord}
        />
      )}
    </div>
  );
};
