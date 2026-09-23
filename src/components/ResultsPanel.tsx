/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CSVMetadata,
  SearchResultItem,
  RecordItem,
} from '../types';
import { maskIdentifierNumber } from '../utils/masking';
import {
  Database,
  Search,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileSearch,
  ChevronRight,
} from 'lucide-react';

interface ResultsPanelProps {
  results: SearchResultItem[];
  hasSearched: boolean;
  searchQuery: string;
  isSearching: boolean;
  csvMetadata: CSVMetadata;
  threshold: number;
  isAdmin?: boolean;
  onSelectRecord: (record: RecordItem, score: number, matchedFields: any[]) => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  hasSearched,
  searchQuery,
  isSearching,
  csvMetadata,
  threshold,
  isAdmin = false,
  onSelectRecord,
}) => {
  const [confidenceFilter, setConfidenceFilter] = useState<'ALL' | 'VERY_HIGH' | 'HIGH' | 'POSSIBLE'>('ALL');
  const [sortBy, setSortBy] = useState<'SCORE_DESC' | 'BANK_NAME' | 'REC_ID'>('SCORE_DESC');

  const hasActiveDatabase = csvMetadata.status === 'ACTIVE' && csvMetadata.recordCount > 0;
  const isQueryActive = Boolean(searchQuery.trim() && hasSearched);

  // Filter and Sort results
  const filteredResults = results
    .filter((item) => {
      if (confidenceFilter === 'ALL') return true;
      return item.confidence === confidenceFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'SCORE_DESC') return b.score - a.score;
      if (sortBy === 'BANK_NAME') return (a.record.bankName || '').localeCompare(b.record.bankName || '');
      if (sortBy === 'REC_ID') return (a.record.id || '').localeCompare(b.record.id || '');
      return 0;
    });

  const getScoreBadge = (score: number) => {
    if (score >= 90) {
      return {
        label: 'Very High Match',
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        barBg: 'bg-emerald-500',
      };
    }
    if (score >= 80) {
      return {
        label: 'High Match',
        bg: 'bg-blue-50 text-blue-700 border-blue-300',
        barBg: 'bg-blue-600',
      };
    }
    if (score >= 70) {
      return {
        label: 'Possible Match',
        bg: 'bg-amber-50 text-amber-800 border-amber-300',
        barBg: 'bg-amber-500',
      };
    }
    return {
      label: 'Low Match',
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      barBg: 'bg-slate-400',
    };
  };

  return (
    <div id="hunter-results-panel" className="w-full space-y-5">
      {/* Main Results Section Card */}
      <div id="hunter-match-results-card" className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Results Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 id="results-heading" className="text-base font-extrabold text-slate-900 tracking-tight">
                Hunter Match Results
              </h2>

              {/* Highlighting Matching Status (Match Found vs No Match Found) */}
              {hasActiveDatabase && isQueryActive && !isSearching && (
                results.length > 0 ? (
                  <span
                    id="status-match-found"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Match Found ({results.length})</span>
                  </span>
                ) : (
                  <span
                    id="status-no-match-found"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                    <span>No Match Found</span>
                  </span>
                )
              )}
            </div>

            {hasActiveDatabase && isQueryActive && searchQuery && (
              <p className="text-xs text-slate-500 mt-1">
                Identifier Query: <span className="font-bold text-slate-800 font-mono">"{searchQuery}"</span>
              </p>
            )}
            {hasActiveDatabase && !isQueryActive && (
              <p className="text-xs text-slate-500 mt-1">
                Enter an identifier on the left to verify records across active Bank & NBFC collections
              </p>
            )}
          </div>

          {/* Action Bar (Confidence Filters) */}
          {hasActiveDatabase && isQueryActive && results.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Confidence filter pills */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setConfidenceFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    confidenceFilter === 'ALL'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({results.length})
                </button>
                <button
                  onClick={() => setConfidenceFilter('VERY_HIGH')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    confidenceFilter === 'VERY_HIGH'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ≥90%
                </button>
                <button
                  onClick={() => setConfidenceFilter('HIGH')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    confidenceFilter === 'HIGH'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  80-89%
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Body: Empty States vs. Result Table/Cards */}
        <div className="p-0">
          {/* 1. Database Cleared / Empty State */}
          {!hasActiveDatabase && (
            <div id="state-database-cleared" className="p-14 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                <Database className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  No reference database loaded.
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The reference database is currently empty. Please log in as an administrator to upload an active dataset.
                </p>
              </div>
            </div>
          )}

          {/* 2. Loading State */}
          {hasActiveDatabase && isSearching && (
            <div id="state-searching" className="p-14 text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-9 w-9 border-3 border-indigo-600 border-t-transparent"></div>
              <p className="text-sm font-bold text-slate-800">
                Searching active reference database...
              </p>
              <p className="text-xs text-slate-500">
                Executing multi-rule identifier and similarity matching against active records.
              </p>
            </div>
          )}

          {/* 3. Empty Search Bar / Initial Verification State */}
          {hasActiveDatabase && !isSearching && !isQueryActive && (
            <div id="state-empty-initial" className="p-8 sm:p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <ShieldCheck className="w-7 h-7 text-indigo-600" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <p
                  id="hunter-initial-instruction-message"
                  className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed"
                >
                  Enter an identifier or reference number to verify.
                </p>
                <p className="text-xs text-slate-500">
                  Type any numbers, letters, or identifier details in the search bar on the left to search in real time.
                </p>
              </div>
            </div>
          )}

          {/* 4. No Results Found State */}
          {hasActiveDatabase && !isSearching && isQueryActive && results.length === 0 && (
            <div id="state-no-results" className="p-14 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">
                No matching records found in active database.
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                No records matched "<span className="font-bold text-slate-700 font-mono">{searchQuery}</span>" with a similarity score of ≥{threshold}%.
              </p>
            </div>
          )}

          {/* 5. Results Table: VISIBLE ONLY IDENTIFIER NUMBER AND BANK NAME */}
          {hasActiveDatabase && !isSearching && isQueryActive && results.length > 0 && (
            <div className="overflow-x-auto">
              <table id="hunter-results-table" className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-36">Match Score</th>
                    <th className="py-3 px-4">Identifier</th>
                    <th className="py-3 px-4 bg-indigo-50/40 text-indigo-950 font-extrabold">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Bank Name</span>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredResults.map((item, idx) => {
                    const badge = getScoreBadge(item.score);

                    return (
                      <tr
                        key={item.record.id + idx}
                        onClick={() =>
                          onSelectRecord(item.record, item.score, item.matchedFields)
                        }
                        className="hover:bg-indigo-50/40 cursor-pointer transition-colors group"
                      >
                        {/* Match Score */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-extrabold text-slate-900">
                                {item.score}%
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            {/* Score visual bar */}
                            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${badge.barBg}`}
                                style={{ width: `${item.score}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Visible: Hunter Identifier Number */}
                        <td className="py-3.5 px-4 align-top">
                          <div>
                            <p className="font-bold font-mono text-slate-900 text-xs group-hover:text-indigo-700 transition-colors">
                              {isAdmin
                                ? (item.record.hunterId || item.record.identifier || item.record.name || item.record.id)
                                : maskIdentifierNumber(item.record.hunterId || item.record.identifier || item.record.name || item.record.id)}
                            </p>
                          </div>
                        </td>

                        {/* Visible: Bank Name */}
                        <td className="py-3.5 px-4 align-top bg-indigo-50/30">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 shadow-2xs">
                            <Building2 className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                            <span className="font-bold text-indigo-950 text-xs tracking-tight">
                              {item.record.bankName || 'Unspecified Bank'}
                            </span>
                          </div>
                        </td>

                        {/* Action: View Details */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <button
                            id={`row-view-btn-${idx}`}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRecord(item.record, item.score, item.matchedFields);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 border border-indigo-200 text-xs font-bold transition-colors cursor-pointer"
                            title="View identifier details"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3 h-3 text-indigo-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
