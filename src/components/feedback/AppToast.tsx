import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import type { ToastState } from './useToast';
import { cn } from '../../lib/utils';

interface AppToastProps {
  toast: ToastState | null;
  onClose: () => void;
  durationMs?: number;
}

export const AppToast: React.FC<AppToastProps> = ({ toast, onClose, durationMs = 3200 }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, onClose, toast]);

  if (!toast) return null;

  const isSuccess = toast.tone === 'success';

  return (
    <div className="fixed right-4 top-4 z-50 w-[min(92vw,420px)]">
      <div
        className={cn(
          'rounded-[24px] border px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur',
          isSuccess
            ? 'border-emerald-200 bg-white/95 text-emerald-700 dark:border-emerald-400/20 dark:bg-slate-950/95 dark:text-emerald-200'
            : 'border-rose-200 bg-white/95 text-rose-700 dark:border-rose-400/20 dark:bg-slate-950/95 dark:text-rose-200'
        )}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px]',
              isSuccess ? 'bg-emerald-100 dark:bg-emerald-400/10' : 'bg-rose-100 dark:bg-rose-400/10'
            )}
          >
            {isSuccess ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[12px] text-current/70 transition-colors hover:bg-black/5 hover:text-current dark:hover:bg-white/6"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
