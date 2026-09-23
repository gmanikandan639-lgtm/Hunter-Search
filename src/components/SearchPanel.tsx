/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BRAND } from '../assets/branding';
import {
  CSVMetadata,
  SearchFilters,
  AdminSession,
} from '../types';
import {
  Search,
  X,
  ShieldCheck,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';

interface SearchPanelProps {
  csvMetadata: CSVMetadata;
  uniqueBanks: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onExecuteSearch: () => void;
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  isSearching: boolean;
  onRemapColumns?: (nameCol: string, bankCol: string) => void;
  adminSession?: AdminSession | null;
  onOpenAddManualRecord?: () => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  csvMetadata,
  searchQuery,
  setSearchQuery,
  onExecuteSearch,
  isSearching,
  adminSession,
  onOpenAddManualRecord,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const typingTimerRef = React.useRef<any>(null);

  const hasActiveData = csvMetadata.status === 'ACTIVE' && csvMetadata.recordCount > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (validationError) setValidationError(null);
    setIsTyping(true);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1500);
  };

  // Running animated border is active when typing, focusing on search bar, or searching
  const isRunningBorderActive = isSearching || isTyping || isFocused;

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!searchQuery.trim()) {
      setValidationError('Please enter or paste a Hunter Identifier to search.');
      return;
    }
    if (isSearching) {
      return;
    }
    setValidationError(null);
    onExecuteSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const handleClearInput = () => {
    setSearchQuery('');
    setValidationError(null);
  };

  const quickHunterIdentifiers = [
    { label: '2024061800212', desc: 'SHR*RAM FIN@NCE' },
    { label: 'DSA25BL14994624BL', desc: 'KOTA* MAH*NDRA' },
    { label: 'UBLF2400010190', desc: 'Un*ty small finance' },
    { label: 'TAT@ CAP*TAL', desc: 'NBFC Entity' },
    { label: '3000CA0018100', desc: 'TVS CRED*T' },
    { label: '2012180569454', desc: 'YE$ B@NK' },
  ];

  return (
    <div id="hunter-search-left-panel" className="w-full space-y-4">
      {/* ADMIN-ONLY SECTION: Add Hunter Identifier Manually */}
      {adminSession?.isAuthenticated && onOpenAddManualRecord && (
        <div
          id="admin-search-page-controls"
          className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl border border-indigo-800/40 shadow-sm text-white space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-200">
                Admin Privileges Active
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
              {adminSession.name}
            </span>
          </div>

          <button
            id="admin-add-hunter-identifier-btn"
            type="button"
            onClick={onOpenAddManualRecord}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs tracking-wide shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add Hunter Identifier Manually</span>
          </button>
        </div>
      )}

      {/* DEDICATED SEARCH PANEL: Hunter Identification Search */}
      <div
        id="hunter-identification-search-card"
        className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-5"
      >
        {/* Panel Heading */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 shadow-sm">
              <img
                src={BRAND.shieldIcon}
                alt="Fraud Risk Hub"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1
                id="hunter-search-heading"
                className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2"
              >
                Hunter Identification Search
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Enter or paste a Hunter Identifier Number to identify matching Bank / NBFC records.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-md text-[10px] font-extrabold bg-slate-900 text-white tracking-wider">
            FRAUD RISK HUB
          </span>
        </div>

        {/* Search Bar Input & Action Controls */}
        <form onSubmit={handleSearchSubmit} className="space-y-3" noValidate>
          <label
            htmlFor="hunter-identifier-input"
            className="block text-xs font-bold text-slate-900 uppercase tracking-wider"
          >
            Hunter Identifier Number
          </label>

          <div
            id="hunter-search-input-wrapper"
            className={`relative rounded-xl p-[2px] transition-all duration-300 ${
              isRunningBorderActive ? 'hunter-search-running-border' : 'bg-transparent'
            }`}
          >
            <div className="relative z-10 rounded-[10px] overflow-hidden bg-white">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4 text-indigo-600" />
              </div>

              <input
                id="hunter-identifier-input"
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Enter or paste Hunter Identifier…"
                className={`w-full pl-10 pr-10 py-3.5 bg-slate-50 hover:bg-white focus:bg-white text-slate-900 text-sm font-medium rounded-[10px] border transition-all outline-hidden placeholder:text-slate-400 ${
                  isRunningBorderActive
                    ? 'border-transparent focus:border-transparent'
                    : validationError
                    ? 'border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-100'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
                }`}
              />

              {searchQuery && (
                <button
                  id="clear-search-input-btn"
                  type="button"
                  onClick={handleClearInput}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Inline Validation Error */}
          {validationError && (
            <div
              id="search-validation-error"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Action Buttons: Search Hunter, Add/Update Identifier & Clear/Reset */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              id="search-hunter-btn"
              type="submit"
              disabled={isSearching || !hasActiveData}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-300 text-white font-extrabold text-xs tracking-wide shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isSearching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search Hunter</span>
                </>
              )}
            </button>

            <button
              id="reset-search-btn"
              type="button"
              onClick={handleClearInput}
              disabled={!searchQuery && !validationError}
              className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
              title="Clear / Reset search query"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Quick Sample Hunter Identifiers */}
        <div className="pt-3 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Sample Hunter Identifiers:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickHunterIdentifiers.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchQuery(item.label);
                  setValidationError(null);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 hover:border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title={`Click to test with ${item.desc}`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] font-sans text-slate-400 font-normal">
                  ({item.desc})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
