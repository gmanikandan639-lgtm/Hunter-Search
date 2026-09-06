/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CheckCircle2, X, AlertCircle, Info, Database } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  subtext?: string;
}

interface ToastNotificationProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  toast,
  onDismiss,
}) => {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isWarning = toast.type === 'warning';

  return (
    <div
      id="toast-notification-banner"
      className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-200"
    >
      <div
        className={`p-4 rounded-2xl border shadow-xl flex items-start gap-3 bg-white ${
          isSuccess
            ? 'border-emerald-300 shadow-emerald-900/10'
            : isWarning
            ? 'border-amber-300 shadow-amber-900/10'
            : 'border-slate-300 shadow-slate-900/10'
        }`}
      >
        <div
          className={`p-2 rounded-xl shrink-0 ${
            isSuccess
              ? 'bg-emerald-100 text-emerald-700'
              : isWarning
              ? 'bg-amber-100 text-amber-700'
              : 'bg-indigo-100 text-indigo-700'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : isWarning ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <Info className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
            {toast.title}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            {toast.message}
          </p>
          {toast.subtext && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 inline-flex">
              <Database className="w-3 h-3 text-emerald-600" />
              <span>{toast.subtext}</span>
            </div>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
