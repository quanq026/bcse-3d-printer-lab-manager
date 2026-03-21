import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Loader2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppIcon } from '../components/AppIcon';
import { useLang } from '../contexts/LanguageContext';
import { MaterialType, type FilamentInventory } from '../types';
import { api } from '../lib/api';
import { fillText, getUiText } from '../lib/uiText';
import { cn } from '../lib/utils';

const AREAS = ['My Dinh', 'Hoa Lac'];
const AREA_LABELS: Record<string, string> = {
  'My Dinh': 'Mỹ Đình',
  'Hoa Lac': 'Hòa Lạc',
};
type InventoryDraft = Omit<FilamentInventory, 'id' | 'status'>;

const MATERIALS: MaterialType[] = [MaterialType.PLA, MaterialType.PETG, MaterialType.TPU, MaterialType.ABS];
const COLOR_PRESET_VALUES = ['White', 'Black', 'Gray', 'Blue', 'Green', 'Red', 'Yellow', 'Orange', 'Purple', 'Pink'] as const;
const COLOR_MAP: Record<string, string> = {
  White: '#FFFFFF',
  Black: '#000000',
  Gray: '#6B7280',
  Blue: '#2563EB',
  Green: '#16A34A',
  Red: '#DC2626',
  Yellow: '#EAB308',
  Orange: '#F97316',
  Purple: '#9333EA',
  Pink: '#EC4899',
};

const emptyNew = (): InventoryDraft => ({
  material: MaterialType.PLA,
  color: '',
  brand: '',
  remainingGrams: 1000,
  threshold: 200,
  location: '',
  area: 'My Dinh',
});

