import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  FileText,
  MessageSquare,
  Download,
  CheckCircle2,
  AlertCircle,
  PenLine,
  Send,
  Loader2,
  Package,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppToast } from '../components/feedback/AppToast';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { PrintJob, JobStatus } from '../types';
import { useToast } from '../components/feedback/useToast';
import { StatusChip } from '../components/StatusChip';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { getJobDetailExperience, getUiText, fillText } from '../lib/uiText';

interface JobDetailProps {
  job: PrintJob;
  onBack: () => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({ job, onBack }) => {
  const { role } = useAuth();
  const { lang } = useLang();
  const copy = getUiText(lang);
  const jobDetailExperience = getJobDetailExperience(lang, role);
  const { toast, dismissToast, showError, showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitDone, setResubmitDone] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleFileDownload = async () => {
    if (!job.fileName) return;
    try {
      const token = localStorage.getItem('lab_token');
      const res = await fetch(api.downloadJobFile(job.fileName), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(copy.shared.pageLoadFailed);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = job.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : copy.shared.pageLoadFailed);
    }
  };

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      await api.resubmitJob(job.id);
      setResubmitDone(true);
      showSuccess(copy.jobDetail.resubmitSuccess);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : copy.jobDetail.resubmitFailed);
    } finally {
      setResubmitting(false);
    }
  };

  const createdDate = new Date(job.createdAt);
  const fmt = (d: Date) => d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const timeline = [
    { status: JobStatus.SUBMITTED, time: fmt(createdDate), done: true },
    { status: JobStatus.PENDING_REVIEW, time: fmt(new Date(createdDate.getTime() + 5 * 60000)), done: true },
    { status: JobStatus.APPROVED, time: job.status !== JobStatus.PENDING_REVIEW ? fmt(new Date(createdDate.getTime() + 24 * 3600000)) : '—', done: job.status !== JobStatus.PENDING_REVIEW },
    { status: JobStatus.SCHEDULED, time: [JobStatus.SCHEDULED, JobStatus.PRINTING, JobStatus.DONE].includes(job.status) ? fmt(new Date(createdDate.getTime() + 24 * 3600000 + 3600000)) : '—', done: [JobStatus.SCHEDULED, JobStatus.PRINTING, JobStatus.DONE].includes(job.status) },
    { status: JobStatus.PRINTING, time: [JobStatus.PRINTING, JobStatus.DONE].includes(job.status) ? (job.slotTime || '—') : '—', done: [JobStatus.PRINTING, JobStatus.DONE].includes(job.status) },
    { status: JobStatus.DONE, time: job.status === JobStatus.DONE ? fmt(new Date()) : '—', done: job.status === JobStatus.DONE },
  ];

  const tabs = [
    { id: 'overview', label: copy.jobDetail.tabOverview, icon: FileText },
    { id: 'timeline', label: copy.jobDetail.tabTimeline, icon: Clock },
    { id: 'files', label: copy.jobDetail.tabFiles, icon: Package },
  ].filter((tab) => jobDetailExperience.visibleTabs.includes(tab.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-5xl space-y-6"
    >
      <AppToast toast={toast} onClose={dismissToast} />
      <ConfirmDialog
        open={cancelDialogOpen}
        title={copy.jobDetail.cancelRequest}
        body={copy.jobDetail.cancelConfirm}
        confirmLabel={copy.jobDetail.cancelRequest}
        cancelLabel="Cancel"
        destructive
        onConfirm={async () => {
          setCancelDialogOpen(false);
          try {
            await api.updateJob(job.id, { status: JobStatus.CANCELLED });
            showSuccess(copy.jobDetail.cancelSuccess);
            onBack();
          } catch (err: unknown) {
            showError(err instanceof Error ? err.message : copy.jobDetail.cancelFailed);
          }
        }}
        onCancel={() => setCancelDialogOpen(false)}
      />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="app-icon-button flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0 pt-0.5">
            <p className="app-eyebrow mb-2">// {copy.jobDetail.detailTitle || 'CHI TIẾT'}</p>
            <h2 className="app-display-sm truncate text-xl lg:text-[2rem]">{job.jobName}</h2>
            <p className="app-subtle-copy mt-3 text-sm">
              {copy.jobDetail.requestCodeLabel} <span className="font-mono font-bold text-slate-900 dark:text-white">#{job.id}</span> • {fillText(copy.shared.createdOn, { date: new Date(job.createdAt).toLocaleDateString('vi-VN') })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end">
          <StatusChip status={job.status} />
          {![JobStatus.DONE, JobStatus.CANCELLED, JobStatus.REJECTED].includes(job.status) && (
            <button
              onClick={() => setCancelDialogOpen(true)}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-rose-200 bg-rose-100/80 px-4 text-[13px] font-black uppercase tracking-[0.16em] text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
            >
              {copy.jobDetail.cancelRequest}
            </button>
          )}
        </div>
      </div>

      {job.status === JobStatus.NEEDS_REVISION && (
        <div className="app-panel border-[rgba(239,125,87,0.28)] bg-[linear-gradient(135deg,rgba(255,247,237,0.92),rgba(255,238,222,0.92))] px-5 py-5 dark:border-[rgba(239,125,87,0.18)] dark:bg-[linear-gradient(135deg,rgba(239,125,87,0.12),rgba(240,179,91,0.06))] sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[rgba(239,125,87,0.2)] bg-[rgba(239,125,87,0.1)] text-[var(--landing-accent)]">
              <PenLine size={22} />
            </div>
            <div className="flex-1">
              <h4 className="app-eyebrow mb-2">{copy.jobDetail.revisionTitle}</h4>
              {job.revisionNote ? (
                <p className="text-sm leading-relaxed text-slate-800 dark:text-[#ffd7cc]">"{job.revisionNote}"</p>
              ) : (
                <p className="text-sm text-slate-700 dark:text-[#ffd7cc]/70">{copy.jobDetail.revisionFallback}</p>
              )}
              {resubmitDone ? (
                <div className="mt-5 flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={18} /> {copy.jobDetail.resubmitSuccess}
                </div>
              ) : (
                <button
                  onClick={handleResubmit}
                  disabled={resubmitting}
                  className="app-primary-button mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 px-5 text-[13px] font-black uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {copy.jobDetail.resubmitButton}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="app-tab-strip" role="tablist" aria-label={copy.jobDetail.detailTitle}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'app-tab-button relative flex flex-1 items-center justify-center gap-2 sm:flex-none',
              activeTab === tab.id && 'is-active'
            )}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="job-detail-tab"
                className="absolute inset-0 z-0 bg-white"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <div className="relative z-10 flex items-center gap-2">
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="app-panel px-5 py-5 sm:px-6 sm:py-6">
                <p className="app-overline mb-5">{copy.jobDetail.detailTitle}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="app-panel-soft px-4 py-4">
                    <p className="app-overline">{copy.jobDetail.materialTypeLabel}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.materialType} ({job.color})</p>
                  </div>
                  <div className="app-panel-soft px-4 py-4">
                    <p className="app-overline">{copy.jobDetail.materialSourceLabel}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{copy.shared.materialSources[job.materialSource]}</p>
                  </div>
                  <div className="app-panel-soft px-4 py-4">
                    <p className="app-overline">{copy.jobDetail.estimatedWeightLabel}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.estimatedGrams || 0} gram</p>
                  </div>
                  <div className="app-panel-soft px-4 py-4">
                    <p className="app-overline">{copy.jobDetail.estimatedTimeLabel}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.estimatedTime || copy.shared.noDuration}</p>
                  </div>
                  <div className="app-panel-soft px-4 py-4">
                    <p className="app-overline">{copy.jobDetail.assignedPrinterLabel}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.printerName || copy.jobDetail.notAssigned}</p>
                  </div>
                  <div className="app-panel-soft px-4 py-4">
                    <p className="app-overline">{copy.jobDetail.printSlotLabel}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.slotTime || copy.jobDetail.notScheduled}</p>
                  </div>
                </div>
              </div>

              <div className="app-panel px-5 py-5 sm:px-6 sm:py-6">
                <p className="app-overline mb-4">{copy.jobDetail.printNotes}</p>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-[var(--landing-muted)]">
                  {job.description || copy.jobDetail.noNotes}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="app-panel px-5 py-5 sm:px-6 sm:py-6">
              <div className="relative space-y-6 sm:space-y-8">
                <div className="absolute bottom-0 left-[23px] top-0 w-px bg-[rgba(30,23,19,0.08)] dark:bg-white/8"></div>
                {timeline.map((item, i) => (
                  <div key={i} className="relative z-10 flex items-start gap-5">
                    <div className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center border',
                      item.done 
                        ? 'border-[var(--landing-accent)] bg-[rgba(239,125,87,0.15)] text-[var(--landing-accent)] dark:border-[rgba(239,125,87,0.3)] dark:bg-[rgba(239,125,87,0.1)]' 
                        : 'border-[rgba(30,23,19,0.08)] bg-white text-slate-300 dark:border-white/8 dark:bg-white/4 dark:text-white/20'
                    )}>
                      {item.done ? <CheckCircle2 size={18} /> : <div className="h-1.5 w-1.5 rounded-full bg-current" />}
                    </div>
                    <div className="pt-2">
                      <h4 className={cn('text-[13px] font-bold uppercase tracking-[0.12em]', item.done ? 'text-slate-900 dark:text-[var(--landing-text)]' : 'text-slate-400 dark:text-white/40')}>
                        {item.status}
                      </h4>
                      <p className="text-xs mt-1.5 text-slate-500 dark:text-[var(--landing-muted)]">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="app-panel px-5 py-5 sm:px-6 sm:py-6">
              <p className="app-overline mb-5">{copy.jobDetail.tabFiles}</p>
              <div className="app-panel-soft app-hover-box flex cursor-pointer items-center gap-4 px-4 py-4 transition-colors">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.7)] text-[var(--landing-accent)] dark:border-white/8 dark:bg-white/4">
                  <FileText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.fileName}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-[var(--landing-muted)]">{job.fileName?.split('.').pop() || 'FILE'}</p>
                </div>
                <button onClick={handleFileDownload} className="app-icon-button flex h-10 w-10 shrink-0 items-center justify-center self-center text-slate-500 hover:text-[var(--landing-accent)] dark:text-white/40">
                  <Download size={18} />
                </button>
              </div>
            </div>
          )}

          {jobDetailExperience.showPaymentPanel && activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="app-panel px-5 py-5 sm:px-6 sm:py-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="app-overline">{copy.jobDetail.paymentTitle}</h3>
                  <span className={cn(
                    'inline-flex min-h-[28px] items-center px-3 text-[10px] font-black uppercase tracking-[0.18em]',
                    job.status === JobStatus.DONE 
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' 
                      : 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                  )}>
                    {job.status === JobStatus.DONE ? copy.jobDetail.paid : copy.jobDetail.unpaid}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-600 dark:text-[var(--landing-muted)]">{fillText(copy.jobDetail.materialCost, { type: job.materialType })}</span>
                    <span className="font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.cost.toLocaleString()}đ</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span className="font-medium text-slate-600 dark:text-[var(--landing-muted)]">{copy.jobDetail.serviceFee}</span>
                    <span className="font-semibold text-slate-900 dark:text-[var(--landing-text)]">0đ</span>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-[rgba(30,23,19,0.06)] pt-5 dark:border-white/6 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-black uppercase tracking-[0.16em] text-slate-400 dark:text-white/35">{copy.jobDetail.total}</span>
                    <span className="app-display-sm text-[var(--landing-accent)]">{job.cost.toLocaleString()}đ</span>
                  </div>
                </div>
              </div>

              <div className="app-panel border-[rgba(143,209,232,0.3)] bg-[linear-gradient(135deg,rgba(242,250,253,0.92),rgba(235,247,252,0.92))] px-5 py-5 dark:border-[rgba(143,209,232,0.15)] dark:bg-[linear-gradient(135deg,rgba(143,209,232,0.08),rgba(143,209,232,0.03))] sm:px-6 sm:py-6">
                <h4 className="app-eyebrow mb-2 text-sky-700 dark:text-sky-300">{copy.jobDetail.paymentGuideTitle}</h4>
                <p className="mb-5 text-sm leading-relaxed text-sky-900 dark:text-sky-100/70">
                  {copy.jobDetail.paymentGuideDesc} <strong className="text-sky-950 dark:text-sky-100">{job.id} - {job.userName}</strong>
                </p>
                <div className="mx-auto flex h-36 w-36 items-center justify-center border border-[rgba(143,209,232,0.2)] bg-white shadow-sm dark:bg-slate-900">
                  <div className="flex h-28 w-28 items-center justify-center bg-slate-50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:bg-slate-800">QR Code</div>
                </div>
              </div>
            </div>
          )}

          {jobDetailExperience.showMessagesPanel && activeTab === 'messages' && (
            <div className="app-panel flex min-h-[300px] flex-col items-center justify-center px-5 py-10 text-center sm:px-6 sm:py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center border border-[rgba(30,23,19,0.08)] bg-white/50 text-slate-400 dark:border-white/8 dark:bg-white/4 dark:text-white/38">
                <MessageSquare size={24} strokeWidth={1.5} />
              </div>
              <p className="text-base font-semibold text-slate-900 dark:text-[var(--landing-text)]">Chưa có tính năng này</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-[var(--landing-muted)]">Tin nhắn đơn lẻ sẽ sớm được cập nhật.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="app-panel px-5 py-5 sm:px-6 sm:py-6">
            <p className="app-overline mb-4">{copy.jobDetail.attachments}</p>
            <div className="app-panel-soft app-hover-box flex cursor-pointer items-center gap-3 px-3 py-3 transition-colors" onClick={handleFileDownload}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.7)] text-[var(--landing-accent)] dark:border-white/8 dark:bg-white/4">
                <FileText size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.fileName}</p>
                <p className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-500 dark:text-[var(--landing-muted)]">{job.fileName?.split('.').pop() || 'FILE'}</p>
              </div>
              <Download size={14} className="text-slate-400 dark:text-white/35" />
            </div>
          </div>

          <div className="app-panel px-5 py-5 sm:px-6 sm:py-6">
            <p className="app-overline mb-4">{copy.jobDetail.moderatorLabel}</p>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--landing-accent)] bg-[rgba(239,125,87,0.12)] text-[12px] font-black uppercase text-[var(--landing-accent)] dark:border-[rgba(239,125,87,0.3)] dark:bg-[rgba(239,125,87,0.15)]">
                {job.moderatorName ? job.moderatorName.split(' ').map((w: string) => w[0]).join('').slice(0, 2) : '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{job.moderatorName || copy.jobDetail.notAssigned}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-[var(--landing-muted)]">Lab Moderator</p>
              </div>
            </div>
          </div>

          {job.rejectionReason && (
            <div className="app-panel border-rose-200 bg-rose-50/50 px-5 py-5 dark:border-rose-900/40 dark:bg-rose-950/20 sm:px-6 sm:py-6">
              <div className="mb-3 flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertCircle size={18} />
                <h4 className="app-overline text-rose-600 dark:text-rose-400">{copy.jobDetail.rejectionReason}</h4>
              </div>
              <p className="text-sm italic leading-relaxed text-rose-700 dark:text-rose-300">
                "{job.rejectionReason}"
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
