/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { LiveIdentifierRecord } from '../types';
import {
  Building2,
  Landmark,
  Search,
  Download,
  ArrowUpDown,
  CheckCircle2,
  X,
  Edit3,
  Trash2,
  CheckCircle,
  Clock,
  ChevronRight,
  Layers,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react';

export interface OrganisationWiseCountProps {
  liveIdentifiers: LiveIdentifierRecord[];
  onDownloadOverallData?: () => void;
  isDownloadingOverall?: boolean;
  onEditRecord?: (record: LiveIdentifierRecord) => void;
  onDeleteRecord?: (recordId: string, identifierName?: string) => void;
}

export interface OrgGroupItem {
  organisationName: string;
  count: number;
  orgType: 'Bank' | 'NBFC';
  percentage: number;
}

export const getOrgName = (item: LiveIdentifierRecord): string => {
  const rawOrg =
    item.organisationName ||
    item.bankName ||
    item.rawColumns?.['Organisation Name'] ||
    item.rawColumns?.['Bank/NBFC Name'] ||
    item.rawColumns?.['Bank Name'] ||
    'Unspecified Organisation';

  return rawOrg.trim() || 'Unspecified Organisation';
};

export const getOrgType = (item: LiveIdentifierRecord, orgName: string): 'Bank' | 'NBFC' => {
  if (
    item.orgType === 'NBFC' ||
    item.rawColumns?.['Bank-NBFC'] === 'NBFC' ||
    item.rawColumns?.['Type'] === 'NBFC' ||
    (!orgName.toLowerCase().includes('bank') &&
      (orgName.toLowerCase().includes('finance') ||
        orgName.toLowerCase().includes('capital') ||
        orgName.toLowerCase().includes('credit') ||
        orgName.toLowerCase().includes('housing')))
  ) {
    return 'NBFC';
  }
  return 'Bank';
};

export const OrganisationWiseCount: React.FC<OrganisationWiseCountProps> = ({
  liveIdentifiers,
  onDownloadOverallData,
  isDownloadingOverall = false,
  onEditRecord,
  onDeleteRecord,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Bank' | 'NBFC'>('ALL');
  const [sortBy, setSortBy] = useState<'count' | 'name'>('count');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Selected Organisation State
  const [selectedOrgName, setSelectedOrgName] = useState<string | null>(null);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');
  const [orgPage, setOrgPage] = useState(1);
  const [orgRowsPerPage, setOrgRowsPerPage] = useState(10);
  const detailsSectionRef = useRef<HTMLDivElement | null>(null);

  // Compute live breakdown directly from Firebase liveIdentifiers
  const organisationBreakdown = useMemo(() => {
    const totalCount = liveIdentifiers.length;
    const map: Record<string, { count: number; orgType: 'Bank' | 'NBFC' }> = {};

    liveIdentifiers.forEach((item) => {
      const orgName = getOrgName(item);
      const detectedType = getOrgType(item, orgName);

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

  // Selected Organisation Identifiers filtered strictly from Firebase liveIdentifiers
  const selectedOrgIdentifiers = useMemo(() => {
    if (!selectedOrgName) return [];
    const target = selectedOrgName.toLowerCase().trim();
    return liveIdentifiers.filter(
      (item) => getOrgName(item).toLowerCase().trim() === target
    );
  }, [liveIdentifiers, selectedOrgName]);

  // Detected organization item for currently selected organisation
  const selectedOrgItem = useMemo(() => {
    if (!selectedOrgName) return null;
    return organisationBreakdown.find(
      (o) => o.organisationName.toLowerCase() === selectedOrgName.toLowerCase()
    ) || null;
  }, [organisationBreakdown, selectedOrgName]);

  // Filter within selected organisation
  const filteredSelectedIdentifiers = useMemo(() => {
    if (!orgSearchQuery.trim()) return selectedOrgIdentifiers;
    const q = orgSearchQuery.toLowerCase().trim();
    return selectedOrgIdentifiers.filter((item) => {
      const idVal = (item.identifier || item.hunterId || item.id || '').toLowerCase();
      const detailsVal = (item.details || item.remarks || '').toLowerCase();
      const nameVal = (item.name || '').toLowerCase();
      const catVal = (item.category || '').toLowerCase();
      return idVal.includes(q) || detailsVal.includes(q) || nameVal.includes(q) || catVal.includes(q);
    });
  }, [selectedOrgIdentifiers, orgSearchQuery]);

  // Pagination for selected organisation identifiers
  const totalOrgPages = Math.max(1, Math.ceil(filteredSelectedIdentifiers.length / orgRowsPerPage));
  const paginatedSelectedIdentifiers = useMemo(() => {
    const start = (orgPage - 1) * orgRowsPerPage;
    return filteredSelectedIdentifiers.slice(start, start + orgRowsPerPage);
  }, [filteredSelectedIdentifiers, orgPage, orgRowsPerPage]);

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

  const handleSelectOrg = (orgName: string) => {
    setSelectedOrgName(orgName);
    setOrgSearchQuery('');
    setOrgPage(1);
    setTimeout(() => {
      detailsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const handleClearSelection = () => {
    setSelectedOrgName(null);
    setOrgSearchQuery('');
    setOrgPage(1);
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
                  Real-time count of Hunter Identifiers available under each Bank & NBFC. Click any organisation to view its identifiers below.
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
                <th className="py-3 px-4 w-28 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAndSortedList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No organisations match your search criteria</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try clearing or changing your filter keyword</p>
                  </td>
                </tr>
              ) : (
                filteredAndSortedList.map((item, index) => {
                  const isSelected =
                    selectedOrgName?.toLowerCase() === item.organisationName.toLowerCase();

                  return (
                    <tr
                      key={item.organisationName}
                      id={`org-row-${item.organisationName.replace(/\s+/g, '-').toLowerCase()}`}
                      onClick={() => handleSelectOrg(item.organisationName)}
                      className={`transition-colors cursor-pointer group select-none ${
                        isSelected
                          ? 'bg-indigo-50/90 border-l-4 border-indigo-600 font-bold'
                          : 'hover:bg-indigo-50/40'
                      }`}
                      title={`Click to inspect all identifiers for ${item.organisationName}`}
                    >
                      {/* S.No / Rank */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400 text-[11px]">
                        {index + 1}
                      </td>

                      {/* Organisation Name (CLICKABLE) */}
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
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-black text-xs block transition-colors ${
                                  isSelected
                                    ? 'text-indigo-800'
                                    : 'text-slate-900 group-hover:text-indigo-700'
                                }`}
                              >
                                {item.organisationName}
                              </span>
                              {isSelected && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">
                                  <span>Viewing</span>
                                  <ChevronRight className="w-3 h-3" />
                                </span>
                              )}
                            </div>
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
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-mono font-black text-xs shadow-2xs ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-900 text-white'
                          }`}
                        >
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

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOrg(item.organisationName);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          <span>{isSelected ? 'Viewing' : 'View'}</span>
                        </button>
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

      {/* =================================================================== */}
      {/* IDENTIFIER DETAILS BELOW THE SELECTED ORGANISATION (LIVE FIRESTORE) */}
      {/* =================================================================== */}
      {selectedOrgName && (
        <div
          ref={detailsSectionRef}
          id="selected-organisation-identifiers-section"
          className="bg-white rounded-2xl border border-indigo-200 shadow-md p-6 space-y-5 animate-in fade-in slide-in-from-top-3 duration-200"
        >
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
                  <Layers className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Selected Organisation:
                </span>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {selectedOrgName}
                </h3>
                {selectedOrgItem && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                      selectedOrgItem.orgType === 'NBFC'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {selectedOrgItem.orgType}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>Identifiers Available for <strong>{selectedOrgName}</strong>:</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Total Identifiers: {selectedOrgIdentifiers.length}
                </span>
                <span className="text-[11px] text-slate-400">
                  • Current Firebase Firestore live data
                </span>
              </div>
            </div>

            {/* Clear / Close Selection Action Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="close-org-details-btn"
                type="button"
                onClick={handleClearSelection}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                title="Close identifier details and return to full list"
              >
                <X className="w-4 h-4 text-slate-600" />
                <span>Close Details</span>
              </button>
            </div>
          </div>

          {/* Search & Page Control Bar within Selected Organisation */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-within-org-input"
                type="text"
                value={orgSearchQuery}
                onChange={(e) => {
                  setOrgSearchQuery(e.target.value);
                  setOrgPage(1);
                }}
                placeholder={`Search identifier in ${selectedOrgName}...`}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:border-indigo-600 outline-hidden font-medium text-slate-900"
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={orgRowsPerPage}
                  onChange={(e) => {
                    setOrgRowsPerPage(Number(e.target.value));
                    setOrgPage(1);
                  }}
                  className="px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold focus:border-indigo-600 outline-hidden cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div>
                Showing <span className="font-bold text-slate-800">{filteredSelectedIdentifiers.length}</span> of {selectedOrgIdentifiers.length} identifiers
              </div>
            </div>
          </div>

          {/* Identifier Table for Selected Organisation */}
          {filteredSelectedIdentifiers.length === 0 ? (
            <div className="p-8 text-center space-y-2 bg-slate-50/50 rounded-xl border border-slate-200">
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-800">
                {orgSearchQuery
                  ? `No matching identifiers found for "${orgSearchQuery}"`
                  : `No identifiers currently available for ${selectedOrgName}`}
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {orgSearchQuery
                  ? 'Try clearing or modifying your search keywords.'
                  : 'New identifiers added under this organisation will immediately show here via real-time Firestore sync.'}
              </p>
              {orgSearchQuery && (
                <button
                  type="button"
                  onClick={() => setOrgSearchQuery('')}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Clear search filter
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table id="selected-org-identifiers-table" className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 w-16 text-center">S.No</th>
                    <th className="py-3 px-4">Identifier</th>
                    <th className="py-3 px-4">Organisation Name</th>
                    <th className="py-3 px-4">Organization Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Details / Remarks</th>
                    {(onEditRecord || onDeleteRecord) && (
                      <th className="py-3 px-4 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedSelectedIdentifiers.map((item, index) => {
                    const serialNum = (orgPage - 1) * orgRowsPerPage + index + 1;
                    const identifierVal = item.identifier || item.hunterId || item.id;
                    const orgDisplayName = item.organisationName || item.bankName || selectedOrgName;
                    const detectedType = getOrgType(item, orgDisplayName);
                    const isApproved = item.status === 'approved' || item.status === 'live' || !item.status;

                    return (
                      <tr
                        key={item.id || `${identifierVal}-${serialNum}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* 1. S.No / Serial Number */}
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-400 text-xs">
                          {serialNum}
                        </td>

                        {/* 2. Identifier (UNMASKED FOR ADMIN) */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-900">
                            {identifierVal}
                          </span>
                        </td>

                        {/* 3. Organisation Name */}
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{orgDisplayName}</span>
                          </div>
                        </td>

                        {/* 4. Organization Type */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                              detectedType === 'NBFC'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {detectedType}
                          </span>
                        </td>

                        {/* 5. Status / Approval State */}
                        <td className="py-3 px-4">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Live Search
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {item.status || 'Pending'}
                            </span>
                          )}
                        </td>

                        {/* 6. Details / Remarks */}
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate text-[11px]">
                          {item.details || item.remarks || item.name || '—'}
                        </td>

                        {/* 7. Actions (Edit / Delete) */}
                        {(onEditRecord || onDeleteRecord) && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {onEditRecord && (
                                <button
                                  type="button"
                                  onClick={() => onEditRecord(item)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 transition-colors inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                  title="Edit Identifier"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {onDeleteRecord && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteRecord(item.id, identifierVal)}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                  title="Delete from Firestore"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls for Selected Organisation */}
          {totalOrgPages > 1 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50/70 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Page <span className="font-bold text-slate-800">{orgPage}</span> of {totalOrgPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={orgPage === 1}
                  onClick={() => setOrgPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 font-semibold cursor-pointer text-xs"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={orgPage === totalOrgPages}
                  onClick={() => setOrgPage((p) => Math.min(totalOrgPages, p + 1))}
                  className="px-3 py-1 rounded-lg border border-slate-300 bg-white text-slate-700 disabled:opacity-40 font-semibold cursor-pointer text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
