import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AppIcon } from '../components/AppIcon';
import { AppToast } from '../components/feedback/AppToast';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { useToast } from '../components/feedback/useToast';
import { useLang } from '../contexts/LanguageContext';
import { api } from '../lib/api';
import { fillText, getUiText } from '../lib/uiText';
import { cn } from '../lib/utils';
import { MaterialType, type Printer as PrinterRecord } from '../types';

type PrinterFormData = {
  name: string;
  buildVolume: string;
  supportedMaterials: MaterialType[];
  status: PrinterRecord['status'];
  location: string;
  imageUrl: string;
  hasAMS: boolean;
};

const MATERIAL_OPTIONS: MaterialType[] = [MaterialType.PLA, MaterialType.PETG, MaterialType.TPU, MaterialType.ABS];
const STATUS_OPTIONS: PrinterRecord['status'][] = ['Available', 'Busy', 'Maintenance'];
const CAMPUS_OPTIONS = ['My Dinh', 'Hoa Lac'];
const CAMPUS_LABELS: Record<string, string> = {
  'My Dinh': 'Mỹ Đình',
  'Hoa Lac': 'Hòa Lạc',
};

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Available: 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200',
    Busy: 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200',
    Maintenance: 'border-red-200 bg-red-100 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200',
  };
  return map[status] || 'border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/6 dark:text-slate-200';
};

const defaultForm: PrinterFormData = {
  name: '',
  buildVolume: '',
  supportedMaterials: [MaterialType.PLA],
  status: 'Available',
  location: 'My Dinh',
  imageUrl: '',
  hasAMS: false,
};

const campusLabel = (location?: string) => CAMPUS_LABELS[location || ''] || location || 'Khác';

