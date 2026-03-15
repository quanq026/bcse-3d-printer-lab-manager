import React from 'react';
import { useLang } from '../contexts/LanguageContext';
import { getUiText } from '../lib/uiText';
import { JobStatus } from '../types';
import { cn } from '../lib/utils';

interface StatusChipProps {
  status: JobStatus;
  className?: string;
}

const STATUS_STYLES: Record<JobStatus, string> = {
  [JobStatus.DRAFT]: 'border-slate-300/80 bg-slate-200/50 text-slate-700 dark:border-white/12 dark:bg-white/6 dark:text-white/70',
  [JobStatus.SUBMITTED]: 'border-sky-300/70 bg-sky-100/70 text-sky-800 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-100',
  [JobStatus.PENDING_REVIEW]: 'border-amber-300/80 bg-amber-100/80 text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100',
  [JobStatus.APPROVED]: 'border-indigo-300/70 bg-indigo-100/70 text-indigo-800 dark:border-indigo-300/20 dark:bg-indigo-300/10 dark:text-indigo-100',
  [JobStatus.SCHEDULED]: 'border-cyan-300/70 bg-cyan-100/70 text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100',
  [JobStatus.PRINTING]: 'border-emerald-300/80 bg-emerald-100/80 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100',
  [JobStatus.DONE]: 'border-green-300/80 bg-green-100/75 text-green-800 dark:border-green-300/20 dark:bg-green-300/10 dark:text-green-100',
  [JobStatus.REJECTED]: 'border-rose-300/80 bg-rose-100/80 text-rose-800 dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-100',
  [JobStatus.CANCELLED]: 'border-slate-300/80 bg-slate-100/80 text-slate-500 dark:border-white/10 dark:bg-white/4 dark:text-white/55',
  [JobStatus.NEEDS_REVISION]: 'border-orange-300/80 bg-orange-100/80 text-orange-800 dark:border-orange-300/20 dark:bg-orange-300/10 dark:text-orange-100',
};

export const StatusChip: React.FC<StatusChipProps> = ({ status, className }) => {
  const { lang } = useLang();
  const labels = getUiText(lang).shared.jobStatuses;

  return (
    <span
      className={cn(
        'inline-flex min-h-[28px] items-center border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] whitespace-nowrap',
        STATUS_STYLES[status],
        status === JobStatus.PRINTING && 'shadow-[0_0_0_1px_rgba(16,185,129,0.12)]',
        className
      )}
    >
      {labels[status]}
    </span>
  );
};
