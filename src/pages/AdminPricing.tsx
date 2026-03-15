import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Info,
  Loader2,
  Save,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { AppIcon } from '../components/AppIcon';
import { useLang } from '../contexts/LanguageContext';
import { api } from '../lib/api';
import { getUiText } from '../lib/uiText';
import { cn } from '../lib/utils';
import type { PricingRule, ServiceFee } from '../types';

export const AdminPricing: React.FC = () => {
  const { lang } = useLang();
  const copy = getUiText(lang).adminPricing;
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [fees, setFees] = useState<ServiceFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [calcGrams, setCalcGrams] = useState(100);

  useEffect(() => {
    Promise.all([api.getPricing(), api.getServiceFees()])
      .then(([rulesData, feesData]) => {
        setRules(rulesData);
        setFees(feesData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updatePrice = (material: string, value: number) => {
    setRules(rules.map((rule) => (rule.material === material ? { ...rule, pricePerGram: value } : rule)));
    setSaved(false);
  };

  const updateFee = (name: string, value: number) => {
    setFees(fees.map((fee) => (fee.name === name ? { ...fee, amount: value } : fee)));
    setSaved(false);
  };

  const toggleFeeEnabled = (name: string) => {
    setFees(fees.map((fee) => (fee.name === name ? { ...fee, enabled: !fee.enabled } : fee)));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.updatePricing(rules),
        api.updateServiceFees(fees.map((fee) => ({ name: fee.name, amount: fee.amount, enabled: fee.enabled !== false }))),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const calcCost = useMemo(() => {
    const pla = rules.find((rule) => rule.material === 'PLA')?.pricePerGram || 0;
    return (calcGrams * pla).toLocaleString();
  }, [calcGrams, rules]);

  const activeFees = fees.filter((fee) => fee.enabled !== false).length;
  const plaBaseline = rules.find((rule) => rule.material === 'PLA')?.pricePerGram || 0;

  const heroStats = [
    {
      label: copy.stats.pla.label,
      value: `${plaBaseline.toLocaleString()} / g`,
      note: copy.stats.pla.note,
      icon: 'solar:tag-price-bold-duotone',
      accent: 'text-sky-700 bg-sky-100/80 dark:text-sky-100 dark:bg-sky-300/10',
    },
    {
      label: copy.stats.fees.label,
      value: `${activeFees}`,
      note: copy.stats.fees.note,
      icon: 'solar:bill-list-bold-duotone',
      accent: 'text-[var(--landing-accent)] bg-[rgba(239,125,87,0.12)] dark:text-[#ffd7cc] dark:bg-[rgba(239,125,87,0.12)]',
    },
  ];

  const feeLabel = (fee: ServiceFee) => copy.feeLabels[fee.name as keyof typeof copy.feeLabels] || fee.label || fee.name;
  const feeDescription = (fee: ServiceFee) => copy.feeDescriptions[fee.name as keyof typeof copy.feeDescriptions] || fee.description || '';

  return (
    <div className="app-admin-squared app-admin-compact space-y-6">
      <section className="app-panel app-hover-box relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="app-eyebrow">{copy.heroEyebrow}</p>
              <h1 className="app-display-sm text-slate-900 dark:text-[var(--landing-text)]">{copy.heroTitle}</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.heroDesc}</p>
            </div>
            <button onClick={handleSave} disabled={saving || loading} className="app-primary-button inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saved ? copy.saved : copy.save}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {heroStats.map((stat) => (
              <div key={stat.label} className="app-hover-box app-metric-card rounded-[26px]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="app-metric-card-label">{stat.label}</p>
                    <p className="mt-4 app-metric-card-value text-[clamp(1.7rem,2.6vw,2.3rem)]">{stat.value}</p>
                  </div>
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-[18px]', stat.accent)}>
                    <AppIcon icon={stat.icon} size={24} />
                  </div>
                </div>
                <p className="app-metric-card-note">{stat.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="app-panel app-hover-box overflow-hidden rounded-[32px]">
          <div className="flex flex-col gap-3 border-b border-[rgba(30,23,19,0.08)] px-5 py-5 dark:border-white/8 sm:px-6">
            <p className="app-eyebrow">{copy.materialEyebrow}</p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{copy.materialTitle}</h2>
            <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.materialDesc}</p>
          </div>

          {loading ? (
            <div className="app-empty-state">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm font-semibold">{copy.loadingMaterials}</p>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:p-5">
              {rules.map((rule) => (
                <div key={rule.material} className="app-panel-soft app-hover-box rounded-[24px] p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
                        <AppIcon icon="solar:box-bold-duotone" size={22} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-900 dark:text-[var(--landing-text)]">{rule.material}</p>
                        <p className="text-xs text-slate-500 dark:text-[var(--landing-muted)]">{copy.futureRequests}</p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[120px_auto] sm:items-center">
                      <input type="number" value={rule.pricePerGram} onChange={(event) => updatePrice(rule.material, Number.parseInt(event.target.value, 10) || 0)} className="app-control rounded-[16px] text-right text-sm font-bold" />
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-[var(--landing-muted)]">{copy.vndPerGram}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="app-panel app-hover-box overflow-hidden rounded-[32px]">
          <div className="flex flex-col gap-3 border-b border-[rgba(30,23,19,0.08)] px-5 py-5 dark:border-white/8 sm:px-6">
            <p className="app-eyebrow">{copy.serviceEyebrow}</p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{copy.serviceTitle}</h2>
            <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.serviceDesc}</p>
          </div>

          {loading ? (
            <div className="app-empty-state">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-sm font-semibold">{copy.loadingFees}</p>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:p-5">
              {fees.map((fee) => (
                <div key={fee.name} className={cn('app-panel-soft app-hover-box rounded-[24px] p-4', fee.enabled === false && 'opacity-70')}>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-black text-slate-900 dark:text-[var(--landing-text)]">{feeLabel(fee)}</p>
                          {fee.name === 'service_fee' && <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200">{copy.perGram}</span>}
                          {fee.name === 'rush_fee' && <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]', fee.enabled !== false ? 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200' : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/6 dark:text-slate-200')}>{fee.enabled !== false ? copy.enabled : copy.disabled}</span>}
                        </div>
                        <p className="text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{feeDescription(fee)}</p>
                      </div>
                      {fee.name === 'rush_fee' && (
                        <button onClick={() => toggleFeeEnabled(fee.name)} className={cn('inline-flex items-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-bold transition-all', fee.enabled !== false ? 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200' : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/6 dark:text-slate-200')}>
                          {fee.enabled !== false ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          {fee.enabled !== false ? copy.active : copy.inactive}
                        </button>
                      )}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-[140px_auto] sm:items-center">
                      <input type="number" value={fee.amount} onChange={(event) => updateFee(fee.name, Number.parseInt(event.target.value, 10) || 0)} disabled={fee.enabled === false && fee.name === 'rush_fee'} className="app-control rounded-[16px] text-right text-sm font-bold disabled:opacity-50" />
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-[var(--landing-muted)]">{fee.name === 'service_fee' ? copy.vndPerGram : copy.flatFee}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="app-panel-soft rounded-[28px] border border-sky-200/70 px-5 py-4 text-sm text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200 sm:px-6">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em]">{copy.policyEyebrow}</p>
            <p className="mt-1">{copy.policyNote}</p>
          </div>
        </div>
      </section>

      <section className="app-sidebar app-hover-box relative overflow-hidden rounded-[32px] px-5 py-6 text-[var(--landing-text)] sm:px-6 sm:py-7">
        <div className="absolute right-0 top-0 h-44 w-44 translate-x-1/4 -translate-y-1/4 rounded-full bg-[rgba(239,125,87,0.22)] blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] xl:items-end">
          <div className="space-y-3">
            <p className="app-eyebrow text-[var(--landing-amber)]">{copy.estimatorEyebrow}</p>
            <h2 className="text-2xl font-black">{copy.estimatorTitle}</h2>
            <p className="max-w-xl text-sm leading-7 text-[var(--landing-muted)]">{copy.estimatorDesc}</p>
          </div>

          <div className="grid gap-4 rounded-[26px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
            <label className="grid gap-2">
              <span className="app-overline text-[var(--landing-muted)]">{copy.estimatorInput}</span>
              <input type="number" value={calcGrams} onChange={(event) => setCalcGrams(Number.parseInt(event.target.value, 10) || 0)} className="app-control rounded-[18px] bg-white/8 text-[var(--landing-text)]" />
            </label>
            <div className="flex h-12 items-center justify-center text-[var(--landing-muted)]">
              <ArrowRight size={20} />
            </div>
            <div className="rounded-[20px] border border-[rgba(239,125,87,0.28)] bg-[rgba(239,125,87,0.14)] px-4 py-4 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--landing-muted)]">{copy.estimatorTotal}</p>
              <p className="mt-3 text-3xl font-black text-[var(--landing-amber)]">{calcCost} VND</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
