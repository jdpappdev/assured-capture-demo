import React, { useState, useMemo } from 'react';
import { Report, UserProfile } from '../types';
import { StatusBadge, ALL_REPORT_STATUSES } from './StatusBadge';
import { AssuredLogo } from './AssuredLogo';
import { Search, Calendar, MapPin, Building, FileText, Download, Check, AlertCircle, User as UserIcon, Plus, Sparkles, ChevronRight } from 'lucide-react';
import { ExportFormatDialog } from './ExportFormatDialog';
import { AssuredSelect } from './AssuredSelect';
import { ConnectivitySyncBadge } from './OfflineIndicator';
import { PWAInstallButton } from './PWAInstallButton';
import { isDemoReport, loadDemoReports } from '../db/storage';

interface ReportsHomeScreenProps {
  reports: Report[];
  userProfile?: UserProfile;
  onOpenReport: (reportId: string) => void;
  onCreateNewReport: () => void;
  onOpenProfile?: () => void;
  isLoading?: boolean;
  isGuest?: boolean;
  isDemoMode?: boolean;
  onSignInRequest?: () => void;
  syncStatus?: { text: string; type: 'loading' | 'success' | 'error' } | null;
  isOnline?: boolean;
  pendingSyncCount?: number;
  isSyncing?: boolean;
  onRefreshReports?: () => Promise<void> | void;
}