export const AdminInventory: React.FC = () => {
  const { lang } = useLang();
  const text = getUiText(lang);
  const copy = text.adminInventory;
  const shared = text.shared;
  const colors = text.colors;

  const COLOR_PRESETS = COLOR_PRESET_VALUES.map(value => ({
    value,
    label: colors[value.toLowerCase() as keyof typeof colors] || value,
  }));

  const getColorHex = (colorName: string) => COLOR_MAP[colorName] || (colorName.toLowerCase() === 'custom' ? '#808080' : colorName);

  const areaLabel = (area?: string) => AREA_LABELS[area || ''] || area || colors.other;
  const statusLabels: Record<string, string> = {
    'In Stock': copy.inStock,
    Low: copy.lowStock,
    'Out of Stock': copy.outOfStock,
  };

  const [inventory, setInventory] = useState<FilamentInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editGrams, setEditGrams] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState<InventoryDraft>(emptyNew());

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const data = await api.getInventory();
      setInventory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const filtered = useMemo(() => inventory.filter((item) => !search
    || item.color?.toLowerCase().includes(search.toLowerCase())
    || item.material?.toLowerCase().includes(search.toLowerCase())
    || item.brand?.toLowerCase().includes(search.toLowerCase())
    || item.id?.toLowerCase().includes(search.toLowerCase())
  ), [inventory, search]);

  const lowStock = inventory.filter((item) => item.status === 'Low' || item.status === 'Out of Stock').length;
  const totalPLA = inventory.filter((item) => item.material === 'PLA').reduce((sum, item) => sum + (item.remainingGrams || 0), 0);
  const totalPETG = inventory.filter((item) => item.material === 'PETG').reduce((sum, item) => sum + (item.remainingGrams || 0), 0);

  const stats = [
    { label: copy.stats.pla.label, value: `${(totalPLA / 1000).toFixed(1)}kg`, note: copy.stats.pla.note, icon: 'solar:box-bold-duotone', accent: 'text-sky-700 bg-sky-100/80 dark:text-sky-100 dark:bg-sky-300/10' },
    { label: copy.stats.petg.label, value: `${(totalPETG / 1000).toFixed(1)}kg`, note: copy.stats.petg.note, icon: 'solar:layers-bold-duotone', accent: 'text-indigo-700 bg-indigo-100/80 dark:text-indigo-100 dark:bg-indigo-300/10' },
    { label: copy.stats.low.label, value: `${lowStock}`, note: copy.stats.low.note, icon: 'solar:danger-triangle-bold-duotone', accent: 'text-amber-700 bg-amber-100/80 dark:text-amber-100 dark:bg-amber-300/10' },
    { label: copy.stats.tracked.label, value: `${inventory.length}`, note: copy.stats.tracked.note, icon: 'solar:archive-bold-duotone', accent: 'text-[var(--landing-accent)] bg-[rgba(239,125,87,0.12)] dark:text-[#ffd7cc] dark:bg-[rgba(239,125,87,0.12)]' },
  ];

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await api.updateInventory(id, { remainingGrams: Number.parseFloat(editGrams) });
      await fetchInventory();
      setEditId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;
    try {
      await api.deleteInventory(id);
      setInventory((current) => current.filter((item) => item.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleAdd = async () => {
    if (!newItem.color || !newItem.material) return;
    setSaving(true);
    try {
      await api.addInventory(newItem);
      await fetchInventory();
      setShowAdd(false);
      setNewItem(emptyNew());
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const groupedByArea = AREAS.map((area) => ({
    area,
    items: filtered.filter((item) => (item.area || 'My Dinh') === area),
  })).filter((group) => group.items.length > 0 || !search);

  const statusTone = (status: string) => cn(
    'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]',
    status === 'In Stock'
      ? 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200'
      : status === 'Low'
        ? 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200'
        : 'border-red-200 bg-red-100 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200'
  );

  const renderStockMeter = (item: FilamentInventory) => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-[var(--landing-muted)]">
        <span>{fillText(copy.stockRemaining, { count: item.remainingGrams })}</span>
        <span>{fillText(copy.stockThreshold, { count: item.threshold })}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/8">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((item.remainingGrams / 1000) * 100, 100)}%` }}
          className={cn('h-full rounded-full transition-colors', item.remainingGrams < 200 ? 'bg-red-500' : item.remainingGrams < 500 ? 'bg-amber-500' : 'bg-emerald-500')}
        />
      </div>
    </div>
  );

  return (
    <div className="app-admin-squared app-admin-compact space-y-6">
      <section className="app-panel app-hover-box relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="app-eyebrow">{copy.heroEyebrow}</p>
              <h1 className="app-display-sm text-slate-900 dark:text-[var(--landing-text)]">{copy.heroTitle}</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.heroDesc}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={fetchInventory} className="app-secondary-button inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold"><RefreshCw size={16} />{copy.refresh}</button>
              <button onClick={() => setShowAdd((current) => !current)} className="app-primary-button inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold"><Plus size={16} />{showAdd ? copy.closeAdd : copy.add}</button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="app-hover-box app-metric-card rounded-[26px]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="app-metric-card-label">{stat.label}</p>
                    <p className="mt-4 app-metric-card-value">{stat.value}</p>
                  </div>
                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-[18px]', stat.accent)}><AppIcon icon={stat.icon} size={24} /></div>
                </div>
                <p className="app-metric-card-note">{stat.note}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {showAdd && (
        <section className="app-panel app-hover-box rounded-[32px] px-5 py-6 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="app-eyebrow">{copy.newEyebrow}</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{copy.newTitle}</h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.newDesc}</p>
            </div>
            <span className="app-inline-pill rounded-full">{copy.requiredHint}</span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="grid gap-2"><span className="app-overline">{copy.area}</span><select value={newItem.area} onChange={(event) => setNewItem({ ...newItem, area: event.target.value })} className="app-control rounded-[18px]">{AREAS.map((area) => <option key={area} value={area}>{areaLabel(area)}</option>)}</select></label>
                <label className="grid gap-2"><span className="app-overline">{copy.material}</span><select value={newItem.material} onChange={(event) => setNewItem({ ...newItem, material: event.target.value as MaterialType })} className="app-control rounded-[18px]">{MATERIALS.map((material) => <option key={material}>{material}</option>)}</select></label>
            <label className="grid gap-2"><span className="app-overline">{copy.brand}</span><input type="text" value={newItem.brand} onChange={(event) => setNewItem({ ...newItem, brand: event.target.value })} placeholder={copy.brandPlaceholder} className="app-control rounded-[18px]" /></label>
            <label className="grid gap-2"><span className="app-overline">{copy.location}</span><input type="text" value={newItem.location} onChange={(event) => setNewItem({ ...newItem, location: event.target.value })} placeholder={copy.locationPlaceholder} className="app-control rounded-[18px]" /></label>
            <div className="grid gap-3 md:col-span-2">
              <span className="app-overline">{copy.color}</span>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => {
                  const isActive = newItem.color === color.value;
                  return (
                    <button
                      key={color.value}
                      onClick={() => setNewItem({ ...newItem, color: color.value })}
                      title={color.label}
                      className={cn(
                        "group relative flex h-10 w-10 items-center justify-center rounded-full border transition-all",
                        isActive 
                          ? "border-[var(--landing-accent)] ring-2 ring-[var(--landing-accent)] ring-offset-2 dark:ring-offset-slate-900" 
                          : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
                      )}
                    >
                      <span 
                        className="h-7 w-7 rounded-full shadow-inner" 
                        style={{ backgroundColor: COLOR_MAP[color.value] || '#808080' }} 
                      />
                      {isActive && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check size={14} className={color.value === 'White' ? 'text-slate-900' : 'text-white'} />
                        </div>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={() => setNewItem({ ...newItem, color: '' })}
                  className={cn(
                    "flex min-h-[40px] items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-all",
                    !COLOR_PRESET_VALUES.includes(newItem.color as any) && newItem.color !== '' 
                      ? "border-[var(--landing-accent)] bg-[rgba(239,125,87,0.12)] text-[var(--landing-accent)]" 
                      : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
                  )}
                >
                  <Plus size={14} />
                  {copy.customColor}
                </button>
              </div>
              {(!COLOR_PRESET_VALUES.includes(newItem.color as any) || newItem.color === '') && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={newItem.color}
                    onChange={(event) => setNewItem({ ...newItem, color: event.target.value })}
                    placeholder={copy.customColorPlaceholder}
                    className="app-control rounded-[18px]"
                  />
                </div>
              )}
            </div>
            <label className="grid gap-2"><span className="app-overline">{copy.remainingGrams}</span><input type="number" value={newItem.remainingGrams} onChange={(event) => setNewItem({ ...newItem, remainingGrams: Number.parseInt(event.target.value, 10) || 0 })} className="app-control rounded-[18px]" /></label>
            <label className="grid gap-2"><span className="app-overline">{copy.threshold}</span><input type="number" value={newItem.threshold} onChange={(event) => setNewItem({ ...newItem, threshold: Number.parseInt(event.target.value, 10) || 0 })} className="app-control rounded-[18px]" /></label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button onClick={handleAdd} disabled={saving} className="app-primary-button inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}{copy.saveReel}</button>
            <button onClick={() => setShowAdd(false)} className="app-secondary-button inline-flex min-h-[50px] items-center justify-center rounded-[18px] px-5 text-sm font-bold">{copy.collapseForm}</button>
          </div>
        </section>
      )}

      <section className="app-panel app-hover-box overflow-hidden rounded-[32px]">
        <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="app-eyebrow">{copy.boardEyebrow}</p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{copy.boardTitle}</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.boardDesc}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="app-inline-pill rounded-full">{fillText(copy.visibleCount, { count: filtered.length })}</span>
            <span className="app-inline-pill rounded-full">{fillText(copy.reviewCount, { count: lowStock })}</span>
          </div>
        </div>

        <div className="app-toolbar-shell grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <label className="relative block max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} className="app-control app-search-input rounded-[18px] pr-4" />
          </label>
          <div className="flex flex-wrap gap-2">
            <span className="app-inline-pill rounded-full">PLA {(totalPLA / 1000).toFixed(1)}kg</span>
            <span className="app-inline-pill rounded-full">PETG {(totalPETG / 1000).toFixed(1)}kg</span>
          </div>
        </div>

        {loading ? (
          <div className="app-empty-state"><Loader2 size={28} className="animate-spin" /><p className="text-sm font-semibold">{copy.loading}</p></div>
        ) : (
          <div className="space-y-4 p-4 sm:p-5">
            {groupedByArea.map(({ area, items }) => {
              const areaLowStock = items.filter((item) => item.status === 'Low' || item.status === 'Out of Stock').length;
              return (
                <section key={area} className="app-panel-soft app-hover-box overflow-hidden rounded-[28px]">
                  <div className="flex flex-col gap-4 border-b border-[rgba(30,23,19,0.08)] px-5 py-5 dark:border-white/8 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200"><MapPin size={18} /></div>
                        <div>
                          <p className="app-overline">{copy.areaEyebrow}</p>
                          <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-[var(--landing-text)]">{areaLabel(area)}</h3>
                        </div>
                      </div>
                      <p className="text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{fillText(copy.areaNote, { count: items.length })}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="app-inline-pill rounded-full">{fillText(copy.areaCount, { count: items.length })}</span>
                      <span className="app-inline-pill rounded-full">{fillText(copy.lowCount, { count: areaLowStock })}</span>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="app-empty-state min-h-[180px]"><Package size={38} strokeWidth={1.4} /><p className="text-sm font-semibold">{copy.emptyArea}</p></div>
                  ) : (
                    <>
                      <div className="grid gap-3 p-4 md:hidden">
                        {items.map((item) => (
                          <article key={item.id} className="app-panel app-hover-box rounded-[24px] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="app-overline">#{item.id}</p>
                                <p className="mt-2 inline-flex items-center gap-2 text-lg font-black text-slate-900 dark:text-[var(--landing-text)]">
                                  <span className="h-4 w-4 shrink-0 rounded-sm border border-black/10 dark:border-white/20" style={{ backgroundColor: getColorHex(item.color) }} />
                                  {item.material} / {item.color}
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-[var(--landing-muted)]">{item.brand || copy.noBrand} / {item.location || copy.noShelf}</p>
                              </div>
                              <span className={statusTone(item.status)}>{statusLabels[item.status] || item.status}</span>
                            </div>
                            <div className="mt-4">{renderStockMeter(item)}</div>
                            <div className="mt-4 grid gap-3">
                              {editId === item.id ? (
                                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                                  <input type="number" value={editGrams} onChange={(event) => setEditGrams(event.target.value)} className="app-control rounded-[16px]" autoFocus />
                                  <button onClick={() => saveEdit(item.id)} disabled={saving} className="app-primary-button inline-flex min-h-[44px] items-center justify-center rounded-[16px] px-4 text-sm font-bold disabled:opacity-60">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
                                  <button onClick={() => setEditId(null)} className="app-secondary-button inline-flex min-h-[44px] items-center justify-center rounded-[16px] px-4 text-sm font-bold"><X size={14} /></button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  <button onClick={() => { setEditId(item.id); setEditGrams(item.remainingGrams.toString()); }} className="app-secondary-button inline-flex min-h-[42px] items-center justify-center rounded-[16px] px-4 text-xs font-bold uppercase tracking-[0.16em]">{copy.updateStock}</button>
                                  <button onClick={() => handleDelete(item.id)} className="inline-flex min-h-[42px] items-center justify-center rounded-[16px] border border-red-200 bg-red-100 px-4 text-xs font-bold uppercase tracking-[0.16em] text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">{copy.deleteReel}</button>
                                </div>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className="hidden overflow-x-auto md:block">
                        <table className="app-table min-w-full text-left">
                          <thead>
                            <tr>
                              <th>{copy.reelId}</th>
                              <th>{copy.material}</th>
                              <th>{copy.brand}</th>
                              <th>{copy.color}</th>
                              <th>{copy.boardEyebrow.replace('// ', '')}</th>
                              <th>{copy.location}</th>
                              <th>{shared.statusLabel}</th>
                              <th className="text-right">{copy.actions}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr key={item.id}>
                                <td className="px-6 py-5 text-xs font-black text-slate-900 dark:text-[var(--landing-text)]">{item.id}</td>
                                <td className="px-6 py-5 text-xs font-semibold text-slate-700 dark:text-white/80">{item.material}</td>
                                <td className="px-6 py-5 text-xs text-slate-500 dark:text-[var(--landing-muted)]">{item.brand || copy.noBrand}</td>
                                <td className="px-6 py-5 text-xs text-slate-500 dark:text-[var(--landing-muted)]">
                                  <div className="flex items-center gap-2">
                                    <span className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10 dark:border-white/20" style={{ backgroundColor: getColorHex(item.color) }} />
                                    {item.color}
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  {editId === item.id ? (
                                    <div className="grid gap-2 lg:grid-cols-[120px_auto_auto]">
                                      <input type="number" value={editGrams} onChange={(event) => setEditGrams(event.target.value)} className="app-control rounded-[14px]" autoFocus />
                                      <button onClick={() => saveEdit(item.id)} disabled={saving} className="app-primary-button inline-flex min-h-[40px] items-center justify-center rounded-[14px] px-4 text-sm font-bold disabled:opacity-60">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}</button>
                                      <button onClick={() => setEditId(null)} className="app-secondary-button inline-flex min-h-[40px] items-center justify-center rounded-[14px] px-4 text-sm font-bold"><X size={14} /></button>
                                    </div>
                                  ) : renderStockMeter(item)}
                                </td>
                                <td className="px-6 py-5 text-xs text-slate-500 dark:text-[var(--landing-muted)]">{item.location || copy.noShelf}</td>
                                <td className="px-6 py-5"><span className={statusTone(item.status)}>{statusLabels[item.status] || item.status}</span></td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => { setEditId(item.id); setEditGrams(item.remainingGrams.toString()); }} className="app-secondary-button inline-flex h-10 items-center justify-center rounded-[14px] px-4 text-xs font-bold uppercase tracking-[0.16em]">{copy.updateStock}</button>
                                    <button onClick={() => handleDelete(item.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-red-200 bg-red-100 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200"><Trash2 size={14} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>

      <section className="app-panel-soft app-hover-box rounded-[28px] border border-amber-200/70 px-5 py-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 sm:px-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em]">{copy.disciplineEyebrow}</p>
            <p className="mt-1">{copy.disciplineNote}</p>
          </div>
        </div>
      </section>
    </div>
  );
};