export const AdminPrinters: React.FC = () => {
  const { lang } = useLang();
  const copy = getUiText(lang).adminPrinters;
  const statusLabels: Record<string, string> = {
    Available: copy.statusAvailable,
    Busy: copy.statusBusy,
    Maintenance: copy.statusMaintenance,
  };

  const [printers, setPrinters] = useState<PrinterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast, dismissToast, showError, showSuccess } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchPrinters = async () => {
    setLoading(true);
    try {
      const data = await api.getPrinters();
      setPrinters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...defaultForm });
    setShowModal(true);
  };

  const openEdit = (printer: PrinterRecord) => {
    setEditId(printer.id);
    setForm({
      name: printer.name,
      buildVolume: printer.buildVolume,
      supportedMaterials: printer.supportedMaterials || ['PLA'],
      status: printer.status,
      location: printer.location || 'My Dinh',
      imageUrl: printer.imageUrl || '',
      hasAMS: !!printer.hasAMS,
    });
    setShowModal(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const result = await api.uploadPrinterImage(file);
      setForm((current) => ({ ...current, imageUrl: result.url }));
      showSuccess(copy.uploadImage);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setImageUploading(false);
    }
  };

  const toggleMaterial = (material: MaterialType) => {
    setForm((current) => ({
      ...current,
      supportedMaterials: current.supportedMaterials.includes(material)
        ? current.supportedMaterials.filter((value) => value !== material)
        : [...current.supportedMaterials, material],
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.buildVolume) {
      showError(copy.validationName);
      return;
    }
    if (form.supportedMaterials.length === 0) {
      showError(copy.validationMaterial);
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await api.updatePrinter(editId, form);
      } else {
        await api.createPrinter(form);
      }
      await fetchPrinters();
      setShowModal(false);
      showSuccess(editId ? copy.saveEdit : copy.saveAdd);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeletingId(id);
    try {
      await api.deletePrinter(id);
      setDeleteTarget(null);
      await fetchPrinters();
      showSuccess('Printer removed successfully.');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: string, status: PrinterRecord['status']) => {
    try {
      await api.updatePrinter(id, { status });
      await fetchPrinters();
      showSuccess(statusLabels[status] || status);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const locations = [...new Set(printers.map((printer) => printer.location || 'Khác'))].sort();
  const byLocation = (location: string) => printers.filter((printer) => (printer.location || 'Khác') === location);
  const availableCount = printers.filter((printer) => printer.status === 'Available').length;
  const busyCount = printers.filter((printer) => printer.status === 'Busy').length;
  const amsCount = printers.filter((printer) => printer.hasAMS).length;

  const heroStats = [
    { label: copy.stats.fleet.label, value: `${printers.length}`, note: copy.stats.fleet.note, icon: 'solar:printer-2-bold-duotone', accent: 'text-sky-700 bg-sky-100/80 dark:text-sky-100 dark:bg-sky-300/10' },
    { label: copy.stats.available.label, value: `${availableCount}`, note: copy.stats.available.note, icon: 'solar:check-circle-bold-duotone', accent: 'text-emerald-700 bg-emerald-100/80 dark:text-emerald-100 dark:bg-emerald-300/10' },
    { label: copy.stats.ams.label, value: `${amsCount}`, note: copy.stats.ams.note, icon: 'solar:palette-round-bold-duotone', accent: 'text-violet-700 bg-violet-100/80 dark:text-violet-100 dark:bg-violet-300/10' },
    { label: copy.stats.busy.label, value: `${busyCount}`, note: copy.stats.busy.note, icon: 'solar:clock-circle-bold-duotone', accent: 'text-[var(--landing-accent)] bg-[rgba(239,125,87,0.12)] dark:text-[#ffd7cc] dark:bg-[rgba(239,125,87,0.12)]' },
  ];

  return (
    <div className="app-admin-squared app-admin-compact space-y-6">
      <AppToast toast={toast} onClose={dismissToast} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete printer"
        body={deleteTarget ? fillText(copy.deleteConfirm, { name: deleteTarget.name }) : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => { void confirmDelete(); }}
        onCancel={() => setDeleteTarget(null)}
      />
      <section className="app-panel app-hover-box relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="app-eyebrow">{copy.heroEyebrow}</p>
              <h1 className="app-display-sm text-slate-900 dark:text-[var(--landing-text)]">{copy.heroTitle}</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.heroDesc}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={fetchPrinters} className="app-secondary-button inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold">
                <RefreshCw size={16} />
                {copy.refresh}
              </button>
              <button onClick={openAdd} className="app-primary-button inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold">
                <Plus size={16} />
                {copy.add}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {heroStats.map((stat) => (
              <div key={stat.label} className="app-hover-box app-metric-card rounded-[26px]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="app-metric-card-label">{stat.label}</p>
                    <p className="mt-4 app-metric-card-value">{stat.value}</p>
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

      {loading ? (
        <section className="app-panel rounded-[30px]">
          <div className="app-empty-state">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm font-semibold">{copy.loading}</p>
          </div>
        </section>
      ) : printers.length === 0 ? (
        <section className="app-panel rounded-[30px]">
          <div className="app-empty-state">
            <Printer size={42} strokeWidth={1.4} />
            <p className="text-sm font-semibold">{copy.empty}</p>
            <button onClick={openAdd} className="app-primary-button inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-bold">
              <Plus size={16} />
              {copy.createFirst}
            </button>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          {locations.map((location) => (
            <section key={location} className="app-panel app-hover-box overflow-hidden rounded-[32px]">
              <div className="flex flex-col gap-4 border-b border-[rgba(30,23,19,0.08)] px-5 py-5 dark:border-white/8 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200"><MapPin size={18} /></div>
                    <div>
                      <p className="app-overline">{copy.campusLabel}</p>
                      <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{campusLabel(location)}</h2>
                    </div>
                  </div>
                  <p className="text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{fillText(copy.campusNote, { count: byLocation(location).length })}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="app-inline-pill rounded-full">{fillText(copy.campusTotal, { count: byLocation(location).length })}</span>
                  <span className="app-inline-pill rounded-full">{fillText(copy.campusAvailable, { count: byLocation(location).filter((printer) => printer.status === 'Available').length })}</span>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                {byLocation(location).map((printer) => (
                  <article key={printer.id} className="app-panel-soft app-hover-box overflow-hidden rounded-[28px]">
                    <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1.2fr)_minmax(260px,0.9fr)]">
                      <div className="relative flex min-h-[200px] items-center justify-center border-b border-[rgba(30,23,19,0.08)] bg-[linear-gradient(180deg,rgba(239,125,87,0.08),transparent)] p-5 dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(239,125,87,0.08),rgba(143,209,232,0.04))] lg:min-h-full lg:border-b-0 lg:border-r">
                        {printer.imageUrl ? <img src={printer.imageUrl} alt={printer.name} className="h-full w-full object-contain" onError={(event) => { (event.target as HTMLImageElement).style.display = 'none'; }} /> : <Printer size={58} className="text-slate-300 dark:text-white/20" strokeWidth={1.4} />}
                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]', statusBadge(printer.status))}>{statusLabels[printer.status] || printer.status}</span>
                          {printer.hasAMS && <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200">AMS</span>}
                        </div>
                      </div>

                      <div className="grid gap-5 border-t border-[rgba(30,23,19,0.08)] p-5 dark:border-white/8 lg:border-t-0 lg:border-r">
                        <div>
                          <p className="app-overline">{copy.profile}</p>
                          <h3 className="mt-2 text-xl font-black leading-tight text-slate-900 dark:text-[var(--landing-text)]">{printer.name}</h3>
                          <p className="mt-2 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{copy.buildVolume} {printer.buildVolume}</p>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
                          <div className="rounded-[20px] border border-[rgba(30,23,19,0.08)] bg-white/55 p-4 dark:border-white/8 dark:bg-white/4">
                            <p className="app-overline">{copy.supportedMaterials}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {printer.supportedMaterials?.map((material: string) => <span key={material} className="inline-flex items-center rounded-full border border-[rgba(30,23,19,0.08)] bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-700 dark:border-white/8 dark:bg-white/6 dark:text-white/80">{material}</span>)}
                            </div>
                          </div>
                          <div className="rounded-[20px] border border-[rgba(30,23,19,0.08)] bg-white/55 p-4 dark:border-white/8 dark:bg-white/4">
                            <p className="app-overline">{copy.campusField}</p>
                            <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{campusLabel(printer.location)}</p>
                            <p className="mt-2 text-xs text-slate-500 dark:text-[var(--landing-muted)]">{copy.campusFieldNote}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 p-5">
                        <div className="rounded-[20px] border border-[rgba(30,23,19,0.08)] bg-white/55 p-4 dark:border-white/8 dark:bg-white/4">
                          <p className="app-overline">{copy.statusField}</p>
                          <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{statusLabels[printer.status] || printer.status}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]', statusBadge(printer.status))}>{statusLabels[printer.status] || printer.status}</span>
                            {printer.hasAMS && <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200">AMS</span>}
                          </div>
                        </div>

                        <div className="grid gap-3">
                          <select value={printer.status} onChange={(event) => handleStatusChange(printer.id, event.target.value as PrinterRecord['status'])} className={cn('app-control rounded-[18px] text-sm font-bold', statusBadge(printer.status))}>
                            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{statusLabels[status] || status}</option>)}
                          </select>
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_48px]">
                            <button onClick={() => openEdit(printer)} className="app-secondary-button inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-bold"><Pencil size={15} />{copy.edit}</button>
                            <button onClick={() => handleDelete(printer.id, printer.name)} disabled={deletingId === printer.id} className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-red-200 bg-red-100 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200 disabled:opacity-60">
                              {deletingId === printer.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="app-panel app-hover-box w-full max-w-3xl overflow-hidden rounded-[32px]">
            <div className="border-b border-[rgba(30,23,19,0.08)] px-5 py-5 dark:border-white/8 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200"><Printer size={18} /></div>
                  <div>
                    <p className="app-eyebrow">{copy.modalEyebrow}</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{editId ? copy.modalEditTitle : copy.modalAddTitle}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.modalDesc}</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="app-secondary-button inline-flex h-11 w-11 items-center justify-center rounded-[16px]"><X size={16} /></button>
              </div>
            </div>

            <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="grid gap-4">
                <div className="rounded-[26px] border border-[rgba(30,23,19,0.08)] bg-[linear-gradient(180deg,rgba(239,125,87,0.08),transparent)] p-4 dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(239,125,87,0.08),rgba(143,209,232,0.04))]">
                  <p className="app-overline">{copy.preview}</p>
                  <div className="mt-3 flex h-56 items-center justify-center rounded-[20px] border border-dashed border-[rgba(30,23,19,0.12)] bg-white/60 p-4 dark:border-white/10 dark:bg-white/4">
                    {form.imageUrl ? <img src={form.imageUrl} alt={copy.preview} className="h-full w-full object-contain" /> : <ImageIcon size={36} className="text-slate-300 dark:text-white/20" />}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <button onClick={() => fileRef.current?.click()} disabled={imageUploading} className="app-secondary-button inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-bold disabled:opacity-60">
                  {imageUploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {copy.uploadImage}
                </button>
                <input type="text" value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder={copy.imageUrlPlaceholder} className="app-control rounded-[18px]" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 md:col-span-2">
                  <span className="app-overline">{copy.printerName}</span>
                  <input type="text" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={copy.printerNamePlaceholder} className="app-control rounded-[18px]" />
                </label>
                <label className="grid gap-2 md:col-span-2">
                  <span className="app-overline">{copy.buildVolume}</span>
                  <input type="text" value={form.buildVolume} onChange={(event) => setForm((current) => ({ ...current, buildVolume: event.target.value }))} placeholder={copy.buildVolumePlaceholder} className="app-control rounded-[18px]" />
                </label>
                <div className="grid gap-2 md:col-span-2">
                  <span className="app-overline">{copy.selectCampus}</span>
                  <div className="grid gap-2 sm:grid-cols-[repeat(2,minmax(0,1fr))_minmax(0,1fr)]">
                    {CAMPUS_OPTIONS.map((campus) => (
                      <button key={campus} onClick={() => setForm((current) => ({ ...current, location: campus }))} className={cn('rounded-[18px] border px-4 py-3 text-sm font-bold transition-all', form.location === campus ? 'border-[rgba(239,125,87,0.28)] bg-[rgba(239,125,87,0.12)] text-slate-900 dark:border-[rgba(239,125,87,0.28)] dark:bg-[rgba(239,125,87,0.12)] dark:text-[var(--landing-text)]' : 'border-[rgba(30,23,19,0.08)] bg-white/56 text-slate-600 dark:border-white/8 dark:bg-white/4 dark:text-[var(--landing-muted)]')}>
                        {campusLabel(campus)}
                      </button>
                    ))}
                    <input type="text" value={!CAMPUS_OPTIONS.includes(form.location) ? form.location : ''} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder={copy.customCampusPlaceholder} className="app-control rounded-[18px]" />
                  </div>
                </div>

                <div className="grid gap-2 md:col-span-2">
                  <span className="app-overline">{copy.selectMaterials}</span>
                  <div className="flex flex-wrap gap-2">
                    {MATERIAL_OPTIONS.map((material) => (
                      <button key={material} onClick={() => toggleMaterial(material)} className={cn('rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-all', form.supportedMaterials.includes(material) ? 'border-[rgba(239,125,87,0.28)] bg-[rgba(239,125,87,0.12)] text-slate-900 dark:border-[rgba(239,125,87,0.28)] dark:bg-[rgba(239,125,87,0.12)] dark:text-[var(--landing-text)]' : 'border-[rgba(30,23,19,0.08)] bg-white/56 text-slate-600 dark:border-white/8 dark:bg-white/4 dark:text-[var(--landing-muted)]')}>
                        {material}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-[22px] border border-[rgba(30,23,19,0.08)] bg-white/56 p-4 dark:border-white/8 dark:bg-white/4 md:col-span-2">
                  <button onClick={() => setForm((current) => ({ ...current, hasAMS: !current.hasAMS }))} className={cn('grid w-full gap-3 rounded-[18px] border px-4 py-4 text-left transition-all md:grid-cols-[auto_minmax(0,1fr)] md:items-center', form.hasAMS ? 'border-violet-200 bg-violet-100/80 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200' : 'border-[rgba(30,23,19,0.08)] bg-white/56 text-slate-600 dark:border-white/8 dark:bg-white/4 dark:text-[var(--landing-muted)]')}>
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-[14px]', form.hasAMS ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-white/60')}>
                      {form.hasAMS ? <CheckCircle size={16} /> : <AppIcon icon="solar:palette-round-bold-duotone" size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-black">{copy.hasAms}</p>
                      <p className="mt-1 text-xs leading-6">{copy.hasAmsDesc}</p>
                    </div>
                  </button>
                </div>

                <label className="grid gap-2 md:col-span-2">
                  <span className="app-overline">{copy.statusField}</span>
                  <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as PrinterRecord['status'] }))} className={cn('app-control rounded-[18px] text-sm font-bold', statusBadge(form.status))}>
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{statusLabels[status] || status}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[rgba(30,23,19,0.08)] px-5 py-5 dark:border-white/8 sm:flex-row sm:px-6">
              <button onClick={() => setShowModal(false)} className="app-secondary-button inline-flex min-h-[50px] flex-1 items-center justify-center rounded-[18px] px-4 text-sm font-bold">{copy.cancel}</button>
              <button onClick={handleSave} disabled={saving} className="app-primary-button inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-bold disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {editId ? copy.saveEdit : copy.saveAdd}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
