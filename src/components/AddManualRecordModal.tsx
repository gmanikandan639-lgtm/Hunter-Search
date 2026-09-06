/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Hash,
  Landmark,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Check,
} from 'lucide-react';

export type OrgTypeOption = 'Bank' | 'NBFC';

export interface ManualRecordInput {
  id?: string;
  hunterId: string;
  bankName: string;
  orgType?: OrgTypeOption;
  name?: string;
  accountNumber?: string;
  mobile?: string;
  pan?: string;
  status?: string;
  remarks?: string;
  notes?: string;
  rawColumns?: Record<string, string>;
}

interface AddManualRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recordData: ManualRecordInput) => void;
  uniqueBanks: string[];
  currentHeaders?: string[];
  initialRecord?: {
    id?: string;
    hunterId: string;
    bankName: string;
    orgType?: OrgTypeOption;
    name?: string;
    accountNumber?: string;
    mobile?: string;
    pan?: string;
    status?: string;
    remarks?: string;
    notes?: string;
    rawColumns?: Record<string, string>;
  } | null;
}

export const AddManualRecordModal: React.FC<AddManualRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  uniqueBanks,
  initialRecord,
}) => {
  const isEditing = Boolean(initialRecord?.id);

  const [hunterId, setHunterId] = useState(initialRecord?.hunterId || '');
  const [orgType, setOrgType] = useState<OrgTypeOption>(
    (initialRecord?.orgType as OrgTypeOption) ||
      (initialRecord?.rawColumns?.['Bank-NBFC'] as OrgTypeOption) ||
      (initialRecord?.rawColumns?.['Type'] as OrgTypeOption) ||
      'Bank'
  );
  const [bankName, setBankName] = useState(initialRecord?.bankName || '');
  const [customBank, setCustomBank] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sync state when initialRecord changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialRecord) {
        setHunterId(initialRecord.hunterId || '');
        const detectedType =
          (initialRecord.orgType as OrgTypeOption) ||
          (initialRecord.rawColumns?.['Bank-NBFC'] as OrgTypeOption) ||
          (initialRecord.rawColumns?.['Type'] as OrgTypeOption) ||
          'Bank';
        setOrgType(detectedType === 'NBFC' ? 'NBFC' : 'Bank');

        if (uniqueBanks.includes(initialRecord.bankName)) {
          setBankName(initialRecord.bankName);
          setCustomBank('');
        } else if (initialRecord.bankName) {
          setBankName('__NEW__');
          setCustomBank(initialRecord.bankName);
        } else {
          setBankName('');
          setCustomBank('');
        }
      } else {
        setHunterId('');
        setOrgType('Bank');
        setBankName('');
        setCustomBank('');
      }
      setError(null);
    }
  }, [isOpen, initialRecord, uniqueBanks]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanHunterId = hunterId.trim();
    const effectiveBank = (bankName === '__NEW__' ? customBank : bankName).trim();

    if (!cleanHunterId) {
      setError('Hunter Identifier is required.');
      return;
    }

    if (!orgType) {
      setError('Please select Bank or NBFC.');
      return;
    }

    if (!effectiveBank) {
      setError('Organisation Name is required.');
      return;
    }

    const payload: ManualRecordInput = {
      id: initialRecord?.id,
      hunterId: cleanHunterId,
      bankName: effectiveBank,
      orgType: orgType,
      name: cleanHunterId,
      status: 'Active Reference',
      rawColumns: {
        'Hunter Identification Number': cleanHunterId,
        'Bank-NBFC': orgType,
        'Type': orgType,
        'Bank/NBFC Name': effectiveBank,
        'Organisation Name': effectiveBank,
        'Status': 'Active Reference',
        ...(initialRecord?.rawColumns || {}),
      },
    };

    onSave(payload);
    onClose();
  };

  return (
    <div
      id="add-manual-record-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="add-manual-record-modal"
        className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-8 scale-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 flex items-center justify-between text-white border-b border-indigo-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="add-record-modal-title" className="text-base font-extrabold text-white">
                  {isEditing ? 'Edit Hunter Identifier' : 'Add Hunter Identifier Manually'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-600/40 text-indigo-200 border border-indigo-500/30">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isEditing
                  ? 'Update existing Hunter Identifier details in the central database'
                  : 'Register a new reference identifier directly into the central search database'}
              </p>
            </div>
          </div>
          <button
            id="add-record-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs text-slate-700">
          {error && (
            <div
              id="add-record-validation-error"
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category 1: Hunter Identifier */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
              <Hash className="w-3.5 h-3.5 text-indigo-600" />
              <span>Hunter Identifier</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-800">
                Hunter Identifier Number <span className="text-rose-500">*</span>
              </label>
              <input
                id="manual-hunter-id-input"
                type="text"
                required
                value={hunterId}
                onChange={(e) => setHunterId(e.target.value)}
                placeholder="e.g. 2024061800299 or REF-9901"
                className="w-full px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-hidden"
              />
              <span className="text-[10px] text-slate-400">
                Primary key for fuzzy and exact similarity matching
              </span>
            </div>
          </div>

          {/* Category 2: Bank-NBFC (Select Bank or NBFC) */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
              <Landmark className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bank-NBFC</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-800">
                Institution Classification <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="select-type-bank-btn"
                  onClick={() => setOrgType('Bank')}
                  className={`px-4 py-3 rounded-2xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                    orgType === 'Bank'
                      ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold ${
                        orgType === 'Bank'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold">Bank</div>
                      <div className="text-[10px] text-slate-400 font-normal">Commercial / PSU / Private</div>
                    </div>
                  </div>
                  {orgType === 'Bank' && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  id="select-type-nbfc-btn"
                  onClick={() => setOrgType('NBFC')}
                  className={`px-4 py-3 rounded-2xl border text-left font-bold transition-all flex items-center justify-between cursor-pointer ${
                    orgType === 'NBFC'
                      ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold ${
                        orgType === 'NBFC'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold">NBFC</div>
                      <div className="text-[10px] text-slate-400 font-normal">Non-Banking Financial Co.</div>
                    </div>
                  </div>
                  {orgType === 'NBFC' && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Category 3: Organisation Name */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Organisation Name</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-800">
                Organisation Name <span className="text-rose-500">*</span>
              </label>
              <select
                id="manual-bank-select"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-indigo-600 outline-hidden cursor-pointer"
              >
                <option value="">-- Select Organisation Name --</option>
                {uniqueBanks.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
                <option value="__NEW__">+ Add New Organisation</option>
              </select>

              {bankName === '__NEW__' && (
                <input
                  id="manual-custom-bank-input"
                  type="text"
                  required
                  value={customBank}
                  onChange={(e) => setCustomBank(e.target.value)}
                  placeholder="Enter Organisation Name (e.g. HDFC Bank Ltd, Shriram Finance Ltd)"
                  className="w-full mt-2 px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-indigo-400 rounded-xl focus:ring-2 focus:ring-indigo-100 outline-hidden"
                />
              )}
            </div>
          </div>

          {/* Actions: Submit and Cancel */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              id="manual-record-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="manual-record-submit-btn"
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Update Identifier' : 'Submit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