export const ReportsHomeScreen: React.FC<ReportsHomeScreenProps> = ({
  reports,
  userProfile,
  onOpenReport,
  onCreateNewReport,
  onOpenProfile,
  isLoading = false,
  isGuest = false,
  isDemoMode = false,
  onSignInRequest,
  syncStatus = null,
  isOnline = true,
  pendingSyncCount = 0,
  isSyncing = false,
  onRefreshReports,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [exportingReportId, setExportingReportId] = useState<string | null>(null);
  const [selectedReportForExport, setSelectedReportForExport] = useState<Report | null>(null);
  const [exportingFormat, setExportingFormat] = useState<'pdf' | 'docx' | null>(null);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const demoReportsCount = useMemo(() => {
    return reports.filter(r => isDemoReport(r)).length;
  }, [reports]);

  const handleLoadDemo = async () => {
    if (isLoadingDemo) return;
    setIsLoadingDemo(true);
    setDemoNotice(null);
    try {
      await loadDemoReports(userProfile?.userId || undefined);
      if (onRefreshReports) {
        await onRefreshReports();
      }
      setDemoNotice('5 sample demonstration reports loaded successfully.');
      setTimeout(() => setDemoNotice(null), 4500);
    } catch (err: any) {
      console.error('Failed to load demonstration reports:', err);
      setDemoNotice('Failed to generate sample reports. Please try again.');
      setTimeout(() => setDemoNotice(null), 5000);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  // Trigger export format dialog for a report
  const handleOpenExportDialog = (e: React.MouseEvent, report: Report) => {
    e.stopPropagation();
    if (exportingReportId) return;
    setSelectedReportForExport(report);
  };

  // Handle format export from dialog
  const handleSelectExportFormat = async (format: 'pdf' | 'docx') => {
    if (!selectedReportForExport) return;
    const report = selectedReportForExport;
    setExportingReportId(report.id);
    setExportingFormat(format);
    setExportFeedback(null);
    setSelectedReportForExport(null);

    try {
      if (format === 'pdf') {
        const { exportPhotoReportPdf } = await import('../utils/pdfExport');
        await exportPhotoReportPdf(report);
        setExportFeedback({
          type: 'success',
          text: `PDF photo report successfully generated for ${report.jobReference || 'report'}`,
        });
      } else {
        const { exportPhotoReportDocx } = await import('../utils/docxExport');
        await exportPhotoReportDocx(report);
        setExportFeedback({
          type: 'success',
          text: `DOCX photo report successfully generated for ${report.jobReference || 'report'}`,
        });
      }
      setTimeout(() => setExportFeedback(null), 4000);
    } catch (err: any) {
      console.error('Export error:', err);
      setExportFeedback({
        type: 'error',
        text: err?.message || `Failed to export ${format.toUpperCase()} photo report. Please try again.`,
      });
      setTimeout(() => setExportFeedback(null), 5000);
    } finally {
      setExportingReportId(null);
      setExportingFormat(null);
    }
  };

  // Filter search against Job Reference, Report Name, Client Name and Status filter / Sort order
  const filteredReports = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = reports.filter(r => {
      const matchSearch =
        !term ||
        (r.jobReference || '').toLowerCase().includes(term) ||
        (r.reportName || '').toLowerCase().includes(term) ||
        (r.clientName || '').toLowerCase().includes(term);
      const matchStatus =
        statusFilter === 'All' ||
        statusFilter.startsWith('sort:') ||
        r.status === statusFilter;
      return matchSearch && matchStatus;
    });

    if (statusFilter === 'sort:oldest') {
      result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (statusFilter === 'sort:newest') {
      result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (statusFilter === 'sort:ref') {
      result = [...result].sort((a, b) => (a.jobReference || '').localeCompare(b.jobReference || ''));
    } else if (statusFilter === 'sort:name') {
      result = [...result].sort((a, b) => (a.reportName || '').localeCompare(b.reportName || ''));
    }

    return result;
  }, [reports, searchTerm, statusFilter]);

  return (
    <div className="reports-home w-full">
      {/* 2 & 3. Brand Header: Compact architectural panel with pale cyan surface & strong left alignment */}
      <header className="register-header">
        <div className="w-full max-w-3xl lg:max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            {/* ASSURED CAPTURE: Official wordmark remains visually dominant, CAPTURE is a smaller product descriptor */}
            <div className="register-wordmark flex items-baseline gap-2 sm:gap-2.5 flex-wrap">
              <AssuredLogo className="register-logo h-5 sm:h-7" />
              <span className="font-sans font-extrabold tracking-[0.18em] text-[11px] sm:text-xs text-[#6990FF] uppercase select-none">
                CAPTURE
              </span>
            </div>
            {/* Supporting description below: Field inspection & photographic evidence system */}
            <p className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase text-[#152128]/60 mt-1.5 leading-tight">
              FIELD INSPECTION &amp; PHOTOGRAPHIC EVIDENCE SYSTEM
            </p>
          </div>

          {/* Right Header Controls: Sync Badge + PWA Install + User Profile */}
          <div className="register-tools flex items-center flex-wrap justify-end gap-2 sm:gap-3">
            <ConnectivitySyncBadge
              isOnline={isOnline}
              pendingCount={pendingSyncCount}
              isSyncing={isSyncing}
              isDemoMode={isDemoMode}
            />

            <PWAInstallButton variant="header" />

            {/* User / Profile control on the right */}
            {onOpenProfile && (
              <button
                type="button"
                id="btn_open_profile"
                onClick={onOpenProfile}
                className="register-account"
                title={isDemoMode ? 'Portfolio demo settings' : isGuest ? 'Guest Mode · Settings' : `View Profile: ${userProfile?.displayName || userProfile?.profileName || userProfile?.name || 'User Profile'}`}
                aria-label={isDemoMode ? 'Portfolio demo settings' : isGuest ? 'Guest Mode Settings' : 'Open User Profile'}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-[#e9f5fa] flex items-center justify-center">
                  {!isGuest && userProfile?.avatarUrl ? (
                    <img
                      src={userProfile.avatarUrl}
                      alt={userProfile?.displayName || userProfile?.profileName || userProfile?.name || 'User Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-5 h-5 text-[#152128]/60" />
                  )}
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Working Surface */}
      <div className="reports-surface w-full max-w-3xl lg:max-w-4xl mx-auto px-4 pt-5 pb-24 sm:px-6 sm:pt-8 sm:pb-28 space-y-6">
        <div className="register-masthead">
          <h1 className="sr-only">Reports</h1>
          <button type="button" className="field-primary register-create" onClick={onCreateNewReport}>
            <Plus size={18} aria-hidden="true" /> New report
          </button>
        </div>

        {/* Guest Mode Notice */}
        {isGuest && !isDemoMode && (
          <div
            id="guest_mode_notice_banner"
            className="register-demo-notice"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E06A55] shrink-0" />
              <span className="leading-snug">
                <strong className="font-bold text-[#152128]">Guest Mode:</strong> Reports are stored only on this device and may not be recoverable if device data is cleared.
              </span>
            </div>
            {onSignInRequest && (
              <button
                type="button"
                id="btn_guest_banner_signin"
                onClick={onSignInRequest}
                className="register-demo-exit"
              >
                Sign in to link account
              </button>
            )}
          </div>
        )}

        {/* Export Notification Feedback */}
        {exportFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 border ${
              exportFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                : 'bg-rose-50 text-rose-950 border-rose-200'
            }`}
          >
            {exportFeedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.5]" />
            )}
            <span>{exportFeedback.text}</span>
          </div>
        )}

        {/* Synchronization state indicator */}
        {syncStatus && (!isLoading || syncStatus.type !== 'loading') && (
          <div
            id="reports_sync_status_banner"
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2.5 border transition-all ${
              syncStatus.type === 'loading'
                ? 'bg-[#B9E6F5]/25 text-[#152128] border-[#152128]/15'
                : syncStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
                : 'bg-rose-50 text-rose-950 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncStatus.type === 'loading' ? (
                <span className="w-3.5 h-3.5 border-2 border-[#152128]/30 border-t-[#6990FF] rounded-full animate-spin shrink-0" />
              ) : syncStatus.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 stroke-[2.5]" />
              )}
              <span>{syncStatus.text}</span>
            </div>
          </div>
        )}

        {/* Demo Data Feedback Banner */}
        {demoNotice && (
          <div
            id="demo_data_feedback_banner"
            className="p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2.5 border bg-[#B9E6F5]/25 text-[#152128] border-[#152128]/15 animate-in fade-in"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#6990FF] shrink-0 stroke-[2.2]" />
              <span>{demoNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setDemoNotice(null)}
              className="text-xs text-[#152128]/60 hover:text-[#152128] underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 5. Search & Sorting/Filter: Search input and Dropdown in the same row on mobile and desktop */}
        <div className="register-filters">
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none text-[#152128]/40">
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
            </div>
            <input
              type="text"
              aria-label="Search reports"
              id="reports_search_input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search reports"
              className="w-full pl-9 sm:pl-11 pr-8 sm:pr-14 py-2.5 sm:py-3 bg-white border border-[#152128]/15 rounded-lg text-xs sm:text-base text-[#152128] placeholder:text-[#152128]/40 font-normal focus:border-[#6990FF] focus:ring-2 focus:ring-[#6990FF]/20 outline-none transition-all min-h-[44px] sm:min-h-[48px]"
            />
            {searchTerm && (
              <button
                type="button"
                id="btn_clear_search"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-2.5 sm:pr-4 flex items-center text-xs font-semibold text-[#152128]/50 hover:text-[#152128] cursor-pointer min-h-[44px] touch-manipulation"
              >
                Clear
              </button>
            )}
          </div>

          <div className="register-filter-select">
            <AssuredSelect
              id="reports_status_filter"
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              aria-label="Filter and sort reports"
            >
              <option value="All">All statuses</option>
              {ALL_REPORT_STATUSES.map(st => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
              <option value="sort:newest">Sort: Newest</option>
              <option value="sort:oldest">Sort: Oldest</option>
              <option value="sort:ref">Sort: Ref (A-Z)</option>
              <option value="sort:name">Sort: Title (A-Z)</option>
            </AssuredSelect>
          </div>
          {!isLoading && (
            <p className="register-count">
              {filteredReports.length} {filteredReports.length === 1 ? 'inspection' : 'inspections'}
            </p>
          )}
        </div>

        {/* Loading state: subtle skeleton placeholders using existing Reports layout */}
        {isLoading ? (
          <div id="reports_skeleton_container" className="space-y-3" aria-busy="true" aria-label="Loading reports">
            <div className="flex items-baseline justify-between px-0.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#152128]/75">
                <span className="w-3.5 h-3.5 border-2 border-[#152128]/30 border-t-[#6990FF] rounded-full animate-spin shrink-0" />
                <span>Loading your reports…</span>
              </div>
              <div className="h-3 w-28 bg-[#152128]/5 rounded animate-pulse" />
            </div>

            {/* Skeleton Inspection Register using existing card structure */}
            <div className="register-card-list">
              {[1, 2, 3].map((item) => (
                <div key={item} className="app-card register-report w-full text-left block">
                  <div className="space-y-3">
                    {/* Title + Thumbnail row */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        {/* Title skeleton */}
                        <div
                          className="h-5 bg-[#152128]/10 rounded animate-pulse"
                          style={{ width: item === 1 ? '58%' : item === 2 ? '72%' : '48%' }}
                        />
                        {/* Reference badge + Status badge skeleton */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <div className="h-5 w-20 bg-[#B9E6F5]/40 rounded border border-[#152128]/10 animate-pulse" />
                          <div className="h-5 w-24 bg-[#152128]/5 rounded border border-[#152128]/10 animate-pulse" />
                        </div>
                      </div>

                      {/* Thumbnail skeleton */}
                      <div className="register-thumbnail shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg border border-[#152128]/15 bg-[#152128]/5 animate-pulse" />
                    </div>

                    {/* Site / Client metadata skeleton */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded bg-[#152128]/10 shrink-0" />
                        <div
                          className="h-3.5 bg-[#152128]/8 rounded animate-pulse"
                          style={{ width: item === 1 ? '38%' : '30%' }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded bg-[#152128]/10 shrink-0" />
                        <div
                          className="h-3.5 bg-[#152128]/6 rounded animate-pulse"
                          style={{ width: item === 1 ? '52%' : '42%' }}
                        />
                      </div>
                    </div>

                    {/* Inspection date + Export button row skeleton */}
                    <div className="pt-2.5 flex items-center justify-between gap-3 border-t border-[#152128]/10">
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded bg-[#152128]/10 shrink-0" />
                        <div className="h-3.5 w-32 bg-[#152128]/8 rounded animate-pulse" />
                      </div>
                      <div className="h-8 w-20 rounded-lg bg-[#152128]/5 border border-[#152128]/15 animate-pulse shrink-0" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          /* Empty State */
          <div className="app-card register-empty p-8 sm:p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#B9E6F5]/40 text-[#152128] flex items-center justify-center mx-auto mb-3 border border-[#B9E6F5]">
              <FileText className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h2 className="text-base sm:text-lg font-sans font-bold text-[#152128] mb-1.5 tracking-tight">
              {searchTerm || statusFilter !== 'All' ? 'No matching reports' : 'No reports yet'}
            </h2>
            <p className="text-xs text-[#152128]/65 mb-5 max-w-sm mx-auto font-normal">
              {searchTerm || statusFilter !== 'All'
                ? `No reports matched the current filter. Try selecting "All" or clearing the search.`
                : 'Create your first field inspection photo report to get started.'}
            </p>
            <button
              type="button"
              onClick={onCreateNewReport}
              className="register-empty-create inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#6990FF] hover:bg-[#527AE8] active:bg-[#4466C9] text-[#152128] font-sans font-bold text-xs tracking-wider uppercase rounded-lg min-h-[48px] touch-manipulation active:scale-[0.98] cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>NEW REPORT</span>
            </button>

            {/* Load 5 Realistic Demonstration Reports */}
            {!searchTerm && statusFilter === 'All' && (
              <div className="pt-5 mt-5 border-t border-[#152128]/10 max-w-sm mx-auto">
                <p className="text-[11px] text-[#152128]/60 mb-2 font-mono uppercase tracking-wider">
                  Client Presentation &amp; Sample Data
                </p>
                <button
                  type="button"
                  id="btn_load_demo_empty"
                  onClick={handleLoadDemo}
                  disabled={isLoadingDemo}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-[#F4F6F8] active:bg-[#E9ECF0] text-[#152128] border border-[#152128]/20 hover:border-[#152128] font-sans font-bold text-xs tracking-wider uppercase rounded-lg min-h-[44px] transition-colors cursor-pointer w-full shadow-2xs disabled:opacity-50"
                >
                  {isLoadingDemo ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#152128]/30 border-t-[#6990FF] rounded-full animate-spin shrink-0" />
                      <span>Preparing 5 Sample Scenarios...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#6990FF] shrink-0" />
                      <span>Load 5 Sample Reports</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-[#152128]/50 mt-1.5 text-center leading-tight">
                  Commercial, Residential, Dilapidations, Snagging, and Civil Drainage scenarios with 66 photos.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>

            {/* 4 & 7 & 13. Professional Inspection Register: Clean register surface with quiet line dividers */}
            <div className="register-card-list">
              {filteredReports.map(report => (
                <article key={report.id} className="app-card register-report group">
                  <div className="register-row-content space-y-3">
                    {/* 5. REPORT TITLE (strongest) + REPORT THUMBNAIL (rectangular evidence) */}
                    <div className="register-row-main flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        {/* 1. REPORT TITLE */}
                        <h3 className="text-base sm:text-lg font-sans font-bold text-[#152128] group-hover:text-[#527AE8] transition-colors leading-snug tracking-tight">
                          <button type="button" className="register-open" onClick={() => onOpenReport(report.id)}>
                            {report.reportName || 'Untitled report'}
                          </button>
                        </h3>

                        {/* 2 & 3. REPORT REFERENCE + STATUS (tightly related metadata group) */}
                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                          <span className="font-mono font-bold text-[11px] sm:text-xs tracking-wide uppercase text-[#152128] bg-[#B9E6F5]/40 px-2 py-0.5 rounded border border-[#152128]/15 inline-block">
                            {report.jobReference || 'BBC26-??'}
                          </span>
                          {isDemoReport(report) && (
                            <span className="font-mono font-bold text-[10px] sm:text-[11px] tracking-wider uppercase text-[#3453A5] bg-[#6990FF]/15 px-1.5 py-0.5 rounded border border-[#6990FF]/25 inline-block">
                              DEMO
                            </span>
                          )}
                          <StatusBadge status={report.status} size="sm" />
                        </div>
                      </div>

                      {/* 8. Inspection Thumbnail: Restrained rectangular evidence crop */}
                      {report.reportImage && (
                        <div className="register-thumbnail shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border border-[#152128]/15 bg-[#152128]/5">
                          <img
                            src={report.reportImage}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => { e.currentTarget.hidden = true; }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 4 & 5. SITE / CLIENT & LOCATION (tightly related metadata group) */}
                    {(report.clientName || report.address) && (
                      <div className="register-row-meta space-y-1 text-xs text-[#152128]/75 pt-0.5">
                        {report.clientName && (
                          <div className="flex items-center gap-1.5 font-medium text-[#152128]">
                            <Building className="w-3.5 h-3.5 text-[#152128]/50 shrink-0 stroke-[2]" />
                            <span className="truncate">{report.clientName}</span>
                          </div>
                        )}
                        {report.address && (
                          <div className="flex items-center gap-1.5 text-[#152128]/60 text-xs">
                            <MapPin className="w-3.5 h-3.5 text-[#152128]/40 shrink-0 stroke-[2]" />
                            <span className="truncate">{report.address}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 6 & 7. INSPECTION DATE + EXPORT (tightly related footer group) */}
                    <div className="register-row-actions pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#152128]/65 border-t border-[#152128]/10">
                      <div className="flex items-center gap-1.5 font-medium text-xs">
                        <Calendar className="w-3.5 h-3.5 text-[#152128]/50 shrink-0 stroke-[2]" />
                        <span><span className="register-date-label">Inspection:</span> <strong className="text-[#152128] font-mono text-xs font-semibold">{report.inspectionDate || 'Not set'}</strong></span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleOpenExportDialog(e, report)}
                        disabled={Boolean(exportingReportId)}
                        className="register-export"
                        aria-haspopup="dialog"
                        aria-busy={exportingReportId === report.id}
                        aria-label={`Export photo report for ${report.jobReference || 'report'}`}
                      >
                        {exportingReportId === report.id ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-[#152128]/30 border-t-[#6990FF] rounded-full animate-spin shrink-0" />
                            <span>Exporting…</span>
                          </>
                        ) : (
                          <>
                            <Download size={15} strokeWidth={2} aria-hidden="true" />
                            <span>Export</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <ChevronRight aria-hidden="true" className="register-row-chevron" />
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
 
      {/* Format Selection Dialog for Report Card Export */}
      <ExportFormatDialog
        isOpen={Boolean(selectedReportForExport)}
        onClose={() => setSelectedReportForExport(null)}
        onSelectFormat={handleSelectExportFormat}
        isExporting={Boolean(exportingReportId)}
        exportingFormat={exportingFormat}
      />
    </div>
  );
};
