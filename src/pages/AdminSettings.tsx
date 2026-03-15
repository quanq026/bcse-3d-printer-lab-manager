import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { AppIcon } from '../components/AppIcon';
import { useLang } from '../contexts/LanguageContext';
import { api } from '../lib/api';
import { getUiText } from '../lib/uiText';

function SettingField({ label, hint, icon, children }: { label: string; hint: string; icon: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-3 rounded-[24px] border border-[rgba(30,23,19,0.08)] bg-white/55 p-4 dark:border-white/8 dark:bg-white/4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
          <AppIcon icon={icon} size={18} />
        </div>
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-[var(--landing-text)]">{label}</p>
          <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-[var(--landing-muted)]">{hint}</p>
        </div>
      </div>
      {children}
    </label>
  );
}

export const AdminSettings: React.FC = () => {
  const { lang } = useLang();
  const text = getUiText(lang);
  const copy = text.adminSettings;
  const shared = text.shared;
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSettingsAdmin().then(setSettings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const setValue = (key: string, value: string) => setSettings((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSuccess(copy.success);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : shared.unknownError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="app-panel rounded-[30px]">
        <div className="app-empty-state">
          <AppIcon icon="solar:settings-bold-duotone" size={28} className="animate-pulse" />
          <p className="text-sm font-semibold">{copy.loading}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="app-admin-squared app-admin-compact space-y-6">
      <section className="app-panel app-hover-box relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="space-y-3">
            <p className="app-eyebrow">{copy.heroEyebrow}</p>
            <h1 className="app-display-sm text-slate-900 dark:text-[var(--landing-text)]">{copy.heroTitle}</h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.heroDesc}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.values(copy.stats).map((stat) => (
              <div key={stat.label} className="app-hover-box app-metric-card rounded-[26px]">
                <p className="app-metric-card-label">{stat.label}</p>
                <p className="mt-4 app-metric-card-value text-[clamp(1.7rem,2.6vw,2.3rem)]">{stat.value}</p>
                <p className="app-metric-card-note">{stat.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <section className="app-panel-soft rounded-[24px] border border-red-200/70 px-5 py-4 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
          <div className="flex items-start gap-3"><AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error}</span></div>
        </section>
      )}
      {success && (
        <section className="app-panel-soft rounded-[24px] border border-emerald-200/70 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
          <div className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /> <span>{success}</span></div>
        </section>
      )}

      <section className="app-panel app-hover-box rounded-[32px] px-5 py-6 sm:px-6">
        <div className="space-y-2">
          <p className="app-eyebrow">{copy.directoryEyebrow}</p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{copy.directoryTitle}</h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.directoryDesc}</p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SettingField label={copy.supportEmail} hint={copy.supportEmailHint} icon="solar:letter-bold-duotone">
            <input type="email" value={settings.contact_email || ''} onChange={(event) => setValue('contact_email', event.target.value)} placeholder="lab@vju.ac.vn" className="app-control rounded-[18px]" />
          </SettingField>
          <SettingField label={copy.facebookPage} hint={copy.facebookPageHint} icon="solar:chat-square-like-bold-duotone">
            <input type="url" value={settings.contact_facebook || ''} onChange={(event) => setValue('contact_facebook', event.target.value)} placeholder="https://facebook.com/..." className="app-control rounded-[18px]" />
          </SettingField>
          <SettingField label={copy.zaloNumber} hint={copy.zaloNumberHint} icon="solar:chat-round-dots-bold-duotone">
            <input type="text" value={settings.contact_zalo || ''} onChange={(event) => setValue('contact_zalo', event.target.value)} placeholder="09xxxxxxxx" className="app-control rounded-[18px]" />
          </SettingField>
          <SettingField label={copy.guideUrl} hint={copy.guideUrlHint} icon="solar:notebook-bookmark-bold-duotone">
            <input type="url" value={settings.guide_url || ''} onChange={(event) => setValue('guide_url', event.target.value)} placeholder="https://docs.google.com/..." className="app-control rounded-[18px]" />
          </SettingField>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={handleSave} disabled={saving} className="app-primary-button inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold disabled:opacity-60">
            <Save size={16} />
            {saving ? copy.saving : shared.save}
          </button>
        </div>
      </section>
    </div>
  );
};
