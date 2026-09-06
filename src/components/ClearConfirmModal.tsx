/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ClearConfirmModalProps {
  isOpen: boolean;
  currentFileName: string;
  recordCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ClearConfirmModal: React.FC<ClearConfirmModalProps> = ({
  isOpen,
  currentFileName,
  recordCount,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="clear-confirm-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="clear-confirm-modal"
        className="bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col scale-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-rose-50 border-b border-rose-200/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="clear-modal-title" className="text-base font-extrabold text-slate-900">
                Delete Existing CSV Data?
              </h2>
              <p className="text-xs text-rose-700 font-medium">
                Complete database & search reset
              </p>
            </div>
          </div>
          <button
            id="clear-modal-close-btn"
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 text-rose-950 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900">
                Are you sure you want to delete the active CSV data?
              </p>
              <p className="mt-1 text-[11px] text-rose-800">
                Active File: <strong className="font-bold">{currentFileName}</strong> ({recordCount.toLocaleString()} records).
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-800">This action will completely remove:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
              <li>All CSV reference records</li>
              <li>Old search results and match history</li>
              <li>CSV search index and detected bank data</li>
              <li>Old CSV record count and file metadata</li>
            </ul>
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 font-semibold">
              ✓ Manual Hunter Identifiers are safely preserved and will NOT be deleted.
            </div>
            <p className="text-slate-500 pt-1">
              After deletion, you can upload a new CSV file to start a fresh Hunter Search session.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            id="clear-cancel-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="clear-confirm-btn"
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Existing File</span>
          </button>
        </div>
      </div>
    </div>
  );
};
