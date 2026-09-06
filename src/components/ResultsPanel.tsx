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
  ChevronRight,
  ShieldCheck,
  FileSearch,
  Edit3,
} from 'lucide-react';

interface ResultsPanelProps {
  results: SearchResultItem[];
  hasSearched: boolean;
  searchQuery: string;
  isSearching: boolean;
  csvMetadata: CSVMetadata;
  threshold: number;
  onSelectRecord: (record: RecordItem, score: number, matchedFields: any[]) => void;
  onProposeUpdate?: (record: RecordItem) => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  hasSearched,
  searchQuery,
  isSearching,
  csvMetadata,
  threshold,
  onSelectRecord,
  onProposeUpdate,
}) => {
  const [confidenceFilter, setConfidenceFilter] = useState<'ALL' | 'VERY_HIGH' | 'HIGH' | 'POSSIBLE'>('ALL');
  const [sortBy, setSortBy] = useState<'SCORE_DESC' | 'BANK_NAME' | 'REC_ID'>('SCORE_DESC');

  const hasActiveDatabase = csvMetadata.status === 'ACTIVE' && csvMetadata.recordCount > 0;

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
              {hasActiveDatabase && hasSearched && !isSearching && (
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

            {hasActiveDatabase && hasSearched && searchQuery && (
              <p className="text-xs text-slate-500 mt-1">
                Identifier Query: <span className="font-bold text-slate-800 font-mono">"{searchQuery}"</span>
              </p>
            )}
          </div>

          {/* Action Bar (Confidence Filters) */}
          {hasActiveDatabase && hasSearched && results.length > 0 && (
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

          {/* 3. Before Search State (Initial Landing) */}
          {hasActiveDatabase && !isSearching && !hasSearched && (
            <div id="state-before-search" className="p-14 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
                <FileSearch className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-800">
                Enter a Hunter Identifier and click Search to view results.
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Use the left-side search panel to paste or enter any Hunter Identifier number.
              </p>
            </div>
          )}

          {/* 4. No Results Found State */}
          {hasActiveDatabase && !isSearching && hasSearched && results.length === 0 && (
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
          {hasActiveDatabase && !isSearching && hasSearched && results.length > 0 && (
            <div className="overflow-x-auto">
              <table id="hunter-results-table" className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">Match Score</th>
                    <th className="py-3 px-4">Identifier</th>
                    <th className="py-3 px-4 bg-indigo-50/40 text-indigo-950 font-extrabold">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Bank Name</span>
                      </div>
                    </th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4 text-right w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredResults.map((item, idx) => {
                    const badge = getScoreBadge(item.score);
                    const sourceText = item.record.source || (item.record.isCsvImport ? 'CSV Reference' : 'Manual Identifier');

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
                              {item.record.hunterId || item.record.identifier || item.record.name || item.record.id}
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

                        {/* Visible: Details */}
                        <td className="py-3.5 px-4 align-top">
                          <p className="text-slate-700 text-xs line-clamp-2 max-w-[200px]" title={item.record.details || item.record.notes || item.record.name}>
                            {item.record.details || item.record.notes || item.record.name || '—'}
                          </p>
                        </td>

                        {/* Visible: Source */}
                        <td className="py-3.5 px-4 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border truncate max-w-[130px] ${
                              sourceText.includes('Manual') || sourceText === 'manual_identifiers'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                            title={sourceText}
                          >
                            {sourceText}
                          </span>
                        </td>

                        {/* Action Details */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onProposeUpdate && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onProposeUpdate(item.record);
                                }}
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                title="Suggest corrections or update identifier details"
                              >
                                <Edit3 className="w-3 h-3 text-amber-700" />
                                <span className="hidden xl:inline">Update</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectRecord(item.record, item.score, item.matchedFields);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-600 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                              title="View Record Details"
                            >
                              <span>Details</span>
                              <ChevronRight className="w-3 h-3" />
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
        </div>
      </div>
    </div>
  );
};
