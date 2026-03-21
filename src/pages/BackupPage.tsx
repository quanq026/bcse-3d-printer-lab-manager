import React, { useEffect, useMemo, useState } from 'react';
import { Download, HardDrive, Loader2, Plus, RefreshCw } from 'lucide-react';
import { AppIcon } from '../components/AppIcon';
import { AppToast } from '../components/feedback/AppToast';
import { useToast } from '../components/feedback/useToast';
import { useLang } from '../contexts/LanguageContext';
import { api } from '../lib/api';
import { fillText, getUiText } from '../lib/uiText';
import type { BackupInfo } from '../types';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(value: string | Date, locale = 'vi-VN') {
  return new Date(value).toLocaleString(locale);
}

export const BackupPage: React.FC = () => {
  const { lang } = useLang();
  const copy = getUiText(lang).adminBackup;
  const locale = lang === 'JP' ? 'en-US' : 'vi-VN';
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { toast, dismissToast, showError, showSuccess } = useToast();

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const data = await api.listBackups();
      setBackups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await api.createBackup();
      showSuccess(fillText(copy.createdAlert, { file: result.file }));
      fetchBackups();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  };

  const totalSize = useMemo(() => backups.reduce((sum, backup) => sum + (backup.size || 0), 0), [backups]);
  const latestBackup = backups[0];

  return (
    <div className="app-admin-squared app-admin-compact space-y-6">
      <AppToast toast={toast} onClose={dismissToast} />
      <section className="app-panel app-hover-box relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="app-eyebrow">{copy.heroEyebrow}</p>
              <h1 className="app-display-sm text-slate-900 dark:text-[var(--landing-text)]">{copy.heroTitle}</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.heroDesc}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={fetchBackups} className="app-secondary-button inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold">
                <RefreshCw size={16} />
                {copy.refresh}
              </button>
              <button onClick={handleCreate} disabled={creating} className="app-primary-button inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold disabled:opacity-60">
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {copy.create}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="app-hover-box app-metric-card rounded-[26px]">
              <p className="app-metric-card-label">{copy.stats.files.label}</p>
              <p className="mt-4 app-metric-card-value text-[clamp(1.7rem,2.6vw,2.3rem)]">{backups.length}</p>
              <p className="app-metric-card-note">{copy.stats.files.note}</p>
            </div>
            <div className="app-hover-box app-metric-card rounded-[26px]">
              <p className="app-metric-card-label">{copy.stats.weight.label}</p>
              <p className="mt-4 app-metric-card-value text-[clamp(1.7rem,2.6vw,2.3rem)]">{formatSize(totalSize)}</p>
              <p className="app-metric-card-note">{copy.stats.weight.note}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="app-panel app-hover-box overflow-hidden rounded-[32px]">
        <div className="flex flex-col gap-4 border-b border-[rgba(30,23,19,0.08)] px-5 py-5 dark:border-white/8 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="app-eyebrow">{copy.archiveEyebrow}</p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{copy.archiveTitle}</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{latestBackup ? fillText(copy.latestPrefix, { date: formatDate(latestBackup.createdAt, locale) }) : copy.noBackupsYet}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="app-inline-pill rounded-full">{fillText(copy.filesCount, { count: backups.length })}</span>
            <span className="app-inline-pill rounded-full">{fillText(copy.latestSize, { size: latestBackup ? formatSize(latestBackup.size) : '0 B' })}</span>
          </div>
        </div>

        {loading ? (
          <div className="app-empty-state">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm font-semibold">{copy.loading}</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="app-empty-state">
            <HardDrive size={42} strokeWidth={1.4} />
            <p className="text-sm font-semibold">{copy.empty}</p>
            <p className="max-w-md text-xs leading-6">{copy.emptyNote}</p>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:p-5">
            {backups.map((backup, index) => (
              <article key={index} className="app-panel-soft app-hover-box rounded-[26px] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
                      <AppIcon icon="solar:database-bold-duotone" size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-black text-slate-900 dark:text-[var(--landing-text)] break-all">{backup.name}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="app-inline-pill rounded-full">{formatDate(backup.createdAt, locale)}</span>
                        <span className="app-inline-pill rounded-full">{formatSize(backup.size)}</span>
                      </div>
                    </div>
                  </div>
                  <a href={api.downloadBackup(backup.name)} download={backup.name} className="app-secondary-button inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold">
                    <Download size={16} />
                    {copy.download}
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="app-panel-soft rounded-[28px] border border-amber-200/70 px-5 py-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 sm:px-6">
        <div className="flex items-start gap-3">
          <AppIcon icon="solar:shield-warning-bold-duotone" size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em]">{copy.retentionEyebrow}</p>
            <p className="mt-1">{copy.retentionNote}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
