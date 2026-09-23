/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { LiveIdentifierRecord } from '../types';
import {
  Building2,
  Landmark,
  Search,
  Download,
  Database,
  ArrowUpDown,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

interface OrganisationWiseCountProps {
  liveIdentifiers: LiveIdentifierRecord[];
  onDownloadOverallData?: () => void;
  isDownloadingOverall?: boolean;
}

interface OrgGroupItem {
  organisationName: string;
  count: number;
  orgType: 'Bank' | 'NBFC';
  percentage: number;
}

export const OrganisationWiseCount: React.FC<OrganisationWiseCountProps> = ({
  liveIdentifiers,
  onDownloadOverallData,
  isDownloadingOverall = false,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Bank' | 'NBFC'>('ALL');
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Compute live breakdown directly from Firebase liveIdentifiers
  const organisationBreakdown = useMemo(() => {
    const totalCount = liveIdentifiers.length;
    const map: Record<string, { count: number; orgType: 'Bank' | 'NBFC' }> = {};

    liveIdentifiers.forEach((item) => {
      const rawOrg =
        item.organisationName ||
        item.bankName ||
        item.rawColumns?.['Organisation Name'] ||
        item.rawColumns?.['Bank/NBFC Name'] ||
        item.rawColumns?.['Bank Name'] ||
        'Unspecified Organisation';

      const orgName = rawOrg.trim() || 'Unspecified Organisation';

      const detectedType: 'Bank' | 'NBFC' =
        item.orgType === 'NBFC' ||
        item.rawColumns?.['Bank-NBFC'] === 'NBFC' ||
        item.rawColumns?.['Type'] === 'NBFC' ||
        (!orgName.toLowerCase().includes('bank') &&
          (orgName.toLowerCase().includes('finance') ||
            orgName.toLowerCase().includes('capital') ||
            orgName.toLowerCase().includes('credit') ||
            orgName.toLowerCase().includes('housing')))
          ? 'NBFC'
          : 'Bank';

      if (!map[orgName]) {
        map[orgName] = {
          count: 0,
          orgType: detectedType,
        };
      }
      map[orgName].count += 1;
    });

    const list: OrgGroupItem[] = Object.entries(map).map(([orgName, data]) => ({
      organisationName: orgName,
      count: data.count,
      orgType: data.orgType,
      percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0,
    }));

    return list;
  }, [liveIdentifiers]);

  // Filter and sort the breakdown
  const filteredAndSortedList = useMemo(() => {
    let result = organisationBreakdown;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      result = result.filter((item) =>
        item.organisationName.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'ALL') {
      result = result.filter((item) => item.orgType === typeFilter);
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'count') {
        return sortOrder === 'desc'
          ? b.count - a.count || a.organisationName.localeCompare(b.organisationName)
          : a.count - b.count || a.organisationName.localeCompare(b.organisationName);
      } else {
        return sortOrder === 'desc'
          ? b.organisationName.localeCompare(a.organisationName)
          : a.organisationName.localeCompare(b.organisationName);
      }
    });
  }, [organisationBreakdown, searchFilter, typeFilter, sortBy, sortOrder]);

  // Summary statistics
  const totalOrganisations = organisationBreakdown.length;
  const totalLiveRecords = liveIdentifiers.length;
  const bankCount = organisationBreakdown.filter((o) => o.orgType === 'Bank').length;
  const nbfcCount = organisationBreakdown.filter((o) => o.orgType === 'NBFC').length;
  const topOrg = organisationBreakdown.length > 0
    ? [...organisationBreakdown].sort((a, b) => b.count - a.count)[0]
    : null;

  const toggleSort = (newSortBy: 'count' | 'name') => {
    if (sortBy === newSortBy) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  return (
    <div id="organisation-wise-count-section" className="space-y-6">
      {/* Category Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-200/60 text-indigo-700">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Organisation Wise Count
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Firestore Synchronized
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time count of Hunter Identifiers available under each Bank & NBFC
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action: Download Overall Identifier Details */}
          {onDownloadOverallData && (
            <button
              id="org-count-download-all-btn"
              type="button"
              onClick={onDownloadOverallData}
              disabled={isDownloadingOverall}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Download entire current Firebase dataset in ONE CSV file"
            >
              <Download className="w-4 h-4" />
              <span>
                {isDownloadingOverall
                  ? 'Generating Overall CSV...'
                  : 'Download Overall Identifier Details'}
              </span>
            </button>
          )}
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Organisations
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {totalOrganisations}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              {bankCount} Banks • {nbfcCount} NBFCs
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/60">
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
              Total Live Identifiers
            </span>
            <div className="text-xl sm:text-2xl font-black text-indigo-900 mt-0.5">
              {totalLiveRecords.toLocaleString()}
            </div>
            <span className="text-[10px] text-indigo-600 font-medium">
              Firebase Single Source of Truth
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Average per Org
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {totalOrganisations > 0
                ? (totalLiveRecords / totalOrganisations).toFixed(1)
                : '0'}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Identifiers per institution
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
              Top Organisation
            </span>
            <div className="text-sm font-black text-emerald-950 mt-1 truncate" title={topOrg?.organisationName}>
              {topOrg ? topOrg.organisationName : '—'}
            </div>
            <span className="text-[10px] text-emerald-700 font-bold">
              {topOrg ? `${topOrg.count} identifiers (${topOrg.percentage.toFixed(1)}%)` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Table Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="org-wise-search-input"
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by organisation or bank name..."
              className="w-full pl-9 pr-4 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* Org Type Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All ({organisationBreakdown.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('Bank')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                typeFilter === 'Bank'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Banks ({bankCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('NBFC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                typeFilter === 'NBFC'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              NBFCs ({nbfcCount})
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table id="organisation-wise-count-table" className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 uppercase tracking-wider text-[10px] font-black border-b border-slate-200">
                <th className="py-3 px-4 w-16 text-center">#</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1.5 hover:text-slate-900 cursor-pointer font-black"
                  >
                    <span>Organisation Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4 w-32">Classification</th>
                <th className="py-3 px-4 w-40 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('count')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer font-black ml-auto"
                  >
                    <span>Identifier Count</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="py-3 px-4 w-48 text-right">% Share of Database</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAndSortedList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No organisations match your search criteria</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try clearing or changing your filter keyword</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedList.map((item, index) => {
                  return (
                    <tr
                      key={item.organisationName}
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      {/* S.No / Rank */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400 text-[11px]">
                        {index + 1}
                      </td>

                      {/* Organisation Name (UNMASKED) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              item.orgType === 'Bank'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {item.orgType === 'Bank' ? (
                              <Landmark className="w-3.5 h-3.5" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <span className="font-black text-slate-900 text-xs block group-hover:text-indigo-700 transition-colors">
                              {item.organisationName}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              Single source of truth: Cloud Firestore
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Classification Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            item.orgType === 'Bank'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {item.orgType}
                        </span>
                      </td>

                      {/* Identifier Count */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-900 text-white font-mono font-black text-xs shadow-2xs">
                          {item.count.toLocaleString()}
                        </span>
                      </td>

                      {/* % Share Progress Bar */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200 shrink-0">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(3, item.percentage))}%` }}
                            />
                          </div>
                          <span className="font-mono text-slate-600 font-bold text-xs w-11 text-right">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Showing {filteredAndSortedList.length} of {totalOrganisations} organisations
            </span>
          </div>
          <span className="font-medium text-slate-400">
            Calculated automatically in real-time from collection: <code className="text-slate-700 font-mono">live_identifiers</code>
          </span>
        </div>
      </div>
    </div>
  );
};
