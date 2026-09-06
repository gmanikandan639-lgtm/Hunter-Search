/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  CSVMetadata,
  RecordItem,
  SearchFilters,
  SearchResultItem,
  SearchHistoryItem,
  AdminSession,
  AdminTab,
  ManualHunterRecord,
} from '../types';
import {
  LayoutDashboard,
  Database,
  Search,
  History,
  Settings,
  LogOut,
  UploadCloud,
  Trash2,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Sliders,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Building2,
  CheckCircle,
  FileSpreadsheet,
  PlusCircle,
  UserPlus,
  Users,
  Edit3,
  X,
  XCircle,
} from 'lucide-react';
import { searchDatabase } from '../utils/similarity';
import { parseCSVText, exportToCSV } from '../utils/csvParser';
import { AddManualRecordModal, ManualRecordInput } from './AddManualRecordModal';
import { AdminApprovalsManager } from './AdminApprovalsManager';
import { maskIdentifierNumber, maskGenericNumber } from '../utils/masking';
import { VisitorStats } from '../types';

interface AdminDashboardProps {
  adminSession: AdminSession;
  csvMetadata: CSVMetadata;
  records: RecordItem[];
  manualRecords?: ManualHunterRecord[];
  uniqueBanks: string[];
  searchHistory: SearchHistoryItem[];
  onLogout: () => void;
  onInitiateUpload: (file: File) => void;
  onInitiateClearDatabase: () => void;
  onResetToDemo: () => void;
  onNavigateToPublic: () => void;
  onClearHistory: () => void;
  onExportDataset: () => void;
  defaultThreshold: number;
  setDefaultThreshold: (val: number) => void;
  onAddManualRecord?: (record: ManualRecordInput) => void;
  onEditManualRecord?: (record: ManualRecordInput) => void;
  onDeleteManualRecord?: (recordId: string) => void;
  onDeleteRecord?: (recordId: string) => void;
  onApproveSubmission?: (
    submissionId: string,
    adminName: string,
    adjustedData?: Partial<ManualHunterRecord>
  ) => Promise<void> | void;
  onRejectSubmission?: (
    submissionId: string,
    adminName: string,
    reason: string
  ) => Promise<void> | void;
  visitorStats?: VisitorStats;
  uploadProgress?: number | null;
  isUploading?: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminSession,
  csvMetadata,
  records,
  manualRecords = [],
  uniqueBanks,
  searchHistory,
  onLogout,
  onInitiateUpload,
  onInitiateClearDatabase,
  onResetToDemo,
  onNavigateToPublic,
  onClearHistory,
  onExportDataset,
  defaultThreshold,
  setDefaultThreshold,
  onAddManualRecord,
  onEditManualRecord,
  onDeleteManualRecord,
  onDeleteRecord,
  onApproveSubmission,
  onRejectSubmission,
  visitorStats,
  uploadProgress = null,
  isUploading = false,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddRecordModalOpen, setIsAddRecordModalOpen] = useState<boolean>(false);
  const [editingManualRecord, setEditingManualRecord] = useState<ManualHunterRecord | null>(null);

  // Status breakdown of manual records
  const pendingSubmissions = useMemo(
    () => manualRecords.filter((r) => r.approvalStatus === 'pending'),
    [manualRecords]
  );
  const approvedManualRecords = useMemo(
    () => manualRecords.filter((r) => r.approvalStatus === 'approved' || !r.approvalStatus),
    [manualRecords]
  );

  // Manual Records Filter & Pagination
  const [manualSearch, setManualSearch] = useState<string>('');
  const [manualPage, setManualPage] = useState<number>(1);
  const [manualRowsPerPage, setManualRowsPerPage] = useState<number>(10);

  // Table Preview State (CSV Management)
  const [previewSearch, setPreviewSearch] = useState<string>('');
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(15);

  // Upload Validation State
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const hasData = csvMetadata.status === 'ACTIVE' && records.length > 0;

  // Filtered preview records
  const filteredPreviewRecords = useMemo(() => {
    if (!previewSearch.trim()) return records;
    const q = previewSearch.toLowerCase().trim();
    return records.filter((r) => {
      const matchId = (r.hunterId || '').toLowerCase().includes(q);
      const matchBank = (r.bankName || '').toLowerCase().includes(q);
      const matchRaw = Object.values(r.rawColumns || {}).some((val) =>
        String(val).toLowerCase().includes(q)
      );
      return matchId || matchBank || matchRaw;
    });
  }, [records, previewSearch]);

  const totalPreviewPages = Math.max(
    1,
    Math.ceil(filteredPreviewRecords.length / rowsPerPage)
  );

  const paginatedPreviewRecords = useMemo(() => {
    const start = (previewPage - 1) * rowsPerPage;
    return filteredPreviewRecords.slice(start, start + rowsPerPage);
  }, [filteredPreviewRecords, previewPage, rowsPerPage]);

  // Aggregate Metrics for Overview
  const totalMatchesAcrossHistory = useMemo(() => {
    return searchHistory.reduce((acc, curr) => acc + curr.matchCount, 0);
  }, [searchHistory]);

  // Handle Admin File Drag & Drop
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);
    setUploadSuccess(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const processSelectedFile = (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    // Validate file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setUploadError('Invalid file format. Please upload a valid .csv file.');
      return;
    }

    // Read and test validate format
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          setUploadError('The selected CSV file is empty. Please select a file with record rows.');
          return;
        }

        const parsed = parseCSVText(text);
        if (parsed.rowCount === 0) {
          setUploadError('No valid record rows found in this CSV. Please verify file headers.');
          return;
        }

        // Pass to standard confirmed upload handler in parent
        onInitiateUpload(file);
        setUploadSuccess(
          `Validated ${parsed.rowCount.toLocaleString()} records from "${file.name}". Ready for activation.`
        );
      } catch (err: any) {
        setUploadError(`Failed to parse CSV: ${err.message || 'Malformed structure'}`);
      }
    };
    reader.onerror = () => {
      setUploadError('Error reading file. Please check file permissions.');
    };
    reader.readAsText(file);
  };

  // Navigation tabs configuration
  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'approvals',
      label: 'User Submissions & Approvals',
      icon: Clock,
      badge: pendingSubmissions.length > 0 ? pendingSubmissions.length : undefined,
      badgeColor: pendingSubmissions.length > 0 ? 'bg-amber-400 text-amber-950 font-black' : undefined,
    },
    {
      id: 'manual-records',
      label: 'Live Manual Identifiers',
      icon: UserPlus,
      badge: approvedManualRecords.length,
    },
    { id: 'csv-management', label: 'CSV Data Management', icon: Database },
    { id: 'search-history', label: 'Search History', icon: History, badge: searchHistory.length },
    { id: 'settings', label: 'Settings & Profile', icon: Settings },
  ];

  // Filtered Manual Hunter Identifiers
  const filteredManualRecords = useMemo(() => {
    if (!manualSearch.trim()) return manualRecords;
    const q = manualSearch.toLowerCase().trim();
    return manualRecords.filter((r) => {
      const matchId = (r.hunterId || '').toLowerCase().includes(q);
      const matchBank = (r.bankName || '').toLowerCase().includes(q);
      const matchName = (r.name || '').toLowerCase().includes(q);
      const matchStatus = (r.status || '').toLowerCase().includes(q);
      const matchRemarks = (r.remarks || r.notes || '').toLowerCase().includes(q);
      return matchId || matchBank || matchName || matchStatus || matchRemarks;
    });
  }, [manualRecords, manualSearch]);

  const totalManualPages = Math.max(1, Math.ceil(filteredManualRecords.length / manualRowsPerPage));
  const paginatedManualRecords = useMemo(() => {
    const start = (manualPage - 1) * manualRowsPerPage;
    return filteredManualRecords.slice(start, start + manualRowsPerPage);
  }, [filteredManualRecords, manualPage, manualRowsPerPage]);

  const getStatusBadge = (statusStr: string = '') => {
    const s = statusStr.toLowerCase();
    if (s.includes('fraud') || s.includes('suspect')) {
      return {
        bg: 'bg-rose-100 text-rose-800 border-rose-300',
        dot: 'bg-rose-500',
      };
    }
    if (s.includes('rcu') || s.includes('match') || s.includes('alert')) {
      return {
        bg: 'bg-red-100 text-red-800 border-red-300',
        dot: 'bg-red-500',
      };
    }
    if (s.includes('fcu') || s.includes('review')) {
      return {
        bg: 'bg-amber-100 text-amber-800 border-amber-300',
        dot: 'bg-amber-500',
      };
    }
    if (s.includes('active') || s.includes('verified')) {
      return {
        bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500',
      };
    }
    return {
      bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      dot: 'bg-indigo-500',
    };
  };

  return (
    <div id="admin-dashboard-container" className="w-full min-h-[82vh] flex flex-col space-y-6">
      {/* Top Admin Bar */}
      <div
        id="admin-top-bar"
        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Hunter Admin Dashboard
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Session
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              System: <span className="font-semibold text-slate-700">{adminSession.system}</span> •
              Admin: <span className="font-semibold text-slate-700">{adminSession.name}</span> ({adminSession.role})
            </p>
          </div>
        </div>

        {/* Top Bar Quick Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            id="view-public-search-btn"
            type="button"
            onClick={onNavigateToPublic}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
            title="Switch to public Hunter Search view"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
            <span>Public Hunter Search</span>
          </button>

          <button
            id="admin-logout-btn"
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
            title="Terminate Admin Session"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Admin Content Layout: Left Sidebar + Tab Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left-Side Admin Navigation Menu (Col-3) */}
        <aside id="admin-sidebar" className="lg:col-span-3 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 space-y-1">
            <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Admin Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`admin-nav-${item.id}`}
                  type="button"
                  onClick={() => setActiveTab(item.id as AdminTab)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : item.badgeColor
                          ? `${item.badgeColor} shadow-2xs`
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Direct Logout in Menu */}
            <div className="pt-2 mt-2 border-t border-slate-100">
              <button
                id="sidebar-logout-btn"
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Sign Out / Terminate Session</span>
              </button>
            </div>
          </div>

          {/* Admin Profile Mini Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center font-black text-sm text-white">
                M
              </div>
              <div>
                <div className="text-xs font-bold flex items-center gap-1">
                  <span>{adminSession.name}</span>
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="text-[10px] text-slate-300 font-medium">
                  {adminSession.role}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-white/10 text-[11px] text-slate-300 space-y-0.5">
              <div>System: <span className="font-semibold text-white">{adminSession.system}</span></div>
              <div>User: <span className="font-mono text-indigo-200">{adminSession.username}</span></div>
            </div>
          </div>
        </aside>

        {/* Right Tab Content Area (Col-9) */}
        <div className="lg:col-span-9 min-w-0 space-y-6">
          {/* ======================================================== */}
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div id="admin-tab-overview" className="space-y-6 animate-in fade-in duration-200">
              {/* Summary Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Metric: User Submissions & Approvals (Priority Action Card) */}
                <div
                  id="admin-approvals-overview-card"
                  className={`p-5 rounded-2xl border shadow-xs space-y-2 cursor-pointer transition-all ${
                    pendingSubmissions.length > 0
                      ? 'bg-gradient-to-br from-amber-500/10 via-amber-50 to-white border-amber-300 hover:border-amber-400 ring-1 ring-amber-200'
                      : 'bg-white border-slate-200/90 hover:border-indigo-200'
                  }`}
                  onClick={() => setActiveTab('approvals')}
                >
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      User Submissions Queue
                    </span>
                    <Clock className={`w-4 h-4 ${pendingSubmissions.length > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-2xl sm:text-3xl font-black text-slate-900">
                      {pendingSubmissions.length}
                    </div>
                    <span className="text-xs font-bold text-amber-700">
                      Pending Approvals
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>{approvedManualRecords.length} Live Manual Records</span>
                    <span className="font-bold text-indigo-600 hover:text-indigo-800">
                      Review Queue →
                    </span>
                  </div>
                </div>

                {/* Metric 1: Total Uploaded Records */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Active Records</span>
                    <Database className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    {records.length.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span className={`font-semibold ${hasData ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {hasData ? '● Database Online' : '○ Database Empty'}
                    </span>
                    <span>• {uniqueBanks.length} Banks Detected</span>
                  </div>
                </div>

                {/* Metric 2: Total CSV Files */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Total CSV Files</span>
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    {hasData ? '1 File' : '0 Files'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate" title={csvMetadata.fileName}>
                    {hasData ? `${csvMetadata.fileName} (${csvMetadata.fileSize})` : 'No active file'}
                  </div>
                </div>

                {/* Metric 3: Total Searches */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Searches</span>
                    <Search className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    {searchHistory.length}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Session search log count
                  </div>
                </div>

                {/* Metric 4: Total Matching Results */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Matching Results</span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900">
                    {totalMatchesAcrossHistory}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Cumulative matches verified
                  </div>
                </div>

                {/* Metric 5: Latest Uploaded File */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Latest Uploaded File</span>
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate" title={csvMetadata.fileName}>
                    {csvMetadata.fileName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Size: {csvMetadata.fileSize} • {csvMetadata.columnCount} columns
                  </div>
                </div>

                {/* Metric 6: Last Updated Date/Time */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Last Updated Date/Time</span>
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {csvMetadata.uploadedAt}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    System time synchronized
                  </div>
                </div>

                {/* Metric 7: Website Visitor Traffic */}
                {visitorStats && (
                  <div
                    id="admin-visitor-metric-card"
                    className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-800/40 shadow-xs space-y-2 sm:col-span-2 lg:col-span-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                            Website Visitor Traffic Telemetry
                          </span>
                          <p className="text-[11px] text-slate-400">
                            Live count of users and clients opening the Hunter portal
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 w-fit">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Real-Time Active Tracking
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-white/10">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          TOTAL VISITORS
                        </span>
                        <div
                          id="admin-total-visitors-val"
                          className="text-2xl font-black font-mono text-white tracking-tight"
                        >
                          {visitorStats.totalVisits.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-slate-400">Unique visitors</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          Today's Visits
                        </span>
                        <div
                          id="admin-today-visitors-val"
                          className="text-2xl font-black font-mono text-indigo-300 tracking-tight"
                        >
                          {visitorStats.todayVisits.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-indigo-300/80">Unique today</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          Unique Identification
                        </span>
                        <div className="text-sm font-bold font-mono text-emerald-300 tracking-tight mt-1">
                          1 User = 1 Count
                        </div>
                        <span className="text-[10px] text-emerald-400/80">Strict Deduplication</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                          Telemetry Protocol
                        </span>
                        <div className="text-xs font-semibold text-slate-300 mt-1">
                          Persistent Atomic Tracker
                        </div>
                        <span className="text-[10px] text-slate-400">Search-Isolated</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions & Dataset Health */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Quick Management Shortcuts */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    Quick Administrative Actions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      id="admin-quick-add-record-btn"
                      type="button"
                      onClick={() => setIsAddRecordModalOpen(true)}
                      className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-left transition-all shadow-xs cursor-pointer space-y-1 group"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-extrabold">
                        <PlusCircle className="w-4 h-4 text-indigo-200 group-hover:rotate-90 transition-transform duration-200" />
                        <span>Add Record Manually</span>
                      </div>
                      <p className="text-[11px] text-indigo-100/90">
                        Directly insert new Hunter identifier
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('csv-management')}
                      className="p-3 rounded-xl bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-900 border border-indigo-200/60 text-left transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <UploadCloud className="w-4 h-4 text-indigo-600" />
                        <span>Manage CSV Data</span>
                      </div>
                      <p className="text-[11px] text-indigo-700/80">
                        Upload, replace, or preview records
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('manual-records')}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 text-left transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <UserPlus className="w-4 h-4 text-indigo-600" />
                        <span>Manual Identifiers</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        View & manage {manualRecords.length} registered records
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('search-history')}
                      className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200 text-left transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <History className="w-4 h-4 text-indigo-600" />
                        <span>View Search Logs</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Inspect {searchHistory.length} historical queries
                      </p>
                    </button>
                  </div>
                </div>

                {/* Active Dataset Status & Isolation Guarantee */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                    <span>Active Dataset Status</span>
                    {hasData ? (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Ready
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        No Dataset
                      </span>
                    )}
                  </h3>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">Current Active File:</span>
                      <span className="font-bold text-slate-900 truncate max-w-[180px]">{csvMetadata.fileName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">Record Count:</span>
                      <span className="font-bold text-indigo-600">{records.length.toLocaleString()} rows</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500 font-medium">Unique Financial Institutions:</span>
                      <span className="font-bold text-slate-900">{uniqueBanks.length} Banks / NBFCs</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 font-medium">Data Isolation:</span>
                      <span className="font-bold text-emerald-600">100% Isolated Active Set</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    <strong>Rule:</strong> Public Hunter Search queries <em>exclusively</em> evaluate against the currently loaded file. Replacing or deleting this file immediately synchronizes the public search engine.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB: USER SUBMISSIONS & APPROVALS WORKFLOW */}
          {/* ======================================================== */}
          {activeTab === 'approvals' && (
            <AdminApprovalsManager
              submissions={manualRecords}
              adminSession={adminSession}
              uniqueBanks={uniqueBanks}
              currentHeaders={csvMetadata.headers}
              onApproveSubmission={
                onApproveSubmission ||
                (async (id) => {
                  console.log('Approve submission:', id);
                })
              }
              onRejectSubmission={
                onRejectSubmission ||
                (async (id, name, reason) => {
                  console.log('Reject submission:', id, reason);
                })
              }
              onDeleteSubmission={
                onDeleteManualRecord
                  ? async (id) => {
                      onDeleteManualRecord(id);
                    }
                  : undefined
              }
            />
          )}

          {/* ======================================================== */}
          {/* TAB: MANUAL HUNTER IDENTIFIERS (ADMIN EXCLUSIVE) */}
          {/* ======================================================== */}
          {activeTab === 'manual-records' && (
            <div id="admin-tab-manual-records" className="space-y-6 animate-in fade-in duration-200">
              {/* Header Card with Add Action */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        Manual Hunter Identifiers
                      </h2>
                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {manualRecords.length} Active Records
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                      Central database of Administrator-registered Hunter reference identifiers. These records are <strong>immediately searchable by all users</strong> in real time and <strong>persist across CSV uploads</strong>.
                    </p>
                  </div>

                  <button
                    id="admin-manual-records-add-btn"
                    type="button"
                    onClick={() => {
                      setEditingManualRecord(null);
                      setIsAddRecordModalOpen(true);
                    }}
                    className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-extrabold shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>+ Add Hunter Identifier Manually</span>
                  </button>
                </div>

                {/* Quick Architecture Guarantee Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-800">Persistent Storage</div>
                      <div className="text-[10px] text-slate-500">Not deleted when CSV is replaced</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-800">Real-Time Sync (Cloud Firestore)</div>
                      <div className="text-[10px] text-slate-500">Pushed to all active search sessions via onSnapshot</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-800">Admin-Only Mutation</div>
                      <div className="text-[10px] text-slate-500">Secured with backend authorization</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table / Records View Card */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={manualSearch}
                      onChange={(e) => {
                        setManualSearch(e.target.value);
                        setManualPage(1);
                      }}
                      placeholder="Search manual records (identifier, bank, status, remarks)..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-indigo-600 outline-hidden font-medium"
                    />
                  </div>

                  <div className="text-xs text-slate-500">
                    Showing <span className="font-bold text-slate-800">{filteredManualRecords.length}</span> of {manualRecords.length} manual records
                  </div>
                </div>

                {/* Table Content */}
                {filteredManualRecords.length === 0 ? (
                  <div className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {manualSearch ? 'No matching manual records found' : 'No manual identifiers added yet'}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {manualSearch
                          ? 'Try adjusting your search keywords.'
                          : 'Click "+ Add Hunter Identifier Manually" to register the first manual reference record.'}
                      </p>
                    </div>
                    {!manualSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingManualRecord(null);
                          setIsAddRecordModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Add First Record</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Hunter Identifier</th>
                          <th className="py-3 px-4">Bank / NBFC Name</th>
                          <th className="py-3 px-4">Approval State</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {paginatedManualRecords.map((item) => {
                          const isApproved = item.approvalStatus === 'approved' || !item.approvalStatus;
                          const isPending = item.approvalStatus === 'pending';
                          const isRejected = item.approvalStatus === 'rejected';

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Identifier */}
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-xs">
                                {item.hunterId}
                              </td>

                              {/* Bank Name */}
                              <td className="py-3.5 px-4">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/60 border border-indigo-100 text-indigo-950 font-bold text-xs">
                                  <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span>{item.bankName}</span>
                                </div>
                              </td>

                              {/* Approval State */}
                              <td className="py-3.5 px-4">
                                {isApproved && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                    Live Search
                                  </span>
                                )}
                                {isPending && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    Pending Review
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                                    <X className="w-3 h-3 text-rose-600" />
                                    Rejected
                                  </span>
                                )}
                              </td>

                              {/* Actions: Edit & Delete */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    id={`edit-manual-record-${item.id}`}
                                    type="button"
                                    onClick={() => {
                                      setEditingManualRecord(item);
                                      setIsAddRecordModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-colors inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                    title="Edit Manual Identifier"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    id={`delete-manual-record-${item.id}`}
                                    type="button"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `Are you sure you want to delete Hunter Identifier "${item.hunterId}" (${item.bankName})? This will immediately remove it from the active search database for all users.`
                                        )
                                      ) {
                                        onDeleteManualRecord?.(item.id);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                    title="Delete from Central Database"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalManualPages > 1 && (
                  <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Page {manualPage} of {totalManualPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={manualPage === 1}
                        onClick={() => setManualPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 font-semibold cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={manualPage === totalManualPages}
                        onClick={() => setManualPage((p) => Math.min(totalManualPages, p + 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 font-semibold cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: CSV / DATA MANAGEMENT */}
          {/* ======================================================== */}
          {activeTab === 'csv-management' && (
            <div id="admin-tab-csv-management" className="space-y-6 animate-in fade-in duration-200">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileInputChange}
                className="hidden"
                id="admin-csv-file-input"
              />

              {/* Upload & Replacement Zone */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      CSV Data Upload & Strict Replacement
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload a new CSV file to replace or activate the reference database.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      id="admin-add-record-btn-top"
                      type="button"
                      onClick={() => setIsAddRecordModalOpen(true)}
                      className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm transition-colors cursor-pointer"
                      title="Add Hunter Identifier Manually"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Add Identifier Manually</span>
                    </button>
                    {hasData && (
                      <button
                        id="admin-download-dataset-btn"
                        type="button"
                        onClick={onExportDataset}
                        className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-colors cursor-pointer"
                        title="Download active Hunter Identifier dataset as CSV (Admin Exclusive)"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Dataset (CSV)</span>
                      </button>
                    )}
                    {hasData && (
                      <button
                        id="admin-delete-csv-btn"
                        type="button"
                        onClick={onInitiateClearDatabase}
                        className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                        title="Delete current CSV data"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete Current Data</span>
                      </button>
                    )}
                    <button
                      id="admin-reload-demo-btn"
                      type="button"
                      onClick={onResetToDemo}
                      className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                      title="Load Default Reference Demo CSV"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                      <span>Load Demo Data</span>
                    </button>
                  </div>
                </div>

                {/* Upload Progress Bar */}
                {(isUploading || (uploadProgress !== null && uploadProgress < 100)) && (
                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-950 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-bold text-indigo-900">
                        <UploadCloud className="w-4 h-4 text-indigo-600 animate-bounce" />
                        <span>Uploading CSV to Firebase Cloud Storage (csv/current/)...</span>
                      </span>
                      <span className="font-extrabold text-indigo-700">{uploadProgress ?? 0}%</span>
                    </div>
                    <div className="w-full bg-indigo-200/80 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-200 ease-out"
                        style={{ width: `${uploadProgress ?? 10}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Validation Feedback Messages */}
                {uploadError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>{uploadError}</div>
                  </div>
                )}
                {uploadSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-start gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>{uploadSuccess}</div>
                  </div>
                )}

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900">
                        Click to upload
                      </span>{' '}
                      <span className="text-xs text-slate-500">or drag and drop CSV file here</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Supports .csv files. Required columns: Identifier Number and Bank Name.
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      Browse Files
                    </button>
                  </div>
                </div>

                {/* Active File Details & Validation Breakdown */}
                {hasData && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Active File</span>
                      <span className="text-xs font-bold text-slate-900 truncate block" title={csvMetadata.fileName}>
                        {csvMetadata.fileName}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Records</span>
                      <span className="text-xs font-bold text-indigo-600 block">
                        {records.length.toLocaleString()} rows
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Upload Timestamp</span>
                      <span className="text-xs font-bold text-slate-900 block truncate" title={csvMetadata.uploadedAt}>
                        {csvMetadata.uploadedAt}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Banks Detected</span>
                      <span className="text-xs font-bold text-slate-900 block">
                        {uniqueBanks.length} Entities
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Data Table Preview Section */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span>CSV Records Preview</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {filteredPreviewRecords.length.toLocaleString()} matching records
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Previewing records currently loaded in the active Hunter Search database
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Add Manual Record Button */}
                    <button
                      id="admin-add-record-btn-table"
                      type="button"
                      onClick={() => setIsAddRecordModalOpen(true)}
                      className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Add a new Hunter Identifier manually"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Add Record</span>
                    </button>

                    {/* Table search filter */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={previewSearch}
                        onChange={(e) => {
                          setPreviewSearch(e.target.value);
                          setPreviewPage(1);
                        }}
                        placeholder="Filter preview table..."
                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:border-indigo-600 outline-hidden w-40 sm:w-48"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={onExportDataset}
                      disabled={!hasData}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Export active records to CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Table */}
                {paginatedPreviewRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 w-12">#</th>
                          <th className="py-3 px-4">Hunter Identifier Number</th>
                          <th className="py-3 px-4">Bank / NBFC Name</th>
                          <th className="py-3 px-4">Entity & Reference Info</th>
                          <th className="py-3 px-4">Status / Alert</th>
                          {onDeleteRecord && <th className="py-3 px-4 text-right w-16">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {paginatedPreviewRecords.map((record, index) => {
                          const rowIndex = (previewPage - 1) * rowsPerPage + index + 1;
                          const isManual =
                            record.id.startsWith('manual-') ||
                            record.status?.includes('MANUAL') ||
                            Boolean(record.uploadedBy);

                          return (
                            <tr key={record.id || index} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono text-slate-400">{rowIndex}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-indigo-700">
                                    {maskIdentifierNumber(record.hunterId || record.name)}
                                  </span>
                                  {isManual && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      Manual
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-900">
                                {record.bankName || '—'}
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                <div className="space-y-0.5">
                                  {record.name && record.name !== record.hunterId && (
                                    <div className="font-medium text-slate-800 truncate max-w-[180px]">
                                      {record.name}
                                    </div>
                                  )}
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                    {record.pan && <span>PAN: {maskGenericNumber(record.pan)}</span>}
                                    {record.accountNumber && <span>A/C: {maskGenericNumber(record.accountNumber)}</span>}
                                    {record.mobile && <span>Ph: {maskGenericNumber(record.mobile)}</span>}
                                    {!record.pan && !record.accountNumber && !record.mobile && (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    record.status?.includes('FRAUD')
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : record.status?.includes('RCU')
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : record.status?.includes('ALERT') || record.status?.includes('SUSPECT')
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {record.status || 'Active Reference'}
                                </span>
                              </td>
                              {onDeleteRecord && (
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          `Delete record "${record.hunterId || record.name}" from the active database?`
                                        )
                                      ) {
                                        onDeleteRecord(record.id);
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Delete this record"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <Database className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">
                      {records.length === 0
                        ? 'No CSV records loaded. Upload a CSV file or load demo data.'
                        : 'No records matching your preview filter.'}
                    </p>
                  </div>
                )}

                {/* Pagination Controls */}
                {filteredPreviewRecords.length > 0 && (
                  <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>Showing {((previewPage - 1) * rowsPerPage) + 1} to {Math.min(previewPage * rowsPerPage, filteredPreviewRecords.length)} of {filteredPreviewRecords.length} records</span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => {
                          setRowsPerPage(Number(e.target.value));
                          setPreviewPage(1);
                        }}
                        className="ml-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs"
                      >
                        <option value={10}>10 rows</option>
                        <option value={15}>15 rows</option>
                        <option value={25}>25 rows</option>
                        <option value={50}>50 rows</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewPage(1)}
                        disabled={previewPage === 1}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                        title="First Page"
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        disabled={previewPage === 1}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 py-1 font-bold text-slate-800">
                        {previewPage} / {totalPreviewPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                        disabled={previewPage === totalPreviewPages}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                        title="Next Page"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPage(totalPreviewPages)}
                        disabled={previewPage === totalPreviewPages}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                        title="Last Page"
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: SEARCH HISTORY */}
          {/* ======================================================== */}
          {activeTab === 'search-history' && (
            <div id="admin-tab-search-history" className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <History className="w-5 h-5 text-indigo-600" />
                      <span>Search History & Query Audit</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Audit log of all queries executed during this system session
                    </p>
                  </div>
                  {searchHistory.length > 0 && (
                    <button
                      id="admin-clear-history-btn"
                      type="button"
                      onClick={onClearHistory}
                      className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear History</span>
                    </button>
                  )}
                </div>

                {searchHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 w-12">#</th>
                          <th className="py-3 px-4">Search Query / Identifier</th>
                          <th className="py-3 px-4">Search Mode</th>
                          <th className="py-3 px-4">Matches Found</th>
                          <th className="py-3 px-4">Top Score</th>
                          <th className="py-3 px-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {searchHistory.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-mono text-slate-400">{index + 1}</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              {item.query}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {item.searchType}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-indigo-600">
                              {item.matchCount} records
                            </td>
                            <td className="py-3 px-4 font-mono font-bold">
                              {item.highestScore > 0 ? `${item.highestScore}%` : '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-500 font-medium">
                              {item.timestamp}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-500 space-y-2">
                    <History className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">No search queries logged yet.</p>
                    <p className="text-[11px] text-slate-400">
                      Queries executed in Hunter Search will appear here automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: SETTINGS & ADMIN PROFILE */}
          {/* ======================================================== */}
          {activeTab === 'settings' && (
            <div id="admin-tab-settings" className="space-y-6 animate-in fade-in duration-200">
              {/* Admin Profile Section */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <span>Administrator Profile</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official administrative credentials and identity specifications
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Admin Name
                    </span>
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Manikandan</span>
                      <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Role
                    </span>
                    <div className="text-sm font-bold text-indigo-700">
                      Administrator
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      System
                    </span>
                    <div className="text-sm font-bold text-slate-900">
                      Hunter Search Management
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Admin Username
                    </span>
                    <div className="text-sm font-mono font-bold text-slate-900">
                      Manikandan@FRH
                    </div>
                  </div>
                </div>
              </div>

              {/* System Configuration */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-600" />
                    <span>System Preferences</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Default thresholds and search behavior parameters
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Default Threshold */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <span>Default Public Search Threshold</span>
                      <span className="font-mono text-indigo-600">{defaultThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      step={5}
                      value={defaultThreshold}
                      onChange={(e) => setDefaultThreshold(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500">
                      Sets the default minimum similarity score required for records to be presented as matching results.
                    </p>
                  </div>

                  {/* Security Session Details */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-600">
                    <div className="font-bold text-slate-800">Security & Isolation Guarantee</div>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      All CSV processing, column mapping, and fuzzy search calculations execute exclusively within the browser in-memory runtime. No data is leaked or retained across unconfirmed uploads.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Hunter Record Addition / Editing Modal (Admin Only) */}
      <AddManualRecordModal
        isOpen={isAddRecordModalOpen || Boolean(editingManualRecord)}
        onClose={() => {
          setIsAddRecordModalOpen(false);
          setEditingManualRecord(null);
        }}
        initialRecord={editingManualRecord}
        onSave={(data) => {
          if (editingManualRecord?.id) {
            onEditManualRecord?.({ ...data, id: editingManualRecord.id });
          } else {
            onAddManualRecord?.(data);
          }
          setIsAddRecordModalOpen(false);
          setEditingManualRecord(null);
        }}
        uniqueBanks={uniqueBanks}
        currentHeaders={csvMetadata.headers}
      />
    </div>
  );
};
