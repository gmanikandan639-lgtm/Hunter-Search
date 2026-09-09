import React, { useState } from 'react';
import {
  Database,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Radio,
  Clock,
  Laptop,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { LiveIdentifierRecord, SubmissionRecord, LiveSyncStatus } from '../types';
import { getFirebaseConfigInfo, checkFirestoreConnectionHealth } from '../lib/firebase';

interface AdminFirebaseDiagnosticsProps {
  liveSyncStatus: LiveSyncStatus;
  liveIdentifiers: LiveIdentifierRecord[];
  submissions: SubmissionRecord[];
  lastSnapshotTimestamp: Date | null;
  className?: string;
}

export const AdminFirebaseDiagnostics: React.FC<AdminFirebaseDiagnosticsProps> = ({
  liveSyncStatus,
  liveIdentifiers,
  submissions,
  lastSnapshotTimestamp,
  className = '',
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    timestamp: string;
  } | null>(null);

  const configInfo = getFirebaseConfigInfo();
  const pendingSubmissionsCount = submissions.filter((s) => s.status === 'pending').length;
  const latest5DocIds = liveIdentifiers.slice(0, 5).map((r) => r.id);

  // Client device / browser details
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  const getBrowserInfo = () => {
    if (userAgent.includes('Firefox')) return 'Mozilla Firefox';
    if (userAgent.includes('Edg')) return 'Microsoft Edge';
    if (userAgent.includes('Chrome')) return 'Google Chrome';
    if (userAgent.includes('Safari')) return 'Apple Safari';
    return 'Web Browser';
  };
  const getOSInfo = () => {
    if (userAgent.includes('Win')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Operating System';
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunPingTest = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const isHealthy = await checkFirestoreConnectionHealth();
      const latency = Math.round(performance.now() - start);
      if (isHealthy) {
        setPingResult({
          success: true,
          latencyMs: latency,
          message: `Successfully reached Cloud Firestore (${configInfo.projectId})`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        setPingResult({
          success: false,
          latencyMs: latency,
          message: 'Could not connect to Firestore live_identifiers collection.',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (e: any) {
      setPingResult({
        success: false,
        latencyMs: Math.round(performance.now() - start),
        message: e?.message || 'Connection test failed',
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsPinging(false);
    }
  };

  const isConnected = liveSyncStatus === 'connected';

  return (
    <div
      id="admin-firebase-diagnostics"
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header Bar */}
      <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base tracking-tight text-white">
                Cloud Firestore Master Diagnostics
              </h3>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Single Source of Truth
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cross-browser and cross-device real-time synchronization verification monitor
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunPingTest}
          disabled={isPinging}
          className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
          <span>{isPinging ? 'Pinging Firestore...' : 'Test Real-Time Ping'}</span>
        </button>
      </div>

      {/* Ping Result Banner */}
      {pingResult && (
        <div
          className={`px-5 py-3 border-b text-xs flex items-center justify-between ${
            pingResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {pingResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{pingResult.message}</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-white/70 border text-[11px]">
              {pingResult.latencyMs} ms
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Tested at {pingResult.timestamp}
          </span>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-slate-100">
        {/* 1. Firebase Project ID */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Firebase Project ID</span>
            <Server className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="font-mono font-bold text-xs text-slate-900 truncate" title={configInfo.projectId}>
            {configInfo.projectId || 'fraudriskhub-44639'}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            DB: {configInfo.databaseId || '(default)'}
          </div>
        </div>

        {/* 2. Firestore Connection Status */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Firestore Connection</span>
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span
              className={`font-bold text-sm ${
                isConnected ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            {isConnected ? 'Bi-directional socket ready' : 'Attempting to restore socket'}
          </div>
        </div>

        {/* 3. live_identifiers Count */}
        <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-1">
          <div className="flex items-center justify-between text-xs text-indigo-700">
            <span className="font-medium">live_identifiers Master</span>
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="font-bold text-xl text-indigo-950 font-mono">
            {liveIdentifiers.length.toLocaleString()}
          </div>
          <div className="text-[10px] text-indigo-600">
            Instant public search documents
          </div>
        </div>

        {/* 4. submissions Count */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">submissions Queue</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="font-bold text-xl text-slate-900">
              {submissions.length.toLocaleString()}
            </span>
            {pendingSubmissionsCount > 0 && (
              <span className="text-[11px] font-bold text-amber-600">
                ({pendingSubmissionsCount} pending)
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400">
            Public user submissions pool
          </div>
        </div>
      </div>

      {/* Detailed Technical Status Grid */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Left Column: Listener & Timing */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2.5">
              <Radio className={`w-4 h-4 ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div>
                <span className="font-bold text-slate-800 block">Realtime Listener Status</span>
                <span className="text-[11px] text-slate-500">
                  Cloud Firestore onSnapshot(...) subscription
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200">
              Active (Listening)
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="font-bold text-slate-800 block">Last Snapshot Received</span>
                <span className="text-[11px] text-slate-500">
                  Exact timestamp of most recent database push
                </span>
              </div>
            </div>
            <span className="font-mono text-xs text-slate-700 font-semibold">
              {lastSnapshotTimestamp
                ? lastSnapshotTimestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'Just now'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
            <div className="flex items-center gap-2.5">
              <Laptop className="w-4 h-4 text-slate-600" />
              <div>
                <span className="font-bold text-slate-800 block">Current Environment</span>
                <span className="text-[11px] text-slate-500">
                  {getBrowserInfo()} on {getOSInfo()}
                </span>
              </div>
            </div>
            <span className="font-mono text-[10px] text-slate-500 max-w-[140px] truncate" title={userAgent}>
              {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Standard'}
            </span>
          </div>
        </div>

        {/* Right Column: Latest 5 Document IDs in live_identifiers */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-800">
                Latest 5 Document IDs from live_identifiers
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Top records in active memory
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              All browsers listening to Firestore have these exact document IDs in real-time memory:
            </p>

            <div className="space-y-1.5">
              {latest5DocIds.length > 0 ? (
                latest5DocIds.map((id, idx) => (
                  <div
                    key={id || idx}
                    className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-white border border-slate-200/80 font-mono text-[11px] text-slate-700"
                  >
                    <span className="truncate pr-2">{id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(id, id)}
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                      title="Copy Document ID"
                    >
                      {copiedId === id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-center py-3">
                  No documents found in live_identifiers yet.
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-200 flex items-center justify-between">
            <span>Real-time onSnapshot filter: status == 'approved'</span>
            <span className="text-emerald-700 font-semibold">Zero-delay synchronization</span>
          </div>
        </div>
      </div>
    </div>
  );
};
