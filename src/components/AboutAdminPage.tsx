/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BRAND } from '../assets/branding';
import {
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  UserCheck,
  Activity,
  ArrowRight,
  Search,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';
import { CSVMetadata, AdminSession } from '../types';

interface AboutAdminPageProps {
  csvMetadata: CSVMetadata;
  adminSession: AdminSession | null;
  onNavigateToSearch: () => void;
  onNavigateToAdmin: () => void;
  onNavigateToLogin: () => void;
}

export const AboutAdminPage: React.FC<AboutAdminPageProps> = ({
  csvMetadata,
  adminSession,
  onNavigateToSearch,
  onNavigateToAdmin,
  onNavigateToLogin,
}) => {
  const capabilities = [
    {
      title: 'CSV-Based Reference Data',
      desc: 'Seamless ingestion and client-side indexing of arbitrary CSV datasets with automatic schema detection and zero remote transmission.',
      icon: FileSpreadsheet,
    },
    {
      title: 'Intelligent Fuzzy Matching',
      desc: 'Composite similarity algorithm combining token Jaccard, Trigram N-gram metrics, and Levenshtein distance for extreme typo tolerance.',
      icon: Sparkles,
    },
    {
      title: 'Similar-Name Identification',
      desc: 'Handles alphanumeric codes, multi-word inversions, character transpositions, and partial strings with high precision.',
      icon: UserCheck,
    },
    {
      title: 'Dynamic Match Scoring (50% - 100%)',
      desc: 'Visual confidence stratification (Very High ≥90%, High 80-89%, Possible 70-79%) with configurable threshold gates.',
      icon: Activity,
    },
    {
      title: 'Prominent Bank-Name Visibility',
      desc: 'Guaranteed primary visual emphasis for lending institutions, NBFCs, and banking entities across all verification results.',
      icon: Building2,
    },
    {
      title: 'Fraud-Control & RCU/FCU Workflows',
      desc: 'Engineered specifically for Risk Containment Units (RCU), Fraud Control Units (FCU), and credit underwriting verifications.',
      icon: ShieldCheck,
    },
  ];

  return (
    <div id="about-admin-page-container" className="space-y-8 max-w-5xl mx-auto py-2">
      {/* SECTION 1: ABOUT FRAUD RISK HUB & HUNTER SEARCH */}
      <section id="about-section" className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        
        {/* Brand Banner Preview */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl max-h-56 flex items-center justify-center">
          <img
            src={BRAND.fullLogo}
            alt="Fraud Risk Hub Banner Logo"
            className="w-full h-full object-cover max-h-56"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-5">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-red-600 text-white shadow-md uppercase tracking-wider">
                Official RCU / FCU Platform
              </span>
              <span className="text-xs font-mono text-slate-300">
                DETECT • ANALYZE • PREVENT
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-6 pt-2">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-50 text-red-700 border border-red-200">
                Fraud Risk Hub
              </span>
              <span className="text-xs text-slate-400 font-medium">Enterprise Security Architecture</span>
            </div>
            <h1 id="about-title" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              About Fraud Risk Hub
            </h1>
          </div>
          <button
            onClick={onNavigateToSearch}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Launch Hunter Search</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Primary Description Statement */}
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm leading-relaxed font-medium">
          <p>
            <strong>Fraud Risk Hub</strong> is an enterprise fraud detection and reference matching platform designed for Risk Containment Units (RCU), Fraud Control Units (FCU), and credit underwriting teams to rapidly detect, analyze, and prevent fraudulent applications.
          </p>
        </div>

        {/* Capabilities Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Platform Capabilities & Core Architecture
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((cap, idx) => {
              const Icon = cap.icon;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all flex items-start gap-3.5"
                >
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-indigo-700 shrink-0 shadow-2xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      {cap.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security & Privacy Principles Card */}
        <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
          <div className="flex items-center gap-2 text-indigo-300">
            <Lock className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Security, Data Protection & Privacy Architecture
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All uploaded reference databases are parsed in client-side runtime memory. Data is never cached on public search engines or transmitted to unverified external endpoints.
          </p>
        </div>
      </section>

      {/* SECTION 2: ADMIN PROFILE & ACCESS */}
      <section id="admin-section" className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
          <div>
            <h2 id="admin-title" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Admin & Governance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              System administration, administrator identity, and database index telemetry.
            </p>
          </div>
          {adminSession?.isAuthenticated ? (
            <button
              onClick={onNavigateToAdmin}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Go to Admin Dashboard</span>
            </button>
          ) : (
            <button
              onClick={onNavigateToLogin}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </button>
          )}
        </div>

        {/* Admin Profile Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-700 via-blue-600 to-indigo-800 text-white flex items-center justify-center text-2xl font-extrabold shadow-md shadow-indigo-600/20">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-slate-900">
                  Manikandan
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Admin
                </span>
              </div>
              <p className="text-xs font-semibold text-indigo-700 mt-0.5">
                Role: <span className="text-slate-800 font-bold">Administrator</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                System: <span className="font-bold text-slate-800">Hunter Search Management</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 text-xs text-slate-500">
            <div>
              Status: <span className="font-bold text-emerald-600">{adminSession?.isAuthenticated ? 'Authenticated Active Session' : 'Protected'}</span>
            </div>
            <div>
              Access Control: <span className="font-semibold text-slate-800">Level 4 (Audit, Upload & Search)</span>
            </div>
          </div>
        </div>

        {/* Database Index Telemetry Summary - Visible only for authenticated admin */}
        {adminSession?.isAuthenticated ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Database File
              </span>
              <p className="font-bold text-slate-900 truncate">
                {csvMetadata.fileName}
              </p>
              <p className="text-slate-500">
                {csvMetadata.fileSize} • {csvMetadata.recordCount.toLocaleString()} indexed records
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Dynamic CSV Schema
              </span>
              <p className="font-bold text-indigo-700">
                {csvMetadata.headers.length} Columns Detected
              </p>
              <p className="text-slate-500 truncate" title={csvMetadata.headers.join(', ')}>
                {csvMetadata.headers.slice(0, 3).join(', ')}...
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Memory Storage Status
              </span>
              <p className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Synchronized & Active
              </p>
              <p className="text-slate-500">
                Zero cross-dataset retention
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-600">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Full dataset analytics, records metrics, and CSV management are restricted to the <strong>Admin Dashboard</strong>.</span>
            </div>
            <button
              onClick={onNavigateToLogin}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Sign In as Admin
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
