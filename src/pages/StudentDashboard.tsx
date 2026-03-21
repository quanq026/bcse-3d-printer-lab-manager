import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  PenLine,
  Search,
  Timer,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppIcon } from '../components/AppIcon';
import { useLang } from '../contexts/LanguageContext';
import { api } from '../lib/api';
import { fillText, getUiText } from '../lib/uiText';
import { cn } from '../lib/utils';
import { StatusChip } from '../components/StatusChip';
import type { User, PrintJob, DashboardStats, DailyStat } from '../types';
import { JobStatus, Role } from '../types';

interface StudentDashboardProps {
  onNewBooking: () => void;
  onSelectJob: (id: string) => void;
  onPageChange: (page: string) => void;
  role: Role;
  currentUser: User | null;
  activePage?: string;
}

const CLOSED_STATUSES = [JobStatus.DONE, JobStatus.CANCELLED, JobStatus.REJECTED];
const FLOW_STEPS = [JobStatus.SUBMITTED, JobStatus.APPROVED, JobStatus.PRINTING, JobStatus.DONE];
function formatDate(value?: string) {
  if (!value) return 'Chưa có mốc thời gian';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

function formatDateWithLocale(value: string | undefined, locale: string, fallback: string) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

function getTrackerIcon(status: string) {
  if (status === JobStatus.PRINTING) {
    return <Timer size={14} className="text-emerald-600 dark:text-emerald-300" />;
  }

  if (status === JobStatus.APPROVED || status === JobStatus.SCHEDULED || status === JobStatus.DONE) {
    return <CheckCircle2 size={14} className="text-sky-600 dark:text-sky-300" />;
  }

  return <AlertCircle size={14} className="text-[var(--landing-accent)]" />;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNewBooking, onSelectJob, onPageChange, role, currentUser, activePage }) => {
  const isHistoryPage = activePage === 'history';
  const { lang, t } = useLang();
  const ui = getUiText(lang);
  const shared = ui.shared;
  const adminCopy = ui.adminOverview;
  const sidebarCopy = ui.sidebar.nav;
  const isOpsRole = role !== Role.STUDENT;
  const locale = lang === 'JP' ? 'en-US' : 'vi-VN';
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;

    api.getJobs()
      .then((data) => {
        if (isMounted) setJobs(data);
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    if (role !== Role.STUDENT) {
      api.getStats().then((data) => {
        if (isMounted) setStats(data);
      }).catch(() => { });
      api.getDailyStats().then((data) => {
        if (isMounted) setDailyStats(data);
      }).catch(() => { });
    }

    return () => {
      isMounted = false;
    };
  }, [role]);

  const myJobs = useMemo(() => {
    const scopedJobs = role === Role.STUDENT
      ? jobs.filter((job) => job.userId === currentUser?.id)
      : jobs;

    return [...scopedJobs].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [currentUser?.id, jobs, role]);

  const filteredHistoryJobs = useMemo(() => myJobs
    .filter((job) => historyFilter === 'all' || job.status === historyFilter)
    .filter((job) => {
      if (!historySearch) return true;
      const needle = historySearch.toLowerCase();
      return job.jobName?.toLowerCase().includes(needle) || job.id?.toLowerCase().includes(needle);
    }), [historyFilter, historySearch, myJobs]);

  const recentJobs = myJobs.slice(0, 10);
  const activeJobs = myJobs.filter((job) => !CLOSED_STATUSES.includes(job.status as JobStatus));
  const needsRevisionJobs = myJobs.filter((job) => job.status === JobStatus.NEEDS_REVISION);
  const pendingJobs = myJobs.filter((job) => [JobStatus.SUBMITTED, JobStatus.PENDING_REVIEW, JobStatus.APPROVED, JobStatus.SCHEDULED].includes(job.status as JobStatus));
  const printingJobs = myJobs.filter((job) => job.status === JobStatus.PRINTING);
  const doneJobs = myJobs.filter((job) => job.status === JobStatus.DONE);
  const maxDailyTotal = Math.max(...dailyStats.map((day: DailyStat) => day.approved + day.done + day.rejected + day.needsRevision), 1);

  const opsHistoryFilters = [
    { value: 'all', label: adminCopy.historyFilters.all },
    { value: JobStatus.SUBMITTED, label: shared.jobStatuses[JobStatus.SUBMITTED] },
    { value: JobStatus.APPROVED, label: shared.jobStatuses[JobStatus.APPROVED] },
    { value: JobStatus.PRINTING, label: shared.jobStatuses[JobStatus.PRINTING] },
    { value: JobStatus.DONE, label: shared.jobStatuses[JobStatus.DONE] },
    { value: JobStatus.REJECTED, label: shared.jobStatuses[JobStatus.REJECTED] },
    { value: JobStatus.CANCELLED, label: shared.jobStatuses[JobStatus.CANCELLED] },
    { value: JobStatus.NEEDS_REVISION, label: shared.jobStatuses[JobStatus.NEEDS_REVISION] },
  ];

  const studentHistoryFilters = [
    { value: 'all', label: adminCopy.historyFilters.all },
    { value: JobStatus.SUBMITTED, label: shared.jobStatuses[JobStatus.SUBMITTED] },
    { value: JobStatus.APPROVED, label: shared.jobStatuses[JobStatus.APPROVED] },
    { value: JobStatus.PRINTING, label: shared.jobStatuses[JobStatus.PRINTING] },
    { value: JobStatus.DONE, label: shared.jobStatuses[JobStatus.DONE] },
    { value: JobStatus.REJECTED, label: shared.jobStatuses[JobStatus.REJECTED] },
    { value: JobStatus.CANCELLED, label: shared.jobStatuses[JobStatus.CANCELLED] },
    { value: JobStatus.NEEDS_REVISION, label: shared.jobStatuses[JobStatus.NEEDS_REVISION] },
  ];

  const opsPrimaryAction = {
    title: adminCopy.actionsTitle,
    description: adminCopy.actionsDesc,
    label: sidebarCopy.queue,
    icon: 'solar:checklist-bold',
    onClick: () => onPageChange('queue'),
  };

  const opsQuickActions = role === Role.MODERATOR
    ? [
      { id: 'queue', label: sidebarCopy.queue, icon: 'solar:checklist-bold' },
      { id: 'queue-status', label: adminCopy.quickQueueStatus, icon: 'solar:sort-by-time-bold' },
      { id: 'chat', label: sidebarCopy.chat, icon: 'solar:chat-round-dots-bold' },
      { id: 'history', label: sidebarCopy.history, icon: 'solar:history-bold' },
    ]
    : [
      { id: 'queue', label: sidebarCopy.queue, icon: 'solar:checklist-bold' },
      { id: 'printers', label: sidebarCopy.printers, icon: 'solar:printer-2-bold' },
      { id: 'inventory', label: sidebarCopy.inventory, icon: 'solar:box-bold' },
      { id: 'chat', label: sidebarCopy.chat, icon: 'solar:chat-round-dots-bold' },
    ];

  const opsKpiCards = [
    {
      label: adminCopy.metrics.pending.label,
      value: loading ? '...' : pendingJobs.length.toString(),
      note: adminCopy.metrics.pending.note,
      icon: 'solar:clock-circle-bold',
      accent: 'text-sky-700 bg-sky-100/80 dark:text-sky-100 dark:bg-sky-300/10',
    },
    {
      label: adminCopy.metrics.total.label,
      value: loading ? '...' : myJobs.length.toString(),
      note: adminCopy.metrics.total.note,
      icon: 'solar:widget-3-bold',
      accent: 'text-[var(--landing-accent)] bg-[rgba(239,125,87,0.12)] dark:text-[#ffd7cc] dark:bg-[rgba(239,125,87,0.12)]',
    },
    {
      label: adminCopy.metrics.printing.label,
      value: loading ? '...' : printingJobs.length.toString(),
      note: adminCopy.metrics.printing.note,
      icon: 'solar:printer-2-bold',
      accent: 'text-emerald-700 bg-emerald-100/80 dark:text-emerald-100 dark:bg-emerald-300/10',
    },
    {
      label: adminCopy.metrics.done.label,
      value: loading ? '...' : doneJobs.length.toString(),
      note: adminCopy.metrics.done.note,
      icon: 'solar:check-square-bold',
      accent: 'text-amber-700 bg-amber-100/80 dark:text-amber-100 dark:bg-amber-300/10',
    },
  ];

  const renderOpsJobCard = (job: PrintJob) => (
    <button
      key={job.id}
      onClick={() => onSelectJob(job.id)}
      className="app-hover-box group w-full border-b border-[rgba(30,23,19,0.06)] p-4 text-left transition-colors hover:bg-[rgba(239,125,87,0.05)] last:border-b-0 dark:border-white/6 dark:hover:bg-white/4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="app-overline">#{job.id}</p>
          <p className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.jobName}</p>
          <div className="mt-3 grid gap-1 text-xs text-slate-500 dark:text-[var(--landing-muted)]">
            <p>{job.printerName || shared.notAssigned}</p>
            <p>{job.materialType} / {job.color}</p>
            <p>{job.slotTime || shared.waitingApproval}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <StatusChip status={job.status as JobStatus} />
          <span className="text-xs font-semibold text-slate-400 transition-colors group-hover:text-[var(--landing-accent)] dark:text-white/40">{adminCopy.table.open}</span>
        </div>
      </div>
    </button>
  );

  const renderOpsJobsTable = (tableJobs: PrintJob[]) => (
    <div className="hidden overflow-x-auto md:block">
      <table className="app-table">
        <thead>
          <tr>
            <th>{adminCopy.table.request}</th>
            <th>{adminCopy.table.printer}</th>
            <th>{adminCopy.table.material}</th>
            <th>{adminCopy.table.status}</th>
            <th className="text-right">{adminCopy.table.open}</th>
          </tr>
        </thead>
        <tbody>
          {tableJobs.map((job) => (
            <tr key={job.id} className="cursor-pointer" onClick={() => onSelectJob(job.id)}>
              <td className="px-6 py-5 align-top">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.jobName}</span>
                  <span className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400 dark:text-white/38">#{job.id}</span>
                </div>
              </td>
              <td className="px-6 py-5 align-top">
                <div className="flex flex-col text-sm text-slate-600 dark:text-[var(--landing-muted)]">
                  <span>{job.printerName || shared.notAssigned}</span>
                  <span className="mt-1 text-xs text-slate-400 dark:text-white/40">{job.slotTime || shared.waitingApproval}</span>
                </div>
              </td>
              <td className="px-6 py-5 align-top">
                <div className="flex flex-col text-sm text-slate-600 dark:text-[var(--landing-muted)]">
                  <span>{job.materialType} / {job.color}</span>
                  <span className="mt-1 text-xs text-slate-400 dark:text-white/40">{fillText(shared.createdOn, { date: formatDate(job.createdAt) })}</span>
                </div>
              </td>
              <td className="px-6 py-5 align-top">
                <StatusChip status={job.status as JobStatus} />
              </td>
              <td className="px-6 py-5 text-right align-top">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectJob(job.id);
                  }}
                  className="app-icon-button inline-flex h-10 w-10 items-center justify-center"
                  aria-label={fillText(shared.openItem, { name: job.jobName })}
                >
                  <ArrowRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (isOpsRole && isHistoryPage) {
    return (
      <div className="space-y-6">
        <section className="app-panel grid gap-5 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:py-8">
          <div>
            <p className="app-eyebrow">{adminCopy.historyEyebrow}</p>
            <h2 className="app-display-sm mt-3">{adminCopy.historyTitle}</h2>
            <p className="app-subtle-copy mt-4 max-w-2xl text-sm sm:text-base">{adminCopy.historyDesc}</p>
          </div>
          <div className="grid gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" size={16} />
              <input
                type="text"
                placeholder={adminCopy.historySearchPlaceholder}
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                className="app-control app-search-input"
              />
            </div>
            <select
              value={historyFilter}
              onChange={(event) => setHistoryFilter(event.target.value)}
              className="app-control"
            >
              {opsHistoryFilters.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="app-panel-soft flex items-center justify-between px-4 py-3 text-sm text-slate-600 dark:text-[var(--landing-muted)]">
              <span>{adminCopy.historyMatches}</span>
              <span className="font-semibold text-slate-900 dark:text-[var(--landing-text)]">{loading ? '...' : filteredHistoryJobs.length}</span>
            </div>
          </div>
        </section>

        <section className="app-panel overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500 dark:text-[var(--landing-muted)]">
              <Loader2 size={22} className="animate-spin" />
              <span className="text-sm">{t('loadingData')}</span>
            </div>
          ) : filteredHistoryJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center border border-[rgba(30,23,19,0.08)] bg-white/50 text-slate-400 dark:border-white/8 dark:bg-white/4 dark:text-white/38">
                <FileText size={28} strokeWidth={1.4} />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-[var(--landing-text)]">{adminCopy.historyEmptyTitle}</p>
                <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-[var(--landing-muted)]">{adminCopy.historyEmptyDesc}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="md:hidden">
                {filteredHistoryJobs.map(renderOpsJobCard)}
              </div>
              {renderOpsJobsTable(filteredHistoryJobs)}
            </>
          )}
        </section>
      </div>
    );
  }

  if (isOpsRole) {
    return (
      <div className="space-y-6">
        <section className="app-panel flex flex-col gap-6 px-6 py-6 lg:px-8 lg:py-8">
          <div>
            <p className="app-eyebrow">{adminCopy.heroEyebrow}</p>
            <h2 className="app-display-sm mt-3">{adminCopy.heroTitle}</h2>
            <p className="app-subtle-copy mt-4 max-w-2xl text-sm sm:text-base">{adminCopy.heroDesc}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => onPageChange('queue')}
                className="app-primary-button inline-flex min-w-[220px] items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.16em]"
              >
                <AppIcon icon="solar:checklist-bold" size={18} />
                {sidebarCopy.queue}
              </button>
              <button
                onClick={() => onPageChange('history')}
                className="app-secondary-button inline-flex min-h-[50px] items-center justify-center gap-2 px-5 text-sm font-semibold"
              >
                <AppIcon icon="solar:history-bold" size={18} />
                {adminCopy.viewHistory}
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="app-panel-soft app-hover-box px-4 py-4">
              <p className="app-overline">{adminCopy.userCardTitle}</p>
              <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-[var(--landing-text)]">{currentUser?.fullName || shared.systemUser}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{currentUser?.email || role}</p>
            </div>
            <div className="app-panel-soft app-hover-box px-4 py-4">
              <p className="app-overline">{adminCopy.openRequestsTitle}</p>
              <p className="app-stat-number mt-3 text-slate-900 dark:text-[var(--landing-text)]">{loading ? '...' : activeJobs.length}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{adminCopy.openRequestsNote}</p>
            </div>
            <div className="app-panel-soft app-hover-box px-4 py-4">
              <p className="app-overline">{adminCopy.attentionTitle}</p>
              <p className="app-stat-number mt-3 text-slate-900 dark:text-[var(--landing-text)]">{loading ? '...' : needsRevisionJobs.length}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{adminCopy.attentionNote}</p>
            </div>
          </div>
        </section>

        {needsRevisionJobs.length > 0 && (
          <section className="app-panel border-[rgba(239,125,87,0.28)] bg-[linear-gradient(135deg,rgba(255,247,237,0.92),rgba(255,238,222,0.92))] px-6 py-5 dark:border-[rgba(239,125,87,0.18)] dark:bg-[linear-gradient(135deg,rgba(239,125,87,0.12),rgba(240,179,91,0.06))]">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center bg-[rgba(239,125,87,0.16)] text-[var(--landing-accent)]">
                <PenLine size={18} />
              </div>
              <div>
                <p className="app-eyebrow">{adminCopy.needsRevisionEyebrow}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-[var(--landing-text)]">{fillText(adminCopy.needsRevisionTitle, { count: needsRevisionJobs.length })}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-[var(--landing-muted)]">{needsRevisionJobs.map((job) => job.jobName).join(', ')}</p>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {opsKpiCards.map((card, index) => (
            <motion.article
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="app-panel app-hover-box px-5 py-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className={cn('flex h-12 w-12 items-center justify-center', card.accent)}>
                  <AppIcon icon={card.icon} size={20} />
                </div>
                <span className="app-overline">0{index + 1}</span>
              </div>
              <p className="app-stat-number mt-5 text-slate-900 dark:text-[var(--landing-text)]">{card.value}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{card.label}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{card.note}</p>
            </motion.article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_360px]">
          <div className="space-y-6">
            <div className="app-panel overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-[rgba(30,23,19,0.08)] px-6 py-5 dark:border-white/8">
                <div>
                  <p className="app-overline">{adminCopy.processingEyebrow}</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-[var(--landing-text)]">{adminCopy.processingTitle}</h3>
                </div>
                <button
                  onClick={() => onPageChange('history')}
                  className="text-sm font-semibold text-[var(--landing-accent)] transition-colors hover:text-[var(--landing-accent-strong)]"
                >
                  {adminCopy.viewArchive}
                </button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500 dark:text-[var(--landing-muted)]">
                  <Loader2 size={22} className="animate-spin" />
                  <span className="text-sm">{t('loadingData')}</span>
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center border border-[rgba(30,23,19,0.08)] bg-white/50 text-slate-400 dark:border-white/8 dark:bg-white/4 dark:text-white/38">
                    <FileText size={28} strokeWidth={1.4} />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900 dark:text-[var(--landing-text)]">{t('noJobs')}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="md:hidden">
                    {recentJobs.map(renderOpsJobCard)}
                  </div>
                  {renderOpsJobsTable(recentJobs)}
                </>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <section className="app-hover-box overflow-hidden border border-[rgba(20,33,43,0.08)] bg-[linear-gradient(145deg,#172733_0%,#10202b_58%,#ef7d57_170%)] px-6 py-6 text-white shadow-[0_18px_40px_rgba(14,25,34,0.14)]">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">{adminCopy.actionsEyebrow}</p>
              <h3 className="app-display-font mt-3 text-[2rem] leading-none">{opsPrimaryAction.title}</h3>
              <p className="mt-4 text-sm leading-7 text-white/74">{opsPrimaryAction.description}</p>
              <button
                onClick={opsPrimaryAction.onClick}
                className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 bg-[rgba(255,248,240,0.94)] px-4 text-sm font-black uppercase tracking-[0.16em] text-[var(--landing-bg)] transition-colors hover:bg-white"
              >
                <AppIcon icon={opsPrimaryAction.icon} size={18} />
                {opsPrimaryAction.label}
              </button>
            </section>

            <section className="app-panel px-5 py-5">
              <p className="app-overline">{adminCopy.shortcutsEyebrow}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {opsQuickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => onPageChange(action.id)}
                    className="app-panel-soft app-hover-box flex min-h-[104px] flex-col items-center justify-center gap-3 px-4 text-center transition-colors hover:border-[rgba(239,125,87,0.22)] hover:bg-[rgba(239,125,87,0.08)] dark:hover:bg-[rgba(239,125,87,0.1)]"
                  >
                    <AppIcon icon={action.icon} size={20} className="text-[var(--landing-accent)]" />
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-700 dark:text-[var(--landing-text)]">{action.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {activeJobs.length > 0 && (
              <section className="app-panel px-5 py-5">
                <p className="app-overline">{adminCopy.trackingEyebrow}</p>
                <div className="mt-4 space-y-3">
                  {activeJobs.slice(0, 3).map((job) => {
                    const stepIndex = Math.max(FLOW_STEPS.indexOf(job.status as JobStatus), 0);
                    return (
                      <button
                        key={job.id}
                        onClick={() => onSelectJob(job.id)}
                        className="app-panel-soft app-hover-box block w-full px-4 py-4 text-left transition-colors hover:border-[rgba(239,125,87,0.18)] hover:bg-[rgba(239,125,87,0.08)] dark:hover:bg-[rgba(239,125,87,0.1)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.jobName}</p>
                            <p className="mt-1 text-xs text-slate-400 dark:text-white/40">#{job.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTrackerIcon(job.status)}
                            <StatusChip status={job.status as JobStatus} className="min-h-[24px] px-2 py-0.5 text-[9px]" />
                          </div>
                        </div>
                        <div className="mt-4 flex gap-1">
                          {FLOW_STEPS.map((step, index) => (
                            <span
                              key={step}
                              className={cn(
                                'h-1.5 flex-1',
                                index <= stepIndex ? 'bg-[var(--landing-accent)]' : 'bg-slate-200 dark:bg-white/8'
                              )}
                            />
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-slate-500 dark:text-[var(--landing-muted)]">{job.printerName || shared.notAssigned}</p>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {stats && (
              <section className="app-panel px-5 py-5">
                <p className="app-overline">{adminCopy.labStatsEyebrow}</p>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    { label: adminCopy.metrics.total.label, value: stats.totalJobs, valueClass: 'text-slate-900 dark:text-[var(--landing-text)]' },
                    { label: adminCopy.metrics.printing.label, value: stats.printing, valueClass: 'text-emerald-700 dark:text-emerald-200' },
                    { label: shared.jobStatuses[JobStatus.PENDING_REVIEW], value: stats.pendingReview, valueClass: 'text-[var(--landing-accent)]' },
                    { label: adminCopy.userCardTitle, value: stats.totalUsers, valueClass: 'text-slate-900 dark:text-[var(--landing-text)]' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-[rgba(30,23,19,0.06)] pb-3 last:border-b-0 last:pb-0 dark:border-white/6">
                      <span className="text-slate-500 dark:text-[var(--landing-muted)]">{item.label}</span>
                      <span className={cn('font-semibold', item.valueClass)}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {dailyStats.length > 0 && (
              <section className="app-panel px-5 py-5">
                <p className="app-overline">{adminCopy.sevenDayEyebrow}</p>
                <div className="mt-4 flex h-32 items-end gap-2">
                  {dailyStats.map((day: DailyStat) => {
                    const total = day.approved + day.done + day.rejected + day.needsRevision;
                    const doneHeight = day.done ? Math.max((day.done / maxDailyTotal) * 88, 6) : 0;
                    const approvedHeight = day.approved ? Math.max((day.approved / maxDailyTotal) * 88, 6) : 0;
                    const rejectedHeight = day.rejected ? Math.max((day.rejected / maxDailyTotal) * 88, 6) : 0;
                    const revisionHeight = day.needsRevision ? Math.max((day.needsRevision / maxDailyTotal) * 88, 6) : 0;
                    return (
                      <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-[92px] w-full flex-col justify-end gap-px">
                          {day.done > 0 && <span className="w-full bg-emerald-500" style={{ height: `${doneHeight}px` }} />}
                          {day.approved > 0 && <span className="w-full bg-sky-500" style={{ height: `${approvedHeight}px` }} />}
                          {day.rejected > 0 && <span className="w-full bg-rose-400" style={{ height: `${rejectedHeight}px` }} />}
                          {day.needsRevision > 0 && <span className="w-full bg-orange-400" style={{ height: `${revisionHeight}px` }} />}
                          {total === 0 && <span className="h-[4px] w-full bg-slate-200 dark:bg-white/8" />}
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-white/38">{day.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-500 dark:text-[var(--landing-muted)]">
                  {[
                    { color: 'bg-emerald-500', label: adminCopy.chartLegend.done },
                    { color: 'bg-sky-500', label: adminCopy.chartLegend.approved },
                    { color: 'bg-rose-400', label: adminCopy.chartLegend.rejected },
                    { color: 'bg-orange-400', label: adminCopy.chartLegend.revision },
                  ].map((item) => (
                    <span key={item.label} className="inline-flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5', item.color)} />
                      {item.label}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </section>
      </div>
    );
  } const dashboardCopy = role === Role.STUDENT
    ? adminCopy.studentHeroDesc
    : adminCopy.heroDesc;

  const primaryAction = role === Role.STUDENT
    ? {
      title: adminCopy.studentActionsTitle,
      description: adminCopy.studentActionsDesc,
      label: t('newRequest'),
      icon: 'solar:add-square-bold',
      onClick: onNewBooking,
    }
    : {
      title: adminCopy.actionsTitle,
      description: adminCopy.actionsDesc,
      label: t('queue'),
      icon: 'solar:checklist-bold',
      onClick: () => onPageChange('queue'),
    };

  const quickActions = role === Role.STUDENT
    ? [
      { id: 'booking', label: t('booking'), icon: 'solar:add-square-bold' },
      { id: 'history', label: t('history'), icon: 'solar:history-bold' },
      { id: 'chat', label: t('chat'), icon: 'solar:chat-round-dots-bold' },
      { id: 'pricing', label: sidebarCopy.pricing, icon: 'solar:tag-price-bold' },
    ]
    : role === Role.MODERATOR
      ? [
        { id: 'queue', label: t('queue'), icon: 'solar:checklist-bold' },
        { id: 'queue-status', label: adminCopy.quickQueueStatus, icon: 'solar:sort-by-time-bold' },
        { id: 'chat', label: t('chat'), icon: 'solar:chat-round-dots-bold' },
        { id: 'history', label: t('history'), icon: 'solar:history-bold' },
      ]
      : [
        { id: 'queue', label: t('queue'), icon: 'solar:checklist-bold' },
        { id: 'printers', label: t('printers'), icon: 'solar:printer-2-bold' },
        { id: 'inventory', label: t('inventory'), icon: 'solar:box-bold' },
        { id: 'chat', label: t('chat'), icon: 'solar:chat-round-dots-bold' },
      ];

  const kpiCards = [
    {
      label: t('pendingJobs'),
      value: loading ? '...' : pendingJobs.length.toString(),
      note: adminCopy.metrics.pending.note,
      icon: 'solar:clock-circle-bold',
      accent: 'text-sky-700 bg-sky-100/80 dark:text-sky-100 dark:bg-sky-300/10',
    },
    {
      label: t('totalJobs'),
      value: loading ? '...' : myJobs.length.toString(),
      note: adminCopy.metrics.total.note,
      icon: 'solar:widget-3-bold',
      accent: 'text-[var(--landing-accent)] bg-[rgba(239,125,87,0.12)] dark:text-[#ffd7cc] dark:bg-[rgba(239,125,87,0.12)]',
    },
    {
      label: t('printing'),
      value: loading ? '...' : printingJobs.length.toString(),
      note: adminCopy.metrics.printing.note,
      icon: 'solar:printer-2-bold',
      accent: 'text-emerald-700 bg-emerald-100/80 dark:text-emerald-100 dark:bg-emerald-300/10',
    },
    {
      label: t('done'),
      value: loading ? '...' : doneJobs.length.toString(),
      note: adminCopy.metrics.done.note,
      icon: 'solar:check-square-bold',
      accent: 'text-amber-700 bg-amber-100/80 dark:text-amber-100 dark:bg-amber-300/10',
    },
  ];

  const renderKpiCards = () => (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpiCards.map((card, index) => (
        <motion.article
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
          className="app-panel app-hover-box px-5 py-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div className={cn('flex h-12 w-12 items-center justify-center', card.accent)}>
              <AppIcon icon={card.icon} size={20} />
            </div>
            <span className="app-overline">0{index + 1}</span>
          </div>
          <p className="app-stat-number mt-5 text-slate-900 dark:text-[var(--landing-text)]">{card.value}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{card.label}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{card.note}</p>
        </motion.article>
      ))}
    </section>
  );

  const renderJobCard = (job: PrintJob) => (
    <button
      key={job.id}
      onClick={() => onSelectJob(job.id)}
      className="app-hover-box group w-full border-b border-[rgba(30,23,19,0.06)] p-4 text-left transition-colors hover:bg-[rgba(239,125,87,0.05)] last:border-b-0 dark:border-white/6 dark:hover:bg-white/4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="app-overline">#{job.id}</p>
          <p className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.jobName}</p>
          <div className="mt-3 grid gap-1 text-xs text-slate-500 dark:text-[var(--landing-muted)]">
            <p>{job.printerName || t('notAssigned')}</p>
            <p>{job.materialType} / {job.color}</p>
            <p>{job.slotTime || t('waitingApproval')}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <StatusChip status={job.status as JobStatus} />
          <span className="text-xs font-semibold text-slate-400 transition-colors group-hover:text-[var(--landing-accent)] dark:text-white/40">{adminCopy.table.open}</span>
        </div>
      </div>
    </button>
  );

  const renderJobsTable = (tableJobs: PrintJob[]) => (
    <div className="hidden overflow-x-auto md:block">
      <table className="app-table">
        <thead>
          <tr>
            <th>{adminCopy.table.request}</th>
            <th>{t('printerName')}</th>
            <th>{t('materialType')}</th>
            <th>{adminCopy.table.status}</th>
            <th className="text-right">{adminCopy.table.open}</th>
          </tr>
        </thead>
        <tbody>
          {tableJobs.map((job) => (
            <tr key={job.id} className="cursor-pointer" onClick={() => onSelectJob(job.id)}>
              <td className="px-6 py-5 align-top">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.jobName}</span>
                  <span className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400 dark:text-white/38">#{job.id}</span>
                </div>
              </td>
              <td className="px-6 py-5 align-top">
                <div className="flex flex-col text-sm text-slate-600 dark:text-[var(--landing-muted)]">
                  <span>{job.printerName || t('notAssigned')}</span>
                  <span className="mt-1 text-xs text-slate-400 dark:text-white/40">{job.slotTime || t('waitingApproval')}</span>
                </div>
              </td>
              <td className="px-6 py-5 align-top">
                <div className="flex flex-col text-sm text-slate-600 dark:text-[var(--landing-muted)]">
                  <span>{job.materialType} / {job.color}</span>
                  <span className="mt-1 text-xs text-slate-400 dark:text-white/40">{fillText(shared.createdOn, { date: formatDateWithLocale(job.createdAt, locale, shared.noDate) })}</span>
                </div>
              </td>
              <td className="px-6 py-5 align-top">
                <StatusChip status={job.status as JobStatus} />
              </td>
              <td className="px-6 py-5 text-right align-top">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectJob(job.id);
                  }}
                  className="app-icon-button inline-flex h-10 w-10 items-center justify-center"
                  aria-label={fillText(shared.openItem, { name: job.jobName })}
                >
                  <ArrowRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const emptyState = (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center border border-[rgba(30,23,19,0.08)] bg-white/50 text-slate-400 dark:border-white/8 dark:bg-white/4 dark:text-white/38">
        <FileText size={28} strokeWidth={1.4} />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-900 dark:text-[var(--landing-text)]">
          {isHistoryPage ? adminCopy.historyEmptyTitle : t('noJobs')}
        </p>
        <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-[var(--landing-muted)]">
          {isHistoryPage
            ? adminCopy.historyEmptyDesc
            : adminCopy.emptyStartDesc}
        </p>
      </div>
      {!isHistoryPage && role === Role.STUDENT && (
        <button
          onClick={onNewBooking}
          className="app-primary-button inline-flex min-w-[210px] items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.16em]"
        >
          <AppIcon icon="solar:add-square-bold" size={18} />
          {t('newRequest')}
        </button>
      )}
    </div>
  );

  if (isHistoryPage) {
    return (
      <div className="space-y-6">
        <section className="app-panel grid gap-5 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:py-8">
          <div>
            <p className="app-eyebrow">{adminCopy.historyEyebrow}</p>
            <h2 className="app-display-sm mt-3">{adminCopy.historyTitle}</h2>
            <p className="app-subtle-copy mt-4 max-w-2xl text-sm sm:text-base">
              {adminCopy.historyDesc}
            </p>
          </div>
          <div className="grid gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" size={16} />
              <input
                type="text"
                placeholder={adminCopy.historySearchPlaceholder}
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                className="app-control"
                style={{ paddingLeft: '2.75rem', paddingRight: '1rem' }}
              />
            </div>
            <select
              value={historyFilter}
              onChange={(event) => setHistoryFilter(event.target.value)}
              className="app-control"
            >
              {studentHistoryFilters.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className="app-panel-soft flex items-center justify-between px-4 py-3 text-sm text-slate-600 dark:text-[var(--landing-muted)]">
              <span>{adminCopy.historyMatches}</span>
              <span className="font-semibold text-slate-900 dark:text-[var(--landing-text)]">{loading ? '...' : filteredHistoryJobs.length}</span>
            </div>
          </div>
        </section>

        <section className="app-panel overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500 dark:text-[var(--landing-muted)]">
              <Loader2 size={22} className="animate-spin" />
              <span className="text-sm">{t('loadingData')}</span>
            </div>
          ) : filteredHistoryJobs.length === 0 ? (
            emptyState
          ) : (
            <>
              <div className="md:hidden">
                {filteredHistoryJobs.map(renderJobCard)}
              </div>
              {renderJobsTable(filteredHistoryJobs)}
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="app-panel flex flex-col gap-6 px-6 py-6 lg:px-8 lg:py-8">
        <div>
          <p className="app-eyebrow">{adminCopy.heroEyebrow}</p>
          <h2 className="app-display-sm mt-3">{role === Role.STUDENT ? adminCopy.studentHeroTitle : adminCopy.heroTitle}</h2>
          <p className="app-subtle-copy mt-4 max-w-2xl text-sm sm:text-base">{dashboardCopy}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {role === Role.STUDENT && (
              <button
                onClick={onNewBooking}
                className="app-primary-button inline-flex min-w-[220px] items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.16em]"
              >
                <AppIcon icon="solar:add-square-bold" size={18} />
                {t('newRequest')}
              </button>
            )}
            {role !== Role.STUDENT && (
              <button
                onClick={() => onPageChange('queue')}
                className="app-primary-button inline-flex min-w-[220px] items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.16em]"
              >
                <AppIcon icon="solar:checklist-bold" size={18} />
                {t('queue')}
              </button>
            )}
            <button
              onClick={() => onPageChange('history')}
              className="app-secondary-button inline-flex min-h-[50px] items-center justify-center gap-2 px-5 text-sm font-semibold"
            >
              <AppIcon icon="solar:history-bold" size={18} />
              {adminCopy.viewHistory}
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="app-panel-soft app-hover-box px-4 py-4">
            <p className="app-overline">{adminCopy.userCardTitle}</p>
            <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-[var(--landing-text)]">{currentUser?.fullName || shared.systemUser}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{currentUser?.email || role}</p>
          </div>
          <div className="app-panel-soft app-hover-box px-4 py-4">
            <p className="app-overline">{adminCopy.openRequestsTitle}</p>
            <p className="app-stat-number mt-3 text-slate-900 dark:text-[var(--landing-text)]">{loading ? '...' : activeJobs.length}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{adminCopy.openRequestsNote}</p>
          </div>
          <div className="app-panel-soft app-hover-box px-4 py-4">
            <p className="app-overline">{adminCopy.attentionTitle}</p>
            <p className="app-stat-number mt-3 text-slate-900 dark:text-[var(--landing-text)]">{loading ? '...' : needsRevisionJobs.length}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{adminCopy.attentionNote}</p>
          </div>
        </div>
      </section>

      {needsRevisionJobs.length > 0 && (
        <section className="app-panel border-[rgba(239,125,87,0.28)] bg-[linear-gradient(135deg,rgba(255,247,237,0.92),rgba(255,238,222,0.92))] px-6 py-5 dark:border-[rgba(239,125,87,0.18)] dark:bg-[linear-gradient(135deg,rgba(239,125,87,0.12),rgba(240,179,91,0.06))]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center bg-[rgba(239,125,87,0.16)] text-[var(--landing-accent)]">
              <PenLine size={18} />
            </div>
            <div>
              <p className="app-eyebrow">{adminCopy.needsRevisionEyebrow}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-[var(--landing-text)]">
                {fillText(adminCopy.needsRevisionTitle, { count: needsRevisionJobs.length })}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-[var(--landing-muted)]">
                {needsRevisionJobs.map((job) => job.jobName).join(', ')}
              </p>
            </div>
          </div>
        </section>
      )}

      {renderKpiCards()}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className="space-y-6">
          <div className="app-panel overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-[rgba(30,23,19,0.08)] px-6 py-5 dark:border-white/8">
              <div>
                <p className="app-overline">{role === Role.STUDENT ? adminCopy.myRequestsEyebrow : adminCopy.processingEyebrow}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-[var(--landing-text)]">
                  {role === Role.STUDENT ? t('myJobs') : t('allJobs')}
                </h3>
              </div>
              <button
                onClick={() => onPageChange('history')}
                className="text-sm font-semibold text-[var(--landing-accent)] transition-colors hover:text-[var(--landing-accent-strong)]"
              >
                {adminCopy.viewArchive}
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500 dark:text-[var(--landing-muted)]">
                <Loader2 size={22} className="animate-spin" />
                <span className="text-sm">{t('loadingData')}</span>
              </div>
            ) : recentJobs.length === 0 ? (
              emptyState
            ) : (
              <>
                <div className="md:hidden">
                  {recentJobs.map(renderJobCard)}
                </div>
                {renderJobsTable(recentJobs)}
              </>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <section className="app-hover-box overflow-hidden border border-[rgba(20,33,43,0.08)] bg-[linear-gradient(145deg,#172733_0%,#10202b_58%,#ef7d57_170%)] px-6 py-6 text-white shadow-[0_18px_40px_rgba(14,25,34,0.14)]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">{adminCopy.actionsEyebrow}</p>
            <h3 className="app-display-font mt-3 text-[2rem] leading-none">{primaryAction.title}</h3>
            <p className="mt-4 text-sm leading-7 text-white/74">
              {primaryAction.description}
            </p>
            <button
              onClick={primaryAction.onClick}
              className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 bg-[rgba(255,248,240,0.94)] px-4 text-sm font-black uppercase tracking-[0.16em] text-[var(--landing-bg)] transition-colors hover:bg-white"
            >
              <AppIcon icon={primaryAction.icon} size={18} />
              {primaryAction.label}
            </button>
          </section>

          <section className="app-panel px-5 py-5">
            <p className="app-overline">{adminCopy.shortcutsEyebrow}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => onPageChange(action.id)}
                  className="app-panel-soft app-hover-box flex min-h-[104px] flex-col items-center justify-center gap-3 px-4 text-center transition-colors hover:border-[rgba(239,125,87,0.22)] hover:bg-[rgba(239,125,87,0.08)] dark:hover:bg-[rgba(239,125,87,0.1)]"
                >
                  <AppIcon icon={action.icon} size={20} className="text-[var(--landing-accent)]" />
                  <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-700 dark:text-[var(--landing-text)]">{action.label}</span>
                </button>
              ))}
            </div>
          </section>

          {activeJobs.length > 0 && (
            <section className="app-panel px-5 py-5">
              <p className="app-overline">{adminCopy.trackingEyebrow}</p>
              <div className="mt-4 space-y-3">
                {activeJobs.slice(0, 3).map((job) => {
                  const stepIndex = Math.max(FLOW_STEPS.indexOf(job.status as JobStatus), 0);
                  return (
                    <button
                      key={job.id}
                      onClick={() => onSelectJob(job.id)}
                      className="app-panel-soft app-hover-box block w-full px-4 py-4 text-left transition-colors hover:border-[rgba(239,125,87,0.18)] hover:bg-[rgba(239,125,87,0.08)] dark:hover:bg-[rgba(239,125,87,0.1)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.jobName}</p>
                          <p className="mt-1 text-xs text-slate-400 dark:text-white/40">#{job.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTrackerIcon(job.status)}
                          <StatusChip status={job.status as JobStatus} className="min-h-[24px] px-2 py-0.5 text-[9px]" />
                        </div>
                      </div>
                      <div className="mt-4 flex gap-1">
                        {FLOW_STEPS.map((step, index) => (
                          <span
                            key={step}
                            className={cn(
                              'h-1.5 flex-1',
                              index <= stepIndex ? 'bg-[var(--landing-accent)]' : 'bg-slate-200 dark:bg-white/8'
                            )}
                          />
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-slate-500 dark:text-[var(--landing-muted)]">{job.printerName || t('notAssigned')}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {stats && (
            <section className="app-panel px-5 py-5">
              <p className="app-overline">{adminCopy.labStatsEyebrow}</p>
              <div className="mt-4 space-y-3 text-sm">
                {[
                  { label: t('totalJobs'), value: stats.totalJobs, valueClass: 'text-slate-900 dark:text-[var(--landing-text)]' },
                  { label: t('printing'), value: stats.printing, valueClass: 'text-emerald-700 dark:text-emerald-200' },
                  { label: t('pendingApproval'), value: stats.pendingReview, valueClass: 'text-[var(--landing-accent)]' },
                  { label: t('activeUsers'), value: stats.totalUsers, valueClass: 'text-slate-900 dark:text-[var(--landing-text)]' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between border-b border-[rgba(30,23,19,0.06)] pb-3 last:border-b-0 last:pb-0 dark:border-white/6">
                    <span className="text-slate-500 dark:text-[var(--landing-muted)]">{item.label}</span>
                    <span className={cn('font-semibold', item.valueClass)}>{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {dailyStats.length > 0 && (
            <section className="app-panel px-5 py-5">
              <p className="app-overline">{adminCopy.sevenDayEyebrow}</p>
              <div className="mt-4 flex h-32 items-end gap-2">
                {dailyStats.map((day: DailyStat) => {
                  const total = day.approved + day.done + day.rejected + day.needsRevision;
                  const doneHeight = day.done ? Math.max((day.done / maxDailyTotal) * 88, 6) : 0;
                  const approvedHeight = day.approved ? Math.max((day.approved / maxDailyTotal) * 88, 6) : 0;
                  const rejectedHeight = day.rejected ? Math.max((day.rejected / maxDailyTotal) * 88, 6) : 0;
                  const revisionHeight = day.needsRevision ? Math.max((day.needsRevision / maxDailyTotal) * 88, 6) : 0;
                  return (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-[92px] w-full flex-col justify-end gap-px">
                        {day.done > 0 && <span className="w-full bg-emerald-500" style={{ height: `${doneHeight}px` }} />}
                        {day.approved > 0 && <span className="w-full bg-sky-500" style={{ height: `${approvedHeight}px` }} />}
                        {day.rejected > 0 && <span className="w-full bg-rose-400" style={{ height: `${rejectedHeight}px` }} />}
                        {day.needsRevision > 0 && <span className="w-full bg-orange-400" style={{ height: `${revisionHeight}px` }} />}
                        {total === 0 && <span className="h-[4px] w-full bg-slate-200 dark:bg-white/8" />}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-white/38">{day.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-slate-500 dark:text-[var(--landing-muted)]">
                {[
                  { color: 'bg-emerald-500', label: adminCopy.chartLegend.done },
                  { color: 'bg-sky-500', label: adminCopy.chartLegend.approved },
                  { color: 'bg-rose-400', label: adminCopy.chartLegend.rejected },
                  { color: 'bg-orange-400', label: adminCopy.chartLegend.revision },
                ].map((item) => (
                  <span key={item.label} className="inline-flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5', item.color)} />
                    {item.label}
                  </span>
                ))}
              </div>
            </section>
          )}
        </aside>
      </section>
    </div>
  );
};


