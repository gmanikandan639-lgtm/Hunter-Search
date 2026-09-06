/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, RefreshCw, X, FileSpreadsheet, Database, Building2, CheckCircle2 } from 'lucide-react';

interface ReplaceConfirmModalProps {
  isOpen: boolean;
  newFileDetails: {
    fileName: string;
    fileSize: string;
    recordCount: number;
    columnCount: number;
    bankCount: number;
    detectedNameCol: string;
    detectedBankCol: string;
  } | null;
  currentFileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ReplaceConfirmModal: React.FC<ReplaceConfirmModalProps> = ({
  isOpen,
  newFileDetails,
  currentFileName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !newFileDetails) return null;

  return (
    <div
      id="replace-confirm-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        id="replace-confirm-modal"
        className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col scale-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-200/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="replace-modal-title" className="text-base font-extrabold text-slate-900">
                Delete Old CSV & Use New File?
              </h2>
              <p className="text-xs text-amber-900 font-medium">
                Previous dataset will be completely replaced
              </p>
            </div>
          </div>
          <button
            id="replace-modal-close-btn"
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            You are uploading <strong className="font-bold text-slate-900">{newFileDetails.fileName}</strong>. All data from the old file (
            <span className="font-bold text-slate-900">{currentFileName}</span>) will be completely deleted.
          </p>

          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-xs text-amber-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
              <span>Strict Single Active CSV Dataset Policy:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900/90">
              <li>Previous CSV records will be completely removed and replaced with the new file.</li>
              <li>Previous CSV data is never appended or combined with new CSV uploads.</li>
              <li><strong>Manual Hunter Identifiers are preserved</strong> and will not be deleted.</li>
              <li>Search index will be rebuilt using: <em>New CSV + Preserved Manual Identifiers</em>.</li>
              <li>Old search results are cleared to maintain accurate results.</li>
            </ul>
          </div>

          {/* New File Metadata Preview */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-extrabold text-slate-900">
                  New Incoming Database Preview
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Ready to Index
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  File Name
                </span>
                <span className="font-bold text-slate-900 truncate block mt-0.5" title={newFileDetails.fileName}>
                  {newFileDetails.fileName}
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Records Count
                </span>
                <span className="font-extrabold text-indigo-700 block mt-0.5">
                  {newFileDetails.recordCount.toLocaleString()} Records
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Columns Detected
                </span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {newFileDetails.columnCount} Columns
                </span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Banks Detected
                </span>
                <span className="font-bold text-emerald-700 block mt-0.5">
                  {newFileDetails.bankCount} Entities
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            id="replace-cancel-btn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            id="replace-confirm-btn"
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Delete Old & Load New CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
