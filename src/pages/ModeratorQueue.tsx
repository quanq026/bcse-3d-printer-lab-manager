import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  PenLine,
  RefreshCw,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppToast } from '../components/feedback/AppToast';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { useToast } from '../components/feedback/useToast';
import { StatusChip } from '../components/StatusChip';
import { useLang } from '../contexts/LanguageContext';
import { api } from '../lib/api';
import { fillText, getUiText } from '../lib/uiText';
import { cn } from '../lib/utils';
import type { PrintJob, Printer, PricingRule, ServiceFee } from '../types';
import { JobStatus, MaterialSource } from '../types';

interface ModeratorQueueProps {
  onSelectJob: (id: string) => void;
}

const ACTIVE_STATUSES = [
  JobStatus.PENDING_REVIEW,
  JobStatus.SUBMITTED,
  JobStatus.PRINTING,
  JobStatus.APPROVED,
  JobStatus.SCHEDULED,
  JobStatus.NEEDS_REVISION,
];

const MODERATOR_STATUS_OPTIONS = [
  JobStatus.SUBMITTED,
  JobStatus.PENDING_REVIEW,
  JobStatus.APPROVED,
  JobStatus.SCHEDULED,
  JobStatus.PRINTING,
  JobStatus.DONE,
  JobStatus.NEEDS_REVISION,
  JobStatus.REJECTED,
  JobStatus.CANCELLED,
];

