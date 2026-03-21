import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-[min(92vw,520px)] rounded-[30px] border border-[rgba(30,23,19,0.08)] bg-white px-5 py-5 shadow-[0_26px_70px_rgba(15,23,42,0.24)] dark:border-white/8 dark:bg-[rgb(15,23,42)] sm:px-6 sm:py-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
            <AlertTriangle size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-slate-900 dark:text-[var(--landing-text)]">{title}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{body}</p>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/6 dark:hover:text-white"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="app-secondary-button inline-flex min-h-[46px] items-center justify-center rounded-[18px] px-5 text-sm font-bold"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={
                  destructive
                    ? 'inline-flex min-h-[46px] items-center justify-center rounded-[18px] border border-rose-200 bg-rose-100/80 px-5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200'
                    : 'app-primary-button inline-flex min-h-[46px] items-center justify-center rounded-[18px] px-5 text-sm font-bold'
                }
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
