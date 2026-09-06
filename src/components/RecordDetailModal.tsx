/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RecordItem } from '../types';
import { maskIdentifierNumber } from '../utils/masking';
import {
  X,
  Building2,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Hash,
  Edit3,
} from 'lucide-react';

interface RecordDetailModalProps {
  record: RecordItem;
  score: number;
  matchedFields: { field: string; value: string; score: number }[];
  onClose: () => void;
  onProposeUpdate?: (record: RecordItem) => void;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  record,
  score,
  matchedFields,
  onClose,
  onProposeUpdate,
}) => {
  const [copied, setCopied] = useState(false);

  const rawIdentifier = record.hunterId || record.name || record.id;
  const bankName = record.bankName || 'Unspecified Bank';

  const handleCopy = () => {
    const report = [
      `HUNTER RECORD DETAILS`,
      `====================`,
      `Identifier Number: ${rawIdentifier}`,
      `Bank Name: ${bankName}`,
      `Match Score: ${score}%`,
    ].join('\n');

    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreBadge = (val: number) => {
    if (val >= 90) return { label: 'Very High Match', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (val >= 80) return { label: 'High Match', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (val >= 70) return { label: 'Possible Match', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'Low Match', bg: 'bg-slate-100 text-slate-700 border-slate-300' };
  };

  const scoreBadge = getScoreBadge(score);

  return (
    <div
      id="record-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="record-detail-modal-content"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-record-title" className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                Hunter Match Record
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                Verification Details
              </span>
            </div>
          </div>

          <button
            id="modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Only Identifier Number and Bank Name */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Match Score Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-indigo-950">Match Confidence Score</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-900">{score}%</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold border ${scoreBadge.bg}`}>
                {scoreBadge.label}
              </span>
            </div>
          </div>

          {/* Core Details Table: Identifier Number, Bank Name, Status, Remarks */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-200">
            {/* 1. Identifier Number */}
            <div className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Hash className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Identifier Number</span>
              </div>
              <div className="text-right sm:text-right">
                <span className="font-mono font-bold text-slate-900 text-sm break-all">
                  {rawIdentifier}
                </span>
              </div>
            </div>

            {/* 2. Bank Name */}
            <div className="p-4 bg-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Building2 className="w-4 h-4 text-indigo-700 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Bank Name</span>
              </div>
              <div className="text-right sm:text-right">
                <span className="font-bold text-indigo-950 text-sm">
                  {bankName}
                </span>
              </div>
            </div>

            {/* 3. Details (if present) */}
            {(record.details || record.name || record.notes) && (
              <div className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Details</span>
                </div>
                <div className="text-right sm:text-right">
                  <span className="text-xs font-semibold text-slate-800">
                    {record.details || record.name || record.notes}
                  </span>
                </div>
              </div>
            )}

            {/* 4. Source (when available) */}
            {(record.source || record.isCsvImport !== undefined) && (
              <div className="p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  <span className="text-xs font-bold uppercase tracking-wider">Source</span>
                </div>
                <div className="text-right sm:text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                    {record.source || (record.isCsvImport ? 'CSV Reference Dataset' : 'Manual Identifier')}
                  </span>
                </div>
              </div>
            )}

            {/* 5. Status (if present) */}
            {record.status && (
              <div className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider">Status / Classification</span>
                </div>
                <div className="text-right sm:text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                    {record.status}
                  </span>
                </div>
              </div>
            )}

            {/* 6. Remarks (if present) */}
            {(record.notes || record.rawColumns?.['Remarks'] || record.rawColumns?.['remarks']) && (
              <div className="p-4 bg-slate-50/60 flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Remarks</span>
                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  {record.notes || record.rawColumns?.['Remarks'] || record.rawColumns?.['remarks']}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="modal-copy-btn"
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Details</span>
                </>
              )}
            </button>

            {onProposeUpdate && (
              <button
                id="modal-propose-update-btn"
                type="button"
                onClick={() => {
                  onProposeUpdate(record);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                title="Suggest corrections or updated details for this identifier to Admin for approval"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span>Suggest Correction / Update</span>
              </button>
            )}
          </div>

          <button
            id="modal-close-footer-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