export const ModeratorQueue: React.FC<ModeratorQueueProps> = ({ onSelectJob }) => {
  const { lang } = useLang();
  const text = getUiText(lang);
  const copy = text.moderatorQueue;
  const shared = text.shared;
  const locale = lang === 'JP' ? 'en-US' : 'vi-VN';

  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [moderatorNote, setModeratorNote] = useState('');
  const [actualGrams, setActualGrams] = useState('');
  const [search, setSearch] = useState('');
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [quoteGrams, setQuoteGrams] = useState('');
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [pricing, setPricing] = useState<PricingRule[]>([]);
  const [serviceFees, setServiceFees] = useState<ServiceFee[]>([]);
  const selectedIdRef = useRef<string | null>(null);
  const { toast, dismissToast, showError, showSuccess } = useToast();
  const [confirmState, setConfirmState] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);

  const statusLabel = (value: JobStatus | string) => shared.jobStatuses[value as keyof typeof shared.jobStatuses] || value;
  const materialSourceLabel = (value: MaterialSource | string) => shared.materialSources[value as keyof typeof shared.materialSources] || value;

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getJobs();
      setJobs(data);

      const nextSelection = data.find((job: PrintJob) => job.id === selectedIdRef.current)
        || data.find((job: PrintJob) => ACTIVE_STATUSES.includes(job.status))
        || data[0];

      setSelectedId(nextSelection?.id || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
    api.getPrinters().then(setPrinters).catch(console.error);
    api.getPricing().then(setPricing).catch(console.error);
    api.getServiceFees().then(setServiceFees).catch(console.error);
  }, [fetchJobs]);

  const activeJobs = useMemo(
    () => jobs.filter((job) => ACTIVE_STATUSES.includes(job.status)),
    [jobs]
  );

  const filteredJobs = useMemo(
    () => activeJobs.filter((job) => (
      !search
      || job.jobName?.toLowerCase().includes(search.toLowerCase())
      || job.userName?.toLowerCase().includes(search.toLowerCase())
      || job.id?.toLowerCase().includes(search.toLowerCase())
    )),
    [activeJobs, search]
  );

  const selectedJob = jobs.find((job) => job.id === selectedId);
  const pendingCount = activeJobs.filter((job) => [JobStatus.PENDING_REVIEW, JobStatus.SUBMITTED].includes(job.status)).length;
  const printingCount = activeJobs.filter((job) => job.status === JobStatus.PRINTING).length;
  const revisionCount = activeJobs.filter((job) => job.status === JobStatus.NEEDS_REVISION).length;

  const doAction = async (status: JobStatus, extra?: Record<string, unknown>) => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      await api.updateJob(selectedId, { status, notes: moderatorNote || undefined, ...extra });
      await fetchJobs();
      setModeratorNote('');
      setActualGrams('');
      showSuccess(statusLabel(status));
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : copy.actionError);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrinterAssign = async (printerId: string) => {
    if (!selectedJob) return;
    try {
      await api.updateJob(selectedJob.id, { printerId: printerId || null });
      await fetchJobs();
      showSuccess(copy.assignPrinter);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : copy.updateError);
    }
  };

  const handleStatusOverride = async (newStatus: JobStatus) => {
    if (!selectedJob) return;
    setConfirmState({
      title: copy.statusQuickTitle,
      body: fillText(copy.confirmStatus, { from: statusLabel(selectedJob.status), to: statusLabel(newStatus) }),
      confirmLabel: statusLabel(newStatus),
      onConfirm: async () => {
        setConfirmState(null);
        setActionLoading(true);
        try {
          await api.updateJob(selectedJob.id, { status: newStatus });
          await fetchJobs();
          showSuccess(statusLabel(newStatus));
        } catch (err: unknown) {
          showError(err instanceof Error ? err.message : copy.updateError);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const renderQuoteCard = () => {
    if (
      !selectedJob
      || selectedJob.printMode !== 'lab_assisted'
      || selectedJob.materialSource !== MaterialSource.LAB
      || ![JobStatus.PENDING_REVIEW, JobStatus.SUBMITTED].includes(selectedJob.status)
    ) {
      return null;
    }

    const grams = Number.parseInt(quoteGrams, 10) || selectedJob.estimatedGrams || 0;
    const pricingRule = pricing.find((item: PricingRule) => item.material === selectedJob.materialType);
    const materialCost = (pricingRule?.pricePerGram || 0) * grams;
    const serviceFee = serviceFees.find((item: ServiceFee) => item.name === 'service_fee');
    const serviceCost = (serviceFee?.enabled !== false ? serviceFee?.amount || 0 : 0) * grams;
    const totalCost = materialCost + serviceCost;

    return (
      <section className="app-panel border-[rgba(240,179,91,0.28)] bg-[linear-gradient(135deg,rgba(255,248,234,0.94),rgba(255,240,219,0.9))] px-5 py-5 dark:border-[rgba(240,179,91,0.18)] dark:bg-[linear-gradient(135deg,rgba(240,179,91,0.12),rgba(239,125,87,0.08))]">
        <div className="flex items-center gap-2">
          <Calculator size={18} className="text-[var(--landing-amber)]" />
          <p className="app-overline text-[var(--landing-amber)]">{copy.quoteEyebrow}</p>
        </div>
        <p className="mt-3 text-sm text-slate-700 dark:text-[var(--landing-text)]">{copy.quoteDesc}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="app-overline mb-2 block">{copy.quoteGrams}</label>
            <input
              type="number"
              min="0"
              placeholder={selectedJob.estimatedGrams?.toString() || '0'}
              value={quoteGrams}
              onChange={(event) => setQuoteGrams(event.target.value)}
              className="app-control"
            />
          </div>
          <div>
            <label className="app-overline mb-2 block">{copy.quoteCost}</label>
            <div className="app-panel-soft flex min-h-[46px] items-center px-4 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">
              {totalCost.toLocaleString(locale)} VND
            </div>
          </div>
        </div>

        <button
          disabled={quoteSaving || !quoteGrams || Number.parseInt(quoteGrams, 10) <= 0}
          onClick={async () => {
            setQuoteSaving(true);
            try {
              await api.updateJob(selectedJob.id, { estimatedGrams: Number.parseInt(quoteGrams, 10) });
              await fetchJobs();
              setQuoteGrams('');
              showSuccess(copy.quoteSaved);
            } catch (err: unknown) {
              showError(err instanceof Error ? err.message : copy.updateError);
            } finally {
              setQuoteSaving(false);
            }
          }}
          className="app-primary-button mt-5 inline-flex min-h-[50px] w-full items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {quoteSaving ? <Loader2 size={18} className="animate-spin" /> : <Calculator size={18} />}
          {copy.quoteSave}
        </button>
      </section>
    );
  };

  const renderActionBoard = () => {
    if (!selectedJob) return null;

    if (selectedJob.status === JobStatus.PRINTING) {
      return (
        <section className="app-panel px-5 py-5">
          <p className="app-overline">{copy.printingEyebrow}</p>
          <div className="mt-4 grid gap-4">
            <div className="app-panel-soft px-4 py-4">
              <p className="text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">
                {fillText(copy.printingMachine, { name: selectedJob.printerName || copy.noPrinter })}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{copy.printingDesc}</p>
            </div>

            <div>
              <label className="app-overline mb-2 block">{copy.actualGrams}</label>
              <input
                type="number"
                value={actualGrams}
                onChange={(event) => setActualGrams(event.target.value)}
                placeholder={copy.actualGramsPlaceholder}
                className="app-control"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => doAction(JobStatus.DONE, { actualGrams: Number.parseFloat(actualGrams) || undefined })}
                disabled={actionLoading}
                className="app-primary-button inline-flex min-h-[50px] items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {copy.markDone}
              </button>
              <button
                onClick={() => doAction(JobStatus.CANCELLED)}
                disabled={actionLoading}
                className="inline-flex min-h-[50px] items-center justify-center gap-2 border border-rose-200 bg-rose-100/80 px-5 text-sm font-black uppercase tracking-[0.16em] text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle size={18} />
                {copy.cancelJob}
              </button>
            </div>
          </div>
        </section>
      );
    }

    if ([JobStatus.APPROVED, JobStatus.SCHEDULED].includes(selectedJob.status)) {
      return (
        <section className="app-panel px-5 py-5">
          <p className="app-overline">{copy.readyEyebrow}</p>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="app-overline mb-2 block">{copy.assignPrinter}</label>
              <select
                className="app-control"
                value={selectedJob.printerId || ''}
                onChange={(event) => handlePrinterAssign(event.target.value)}
              >
                <option value="">{shared.choosePrinter}</option>
                {printers.map((printer: Printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name} ({printer.status})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => doAction(JobStatus.PRINTING)}
              disabled={actionLoading}
              className="app-primary-button inline-flex min-h-[50px] items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {copy.startPrinting}
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="app-panel px-5 py-5">
        <p className="app-overline">{copy.moderationEyebrow}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <button
              onClick={() => doAction(JobStatus.APPROVED)}
              disabled={actionLoading}
              className="app-primary-button inline-flex min-h-[50px] w-full items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
              {copy.approve}
            </button>

            <button
              onClick={() => {
                if (!moderatorNote.trim()) {
                  showError(copy.revisionNoteAlert);
                  return;
                }
                doAction(JobStatus.NEEDS_REVISION, { revisionNote: moderatorNote });
              }}
              disabled={actionLoading}
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 border border-amber-200 bg-amber-100/80 px-5 text-sm font-black uppercase tracking-[0.16em] text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PenLine size={18} />
              {copy.requestRevision}
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => doAction(JobStatus.REJECTED)}
              disabled={actionLoading}
              className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 border border-rose-200 bg-rose-100/80 px-5 text-sm font-black uppercase tracking-[0.16em] text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
              {copy.reject}
            </button>

            <div className="app-panel-soft px-4 py-4">
              <label className="app-overline mb-2 block">{copy.assignPrinterFirst}</label>
              <select
                className="app-control"
                value={selectedJob.printerId || ''}
                onChange={(event) => handlePrinterAssign(event.target.value)}
              >
                <option value="">{shared.choosePrinter}</option>
                {printers.map((printer: Printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="app-admin-squared app-admin-compact space-y-5">
      <AppToast toast={toast} onClose={dismissToast} />
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title || ''}
        body={confirmState?.body || ''}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        cancelLabel="Cancel"
        destructive={confirmState?.destructive}
        onConfirm={() => { void confirmState?.onConfirm(); }}
        onCancel={() => setConfirmState(null)}
      />
      <section className="app-panel flex flex-col gap-6 px-5 py-5 lg:px-6 lg:py-6">
        <div>
          <p className="app-eyebrow">{copy.heroEyebrow}</p>
          <h2 className="app-display-sm mt-2">{copy.heroTitle}</h2>
          <p className="app-subtle-copy mt-3 max-w-2xl text-sm">{copy.heroDesc}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { ...copy.cards.pending, value: pendingCount },
            { ...copy.cards.printing, value: printingCount },
            { ...copy.cards.revision, value: revisionCount },
          ].map((card, index) => (
            <motion.article
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="app-panel-soft app-hover-box px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="app-overline">{card.label}</p>
                <span className="app-overline">0{index + 1}</span>
              </div>
              <p className="app-stat-number mt-4 text-slate-900 dark:text-[var(--landing-text)]">{card.value}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{card.note}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="app-panel overflow-hidden">
          <div className="border-b border-[rgba(30,23,19,0.08)] px-5 py-4 dark:border-white/8">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="app-overline">{copy.listEyebrow}</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-[var(--landing-text)]">{fillText(copy.listCount, { count: filteredJobs.length })}</h3>
                </div>
                <button
                  onClick={fetchJobs}
                  className="app-secondary-button inline-flex min-h-[44px] items-center justify-center gap-2 px-4 text-sm font-semibold"
                >
                  <RefreshCw size={16} />
                  {copy.refresh}
                </button>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/35" size={16} />
                <input
                  type="text"
                  placeholder={copy.searchPlaceholder}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="app-control app-search-input"
                />
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500 dark:text-[var(--landing-muted)]">
                <Loader2 size={22} className="animate-spin" />
                <span className="text-sm">{copy.loading}</span>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center border border-[rgba(30,23,19,0.08)] bg-white/50 text-slate-400 dark:border-white/8 dark:bg-white/4 dark:text-white/38">
                  <FileText size={28} strokeWidth={1.4} />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-[var(--landing-text)]">{copy.emptyTitle}</p>
                  <p className="mt-2 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{copy.emptyDesc}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 px-4 py-4">
                {filteredJobs.map((job, index) => (
                  <motion.button
                    key={job.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedId(job.id)}
                    className={cn(
                      'app-panel-soft app-hover-box block w-full px-4 py-4 text-left relative',
                      selectedId === job.id && 'border-[rgba(239,125,87,0.24)] bg-[rgba(239,125,87,0.1)] dark:bg-[rgba(239,125,87,0.12)]'
                    )}
                  >
                    {selectedId === job.id && (
                      <motion.div
                        layoutId="active-moderator-job"
                        className="absolute inset-0 z-0 bg-[rgba(239,125,87,0.08)]"
                      />
                    )}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="app-overline">#{job.id}</p>
                          <p className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.jobName}</p>
                        </div>
                        <StatusChip status={job.status as JobStatus} className="text-[9px]" />
                      </div>

                      <div className="mt-4 grid gap-2 text-xs text-slate-500 dark:text-[var(--landing-muted)]">
                        <p className="inline-flex items-center gap-2">
                          <User size={12} />
                          {job.userName}
                        </p>
                        <p className="inline-flex items-center gap-2">
                          <Clock size={12} />
                          {job.estimatedTime || shared.noDuration}
                        </p>
                        <p className="truncate text-[11px] uppercase tracking-[0.16em] text-slate-400 dark:text-white/38">
                          {job.materialType} • {job.color} • {materialSourceLabel(job.materialSource)}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="app-panel overflow-hidden">
          {!selectedJob ? (
            <div className="flex min-h-[500px] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center border border-[rgba(30,23,19,0.08)] bg-white/50 text-slate-400 dark:border-white/8 dark:bg-white/4 dark:text-white/38">
                <FileText size={28} strokeWidth={1.4} />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-[var(--landing-text)]">{copy.selectTitle}</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{copy.selectDesc}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-[rgba(30,23,19,0.08)] px-5 py-4 dark:border-white/8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="app-overline">{copy.profileEyebrow}</p>
                    <h3 className="mt-2 truncate text-xl font-semibold text-slate-900 dark:text-[var(--landing-text)]">{selectedJob.jobName}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{fillText(copy.requestedBy, { user: selectedJob.userName, id: selectedJob.id })}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusChip status={selectedJob.status as JobStatus} />
                    <button
                      onClick={() => onSelectJob(selectedJob.id)}
                      className="app-secondary-button inline-flex min-h-[44px] items-center justify-center gap-2 px-4 text-sm font-semibold"
                    >
                      <FileText size={16} />
                      {copy.openDetail}
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[calc(100vh-300px)] overflow-y-auto px-5 py-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedId}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
                    <section className="app-panel-soft px-4 py-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="min-w-0">
                          <p className="app-overline">{copy.statusQuickTitle}</p>
                          <p className="mt-2 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{fillText(copy.currentStatus, { status: statusLabel(selectedJob.status as JobStatus) })}</p>
                        </div>
                        <select
                          className="app-control lg:ml-auto lg:max-w-[280px]"
                          value=""
                          onChange={(event) => {
                            const newStatus = event.target.value as JobStatus;
                            if (!newStatus) return;
                            handleStatusOverride(newStatus);
                            event.target.value = '';
                          }}
                        >
                          <option value="">{copy.changeTo}</option>
                          {MODERATOR_STATUS_OPTIONS.filter((status) => status !== selectedJob.status).map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </section>

                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: copy.summary.material, value: `${selectedJob.materialType} / ${selectedJob.color}` },
                        { label: copy.summary.estimatedGrams, value: `${selectedJob.estimatedGrams || 0}g` },
                        { label: copy.summary.materialSource, value: materialSourceLabel(selectedJob.materialSource) },
                        { label: copy.summary.estimatedTime, value: selectedJob.estimatedTime || shared.noDuration },
                      ].map((item, idx) => (
                        <motion.article
                          key={item.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="app-panel-soft app-hover-box px-4 py-4"
                        >
                          <p className="app-overline">{item.label}</p>
                          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{item.value}</p>
                        </motion.article>
                      ))}
                    </section>

                    {renderQuoteCard()}
                    {renderActionBoard()}

                    <section className="app-panel px-5 py-5">
                      <p className="app-overline">{copy.moderatorNoteEyebrow}</p>
                      <textarea
                        value={moderatorNote}
                        onChange={(event) => setModeratorNote(event.target.value)}
                        placeholder={copy.moderatorNotePlaceholder}
                        className="app-control mt-4 min-h-[160px] resize-none py-4"
                      />
                    </section>
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
