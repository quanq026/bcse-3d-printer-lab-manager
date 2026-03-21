import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer as PrinterIcon,
  Package,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Check,
  CreditCard,
  Loader2,
  X,
  MapPin,
  Info,
  Wrench,
  User,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import type { User as AppUser, Printer, PricingRule, FilamentInventory, ServiceFee } from '../types';
import { MaterialType, MaterialSource } from '../types';
import { api } from '../lib/api';
import { FilePreview } from '../components/FilePreview';
import { useLang } from '../contexts/LanguageContext';
import { getUiText, fillText } from '../lib/uiText';

type PrintMode = 'self' | 'lab_assisted';

interface BookingWizardProps {
  onComplete: () => void;
  onCancel: () => void;
  currentUser: AppUser | null;
}

// Color name → hex mapping for display
const COLOR_HEX: Record<string, string> = {
  'White': '#ffffff', 'Black': '#1a1a1a', 'Gray': '#9ca3af',
  'Blue': '#3b82f6', 'Green': '#22c55e', 'Red': '#ef4444',
  'Yellow': '#eab308', 'Orange': '#f97316', 'Purple': '#a855f7', 'Pink': '#ec4899',
};

const BRAND_OPTIONS: Record<string, string[]> = {
  PLA: ['Bambu Lab', 'Elegoo', 'Sunlu', 'eSUN', 'Polymaker', 'Creality', 'Other'],
  PETG: ['Bambu Lab', 'Elegoo', 'Sunlu', 'eSUN', 'Polymaker', 'Other'],
  TPU: ['Bambu Lab', 'Sunlu', 'eSUN', 'Sainsmart', 'Other'],
  ABS: ['Bambu Lab', 'eSUN', 'Polymaker', 'Hatchbox', 'Other'],
};

const SUB_SLOTS: Record<string, string[]> = {
  morning: ['8h–9h', '9h–10h', '10h–11h', '11h–12h'],
  afternoon: ['13h–14h', '14h–15h', '15h–16h', '16h–17h'],
  evening: ['17h–18h', '18h–19h', '19h–20h'],
};

export const BookingWizard: React.FC<BookingWizardProps> = ({ onComplete, onCancel, currentUser }) => {
  const { t, lang } = useLang();
  const text = getUiText(lang);
  const bw = text.bookingWizard;
  const clr = text.colors;
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [pricing, setPricing] = useState<PricingRule[]>([]);
  const [inventory, setInventory] = useState<FilamentInventory[]>([]);
  const [serviceFees, setServiceFees] = useState<ServiceFee[]>([]);
  const [uploadedFile, setUploadedFile] = useState<{ fileName: string; originalName: string; rawFile: File } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    printMode: 'self' as PrintMode,
    materialSource: MaterialSource.LAB,
    jobName: '',
    description: '',
    materialType: MaterialType.PLA,
    colors: [] as string[],
    customColor: '',
    brand: '',
    estimatedTimeValue: '',
    estimatedTimeUnit: 'hours' as 'hours' | 'minutes',
    estimatedGrams: 0,
    printerId: '',
    preferredDate: '',
    preferredSlot: 'afternoon',
    preferredSubSlot: '',
    fileName: '',
    nozzleSize: '',
    slicerEngine: '',
  });

  useEffect(() => {
    Promise.all([api.getPrinters(), api.getPricing(), api.getInventory(), api.getServiceFees()])
      .then(([p, pr, inv, fees]) => { setPrinters(p); setPricing(pr); setInventory(inv); setServiceFees(fees); })
      .catch(console.error);
  }, []);

  const selectedPrinter = printers.find(p => p.id === formData.printerId);
  const isSelf = formData.printMode === 'self';
  const isLabMaterial = formData.materialSource === MaterialSource.LAB;

  // ── Inventory-driven material/color (Shopee-style cross-filtering) ──
  const inStockItems = inventory.filter(i => i.remainingGrams > i.threshold);

  // All unique materials & colors that are in stock
  const allMaterials = [...new Set(inStockItems.map(i => i.material))];
  const allColors = [...new Set(inStockItems.map(i => i.color))].filter(Boolean);

  // Cross-filtered: available colors given selected material (or all if none)
  const availableColors = formData.materialType
    ? [...new Set(inStockItems.filter(i => i.material === formData.materialType).map(i => i.color))].filter(Boolean)
    : allColors;

  // Cross-filtered: available materials given selected color(s) (or all if none)
  const selectedColors = formData.colors.filter(c => c !== 'Other');
  const availableMaterials = selectedColors.length > 0
    ? [...new Set(inStockItems.filter(i => selectedColors.includes(i.color)).map(i => i.material))]
    : allMaterials;

  // Check if lab has stock for selected material
  const labHasStock = inStockItems.some(i => i.material === formData.materialType);

  // Step flow:
  // Tự in + Lab:  1 → 2 → 3 → 4 → 5
  // Tự in + Own:  1 → 3 → 4 → 5   (skip step 2)
  // In hộ + Lab:  1 → 2 → 3 → 5   (skip step 4)
  // In hộ + Own:  1 → 2 → 3 → 5   (skip step 4)
  const getNextStep = (current: number): number => {
    if (current === 1 && isSelf && !isLabMaterial) return 3; // skip material step
    if (current === 3 && !isSelf) return 5; // skip printer/slot step
    return current + 1;
  };

  const getPrevStep = (current: number): number => {
    if (current === 3 && isSelf && !isLabMaterial) return 1;
    if (current === 5 && !isSelf) return 3;
    return current - 1;
  };

  // Steps: Hình thức → Vật liệu → File → Máy & Lịch → Xác nhận
  const steps = [
    { id: 1, label: t('step1'), icon: FileText },
    { id: 2, label: t('step2'), icon: Package },
    { id: 3, label: t('step3'), icon: Upload },
    { id: 4, label: t('step4'), icon: PrinterIcon },
    { id: 5, label: t('step5'), icon: CheckCircle2 },
  ];

  const skippedSteps = new Set<number>();
  if (isSelf && !isLabMaterial) skippedSteps.add(2);
  if (!isSelf) skippedSteps.add(4);

  const canNext = () => {
    if (step === 1) return formData.jobName.trim().length > 0;
    if (step === 5) return confirmed;
    return true;
  };

  const nextStep = () => { if (canNext()) setStep(getNextStep(step)); };
  const prevStep = () => setStep(getPrevStep(step));

  // File accept depends on case
  const acceptedFileTypes = isSelf && isLabMaterial ? '.gcode,.gcode.3mf' : '.stl,.3mf';

  const checkFileAllowed = (file: File): { ok: boolean, err: string } => {
    const name = file.name.toLowerCase();
    if (isSelf && isLabMaterial) {
      if (name.endsWith('.gcode.3mf') || name.endsWith('.gcode')) return { ok: true, err: '' };
      return { ok: false, err: bw.fileErrorGcode };
    } else {
      if ((name.endsWith('.3mf') && !name.endsWith('.gcode.3mf')) || name.endsWith('.stl')) return { ok: true, err: '' };
      return { ok: false, err: bw.fileErrorStl };
    }
  };

  const autoFillPrintData = async (file: File) => {
    try {
      const name = file.name.toLowerCase();
      let text = '';

      if (name.endsWith('.gcode.3mf')) {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(file);

        // Extract nozzle from plate json or project settings
        const plateJsonFile = Object.keys(zip.files).find(n => n.endsWith('.json') && n.includes('plate'));
        if (plateJsonFile) {
          const plateText = await zip.files[plateJsonFile].async('text');
          const nMatch = plateText.match(/"nozzle_diameter"\s*:\s*(?:\[\s*)?"?([\d.]+)"?(?:\s*\])?/i);
          if (nMatch) setFormData(f => ({ ...f, nozzleSize: Number(parseFloat(nMatch[1]).toFixed(2)).toString() }));
        } else {
          const settingsFile = Object.keys(zip.files).find(n => n.includes('project_settings.config'));
          if (settingsFile) {
            const settingsText = await zip.files[settingsFile].async('text');
            const nMatch = settingsText.match(/"nozzle_diameter"\s*:\s*(?:\[\s*)?"?([\d.]+)"?(?:\s*\])?/i);
            if (nMatch) setFormData(f => ({ ...f, nozzleSize: Number(parseFloat(nMatch[1]).toFixed(2)).toString() }));
          }
        }

        const configFile = Object.keys(zip.files).find(n => n.includes('slice_info.config'));
        if (configFile) {
          const configText = await zip.files[configFile].async('text');

          let weight = 0;
          let timeSecs = 0;
          let slicer = '';

          // Find slicing engine from XML attributes or comments
          const slicerMatch = configText.match(/generator="(BambuStudio|OrcaSlicer|PrusaSlicer)[^"]*"/i);
          if (slicerMatch) slicer = slicerMatch[1];

          // Format 1: <weight>12.3</weight> or <print_weight>12.3</print_weight>
          const wMatch1 = configText.match(/<([a-zA-Z0-9_]*?)weight>([\d.]+)<\/\1weight>/i);
          // Format 2: <metadata key="weight" value="12.3"/>
          const wMatch2 = configText.match(/key="[a-zA-Z0-9_]*?weight"\s+value="([\d.]+)"/i);

          if (wMatch1) weight = parseFloat(wMatch1[2]);
          else if (wMatch2) weight = parseFloat(wMatch2[1]);

          // Format 1: <time>3600</time> or <print_time>3600</print_time>
          const tMatch1 = configText.match(/<([a-zA-Z0-9_]*?)time>([\d.]+)<\/\1time>/i);
          // Format 2: <metadata key="time" value="3600"/> or <metadata key="prediction" value="36230"/>
          const tMatch2 = configText.match(/key="(?:[a-zA-Z0-9_]*?time|prediction)"\s+value="([\d.]+)"/i);

          if (tMatch1) timeSecs = parseFloat(tMatch1[2]);
          else if (tMatch2) timeSecs = parseFloat(tMatch2[1]);

          if (weight > 0) setFormData(f => ({ ...f, estimatedGrams: Math.ceil(weight) }));
          if (timeSecs > 0) {
            const timeH = Math.ceil((timeSecs / 3600) * 10) / 10;
            setFormData(f => ({ ...f, estimatedTimeValue: timeH.toString(), estimatedTimeUnit: 'hours' }));
          }
          if (slicer) setFormData(f => ({ ...f, slicerEngine: slicer }));

          if (weight > 0 && timeSecs > 0) return;
        }

        const gcodeFile = Object.keys(zip.files).find(n => n.endsWith('.gcode'));
        if (gcodeFile) {
          const u8 = await zip.files[gcodeFile].async('uint8array');
          const d = new TextDecoder();
          text = d.decode(u8.slice(0, 100000)) + '\\n' + d.decode(u8.slice(-100000));
        }
      } else if (name.endsWith('.gcode')) {
        const startText = await file.slice(0, 100000).text();
        const endText = await file.slice(Math.max(0, file.size - 100000)).text();
        text = startText + '\\n' + endText;
      }

      if (text) {
        // Find weight: 
        // "; filament used [g] = 12.3" or "; total filament used [g] = 12.3"
        let weight = 0;
        const wMatch1 = text.match(/filament(?:.*)?used(?:.*)?\[g\](?:.*?)=\s*([\d.]+)/i);
        const wMatch2 = text.match(/total_weight\s*=\s*([\d.]+)/i); // older slicers could use this
        if (wMatch1) weight = parseFloat(wMatch1[1]);
        else if (wMatch2) weight = parseFloat(wMatch2[1]);

        if (weight > 0) setFormData(f => ({ ...f, estimatedGrams: Math.ceil(weight) }));

        // Find time:
        // "; estimated printing time (normal mode) = 1d 2h 3m 4s"
        // "; model printing time: 0h 39m 8s;"
        // "; total time: 39m 8s;"
        const tMatch1 = text.match(/(?:estimated|model|total) (?:printing )?time.*?[=:]\s*(?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i);
        const tMatch2 = text.match(/total_time\s*=\s*([\d.]+)/i); // time in seconds

        if (tMatch1) {
          const d = parseInt(tMatch1[1] || '0');
          const h = parseInt(tMatch1[2] || '0');
          const m = parseInt(tMatch1[3] || '0');
          const s = parseInt(tMatch1[4] || '0');

          // only update if there's actually a match for any of them
          if (tMatch1[1] || tMatch1[2] || tMatch1[3] || tMatch1[4]) {
            const timeH = Math.ceil((d * 24 + h + m / 60 + s / 3600) * 10) / 10;
            setFormData(f => ({ ...f, estimatedTimeValue: timeH.toString(), estimatedTimeUnit: 'hours' }));
          }
        } else if (tMatch2) {
          const timeSecs = parseFloat(tMatch2[1]);
          if (timeSecs > 0) {
            const timeH = Math.ceil((timeSecs / 3600) * 10) / 10;
            setFormData(f => ({ ...f, estimatedTimeValue: timeH.toString(), estimatedTimeUnit: 'hours' }));
          }
        }

        // Extract nozzle from raw gcode
        const nMatch = text.match(/nozzle_diameter\s*=\s*([\d.]+)/i);
        if (nMatch) setFormData(f => ({ ...f, nozzleSize: Number(parseFloat(nMatch[1]).toFixed(2)).toString() }));

        // Extract slicer engine from top comments
        const sMatch = text.match(/;\s*(BambuStudio|OrcaSlicer|PrusaSlicer|Cura)/i);
        if (sMatch) setFormData(f => ({ ...f, slicerEngine: sMatch[1] }));
      }
    } catch (e) { console.error('Error reading file metadata:', e); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const valid = checkFileAllowed(file);
    if (!valid.ok) { setError(valid.err); return; }

    setUploading(true); setError('');
    try {
      if (isSelf && isLabMaterial) autoFillPrintData(file);
      const result = await api.uploadFile(file);
      setUploadedFile({ ...result, originalName: file.name, rawFile: file });
      setFormData(f => ({ ...f, fileName: result.fileName }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : bw.uploadFailed);
    } finally { setUploading(false); }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const valid = checkFileAllowed(file);
    if (!valid.ok) { setError(valid.err); return; }

    setUploading(true); setError('');
    try {
      if (isSelf && isLabMaterial) autoFillPrintData(file);
      const result = await api.uploadFile(file);
      setUploadedFile({ ...result, originalName: file.name, rawFile: file });
      setFormData(f => ({ ...f, fileName: result.fileName }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : bw.uploadFailed);
    } finally { setUploading(false); }
  };

  const getEstimatedTimeString = () => {
    const v = parseFloat(formData.estimatedTimeValue);
    if (!v) return '';
    return formData.estimatedTimeUnit === 'hours' ? `${v}h` : `${v}m`;
  };

  const getPricePerGram = () => {
    const rule = pricing.find(r => r.material === formData.materialType);
    return rule?.pricePerGram || 0;
  };

  const getServiceFeePerGram = () => {
    const fee = serviceFees.find(f => f.name === 'service_fee');
    return (fee?.enabled ? fee?.amount : 0) || 0;
  };

  // Cost breakdown:
  // - matCost: only when using Lab material
  // - svcCost: only when lab_assisted (per gram)
  const matCost = isLabMaterial ? formData.estimatedGrams * getPricePerGram() : 0;
  const svcCost = !isSelf ? formData.estimatedGrams * getServiceFeePerGram() : 0;
  const totalCost = matCost + svcCost;

  const toggleColor = (color: string) => {
    if (!selectedPrinter?.hasAMS) {
      setFormData(f => ({ ...f, colors: [color] }));
      return;
    }
    setFormData(f => {
      const current = f.colors;
      if (current.includes(color)) {
        if (current.length === 1) return f;
        return { ...f, colors: current.filter(c => c !== color) };
      }
      if (current.length >= 4) return f;
      return { ...f, colors: [...current, color] };
    });
  };

  const locations = [...new Set(printers.map(p => p.location || clr.other))].sort();

  const TIME_SLOTS = [
    { key: 'morning', label: t('morning'), range: t('morning_range') },
    { key: 'afternoon', label: t('afternoon'), range: t('afternoon_range') },
    { key: 'evening', label: t('evening'), range: t('evening_range') },
  ];

  const handleSubmit = async () => {
    if (!confirmed) { setError(bw.confirmTermsError); return; }
    setError('');
    setSubmitting(true);
    try {
      const resolvedColors = formData.colors.map(c => c === 'Other' ? (formData.customColor || 'Other') : c);
      const slotLabel = TIME_SLOTS.find(s => s.key === formData.preferredSlot)?.label || formData.preferredSlot;
      const dateLabel = formData.preferredDate
        ? new Date(formData.preferredDate + 'T12:00:00').toLocaleDateString('vi-VN')
        : '';
      const slotTime = [
        dateLabel,
        formData.preferredSubSlot ? `${slotLabel} (${formData.preferredSubSlot})` : slotLabel,
      ].filter(Boolean).join(' - ');
      await api.createJob({
        printMode: formData.printMode,
        jobName: formData.jobName,
        description: formData.description,
        fileName: formData.fileName || 'unknown.stl',
        estimatedTime: getEstimatedTimeString(),
        estimatedGrams: formData.estimatedGrams,
        materialType: formData.materialType,
        color: (isSelf && isLabMaterial) ? resolvedColors.join(', ') : '',
        brand: formData.brand || undefined,
        materialSource: formData.materialSource,
        printerId: isSelf ? (formData.printerId || undefined) : undefined,
        slotTime: isSelf ? slotTime : undefined,
      });
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : bw.submitFailed);
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      // ── Step 1: Hình thức & Thông tin ───────────────────────────────────
      case 1:
        return (
          <div className="space-y-8">
            {/* Print mode */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t('printMode')} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { val: 'self' as PrintMode, title: t('selfPrint'), desc: t('selfPrintDesc'), icon: User, color: 'blue' },
                  { val: 'lab_assisted' as PrintMode, title: t('labAssisted'), desc: t('labAssistedDesc'), icon: Wrench, color: 'violet' },
                ].map(({ val, title, desc, icon: Icon, color }) => (
                  <button
                    key={val}
                    onClick={() => setFormData(f => ({ ...f, printMode: val }))}
                    className={cn(
                      "flex items-start gap-4 p-5 rounded-2xl border-2 transition-all text-left",
                      formData.printMode === val
                        ? color === 'blue'
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                          : "border-violet-600 bg-violet-50 dark:bg-violet-900/20"
                        : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      formData.printMode === val
                        ? color === 'blue' ? "bg-blue-600 text-white" : "bg-violet-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      <Icon size={20} />
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "font-bold text-sm",
                        formData.printMode === val
                          ? color === 'blue' ? "text-blue-700 dark:text-blue-300" : "text-violet-700 dark:text-violet-300"
                          : "text-slate-900 dark:text-white"
                      )}>{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    {formData.printMode === val && (
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0",
                        color === 'blue' ? "bg-blue-600" : "bg-violet-600"
                      )}>
                        <Check size={12} strokeWidth={4} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Material source */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t('materialSource')} <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { val: MaterialSource.LAB, title: t('labMaterial'), desc: t('labMaterialDesc'), badge: bw.badgePaid, badgeColor: 'amber' },
                  { val: MaterialSource.OWN, title: t('ownMaterial'), desc: t('ownMaterialDesc'), badge: bw.badgeFree, badgeColor: 'emerald' },
                ].map(({ val, title, desc, badge, badgeColor }) => (
                  <label
                    key={val}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      formData.materialSource === val
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    <input
                      type="radio" name="source" className="w-4 h-4 text-blue-600"
                      checked={formData.materialSource === val}
                      onChange={() => setFormData(f => ({ ...f, materialSource: val }))}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{title}</p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      badgeColor === 'amber' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                    )}>{badge}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Job info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {t('jobName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t('jobNamePlaceholder')}
                  className={cn(
                    "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm",
                    !formData.jobName.trim() ? "border-red-200 dark:border-red-900" : "border-slate-200 dark:border-slate-700"
                  )}
                  value={formData.jobName}
                  onChange={(e) => setFormData(f => ({ ...f, jobName: e.target.value }))}
                />
                {!formData.jobName.trim() && (
                  <p className="text-xs text-red-500">{bw.jobNameRequired}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('purpose')}</label>
                <textarea
                  placeholder={t('purposePlaceholder')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm h-[72px] resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            {/* Flow preview hint */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Info size={12} />
                {isSelf && isLabMaterial && bw.flowSelfLab}
                {isSelf && !isLabMaterial && bw.flowSelfOwn}
                {!isSelf && isLabMaterial && bw.flowLabLab}
                {!isSelf && !isLabMaterial && bw.flowLabOwn}
              </p>
            </div>
          </div>
        );

      // ── Step 2: Vật liệu (skip for Tự in + Tự mang) ─────────────────────
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                {/* Material type — driven by inventory */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{t('materialType')}</label>
                    {isLabMaterial && (
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        labHasStock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {labHasStock ? bw.labOk : bw.outOfStock}
                      </span>
                    )}
                  </div>
                  {isLabMaterial && allMaterials.length === 0 && (
                    <p className="text-xs text-red-500">{bw.noMaterialInStock}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {(isLabMaterial ? Object.values(MaterialType) : Object.values(MaterialType)).map((type) => {
                      const inStock = isLabMaterial ? availableMaterials.includes(type) : true;
                      const hasAny = isLabMaterial ? allMaterials.includes(type) : true;
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            setFormData(f => {
                              const newColors = isLabMaterial
                                ? f.colors.filter(c => inStockItems.some(i => i.material === type && i.color === c))
                                : f.colors;
                              return { ...f, materialType: type, colors: newColors.length > 0 ? newColors : [] };
                            });
                          }}
                          disabled={isLabMaterial && !hasAny}
                          className={cn(
                            "py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all relative",
                            formData.materialType === type
                              ? "border-blue-600 bg-blue-50 text-blue-600 dark:bg-blue-900/30"
                              : isLabMaterial && !hasAny
                                ? "border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50"
                                : isLabMaterial && !inStock
                                  ? "border-slate-100 dark:border-slate-800 text-slate-400 border-dashed"
                                  : "border-slate-100 dark:border-slate-800 text-slate-500 hover:border-blue-200"
                          )}
                        >
                          {type}
                          {isLabMaterial && !hasAny && (
                            <span className="block text-[9px] font-normal text-red-400 mt-0.5">{bw.outOfStock}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color — inventory-driven, Shopee-style cross-filter */}
                {isSelf && isLabMaterial && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {t('color')} {selectedPrinter?.hasAMS ? t('colorAMS') : ''}
                      </label>
                      {selectedPrinter?.hasAMS && (
                        <span className="text-[10px] text-purple-600 font-bold bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                          {t('colorSelected')}: {formData.colors.length}/4
                        </span>
                      )}
                    </div>
                    {availableColors.length === 0 && (
                      <p className="text-xs text-slate-400">{bw.noColorForMaterial}</p>
                    )}
                    {selectedPrinter?.hasAMS && formData.colors.length > 1 && (
                      <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                        <div className="flex gap-1">
                          {formData.colors.map((c, i) => (
                            <div key={i} className="w-5 h-5 rounded-full border-2 border-white shadow" style={{ backgroundColor: COLOR_HEX[c] || '#ccc' }} title={c} />
                          ))}
                        </div>
                        <p className="text-[11px] text-purple-700 dark:text-purple-300 font-bold">
                          {fillText(bw.multiColorLabel, { count: String(formData.colors.length), colors: formData.colors.join(', ') })}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {allColors.map((colorName) => {
                        const isAvail = availableColors.includes(colorName);
                        const isSelected = formData.colors.includes(colorName);
                        return (
                          <button
                            key={colorName}
                            onClick={() => isAvail && toggleColor(colorName)}
                            disabled={!isAvail}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-bold transition-all",
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600"
                                : isAvail
                                  ? "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                                  : "bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-50"
                            )}
                          >
                            <div className="w-3 h-3 rounded-full border border-white/50" style={{ backgroundColor: COLOR_HEX[colorName] || '#ccc' }} />
                            {colorName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* In hộ + Lab: note that lab handles color */}
                {!isSelf && isLabMaterial && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex gap-3">
                    <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                      {t('labWillSlice')}
                    </p>
                  </div>
                )}

                {/* Brand — for Tự mang cases (In hộ + Own) */}
                {!isLabMaterial && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{bw.brandLabel}</label>
                    <div className="flex flex-wrap gap-2">
                      {(BRAND_OPTIONS[formData.materialType] || BRAND_OPTIONS.PLA).map(b => (
                        <button
                          key={b}
                          onClick={() => setFormData(f => ({ ...f, brand: f.brand === b ? '' : b }))}
                          className={cn(
                            'px-3 py-1.5 rounded-full border text-xs font-bold transition-all',
                            formData.brand === b
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                          )}
                        >{b === 'Other' ? clr.other : b}</button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400">{bw.brandHint}</p>
                  </div>
                )}
              </div>

              {/* Right panel: cost breakdown */}
              <div className="app-hover-box bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 h-fit space-y-4">
                <h5 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard size={18} className="text-blue-600" />
                  {bw.costStructure}
                </h5>

                {/* Fee rows */}
                <div className="space-y-2">
                  {/* Material fee */}
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${isLabMaterial ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-800 border-transparent opacity-50'}`}>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{bw.materialFeeLabel}</p>
                      <p className="text-[10px] text-slate-400">{bw.materialFeeDesc}</p>
                    </div>
                    {isLabMaterial ? (
                      <span className="text-sm font-black text-blue-600">{getPricePerGram().toLocaleString()}đ/g</span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600">{bw.badgeFree}</span>
                    )}
                  </div>

                  {/* Service fee */}
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${!isSelf ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-800 border-transparent opacity-50'}`}>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{bw.serviceFeeLabel}</p>
                      <p className="text-[10px] text-slate-400">{bw.serviceFeeDesc}</p>
                    </div>
                    {!isSelf ? (
                      <span className="text-sm font-black text-violet-600">{getServiceFeePerGram().toLocaleString()}đ/g</span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600">{bw.notApplicable}</span>
                    )}
                  </div>
                </div>

                {/* Summary badge per case */}
                {isSelf && !isLabMaterial && (
                  <div className="p-3 rounded-xl border bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium leading-relaxed">
                    {bw.caseSelfOwn}
                  </div>
                )}
                {isSelf && isLabMaterial && (
                  <div className="p-3 rounded-xl border bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-medium leading-relaxed">
                    {bw.caseSelfLab} {getPricePerGram().toLocaleString()}đ/g. <span className="font-bold">{bw.noServiceFee}</span>
                  </div>
                )}
                {!isSelf && !isLabMaterial && (
                  <div className="p-3 rounded-xl border bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-medium leading-relaxed">
                    {bw.caseLabOwn} {getServiceFeePerGram().toLocaleString()}đ/g. <span className="font-bold">{bw.freeMaterialNote}</span>
                  </div>
                )}
                {!isSelf && isLabMaterial && (
                  <div className="p-3 rounded-xl border bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-medium leading-relaxed">
                    {bw.caseLabLab} {getPricePerGram().toLocaleString()}đ/g + {bw.serviceCostLabel} {getServiceFeePerGram().toLocaleString()}đ/g = <span className="font-bold">{(getPricePerGram() + getServiceFeePerGram()).toLocaleString()}đ/g</span>
                  </div>
                )}

                <p className="text-[10px] text-slate-400">{bw.costFinalNote}</p>
              </div>
            </div>
          </div>
        );

      // ── Step 3: Upload file ──────────────────────────────────────────────
      case 3:
        return (
          <div className="space-y-6">
            {/* File type hint banner */}
            {isSelf && isLabMaterial ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{t('slicedFileRequired')}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{t('slicedFileNote')}</p>
                </div>
              </div>
            ) : !isSelf ? (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex gap-3">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  {bw.uploadLabNote}
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* File upload */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {isSelf && isLabMaterial ? bw.uploadGcodeLabel : t('uploadFile')}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptedFileTypes}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div
                  onClick={() => !uploadedFile && fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className={cn(
                    "border-2 border-dashed rounded-xl transition-colors",
                    uploadedFile
                      ? "border-emerald-300 dark:border-emerald-700 cursor-default"
                      : "border-slate-200 dark:border-slate-700 hover:border-blue-400 cursor-pointer bg-slate-50 dark:bg-slate-800/50"
                  )}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                      <Loader2 size={24} className="animate-spin text-blue-600" />
                      <p className="text-sm text-slate-500">{bw.uploading}</p>
                    </div>
                  ) : uploadedFile ? (
                    <div className="space-y-2">
                      <FilePreview file={uploadedFile.rawFile} className="w-full h-48" />
                      <div className="px-4 pb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{uploadedFile.originalName}</p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-xs text-emerald-600">{t('uploadSuccess')}</p>
                            {(formData.nozzleSize || formData.slicerEngine) && (
                              <p className="text-[10px] text-slate-500 flex flex-wrap gap-2">
                                {formData.slicerEngine && <span className="text-blue-500 font-medium">{formData.slicerEngine}</span>}
                                {formData.nozzleSize && <span>Nozzle: {formData.nozzleSize}</span>}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                            setFormData(f => ({ ...f, fileName: '', nozzleSize: '', slicerEngine: '' }));
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-xs text-slate-400 hover:text-red-600 flex items-center gap-1 p-1"
                        >
                          <X size={14} /> {t('deleteFile')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-10">
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                        <Upload size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{t('uploadHint')}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {isSelf && isLabMaterial ? bw.supportGcode : t('uploadNote')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>

              {/* Estimated time + grams */}
              {(!isSelf || !isLabMaterial || uploadedFile) && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t('estimatedTime')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="0"
                        className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                        value={formData.estimatedTimeValue}
                        onChange={(e) => setFormData(f => ({ ...f, estimatedTimeValue: e.target.value }))}
                        disabled={isSelf && isLabMaterial && !!uploadedFile}
                      />
                      <select
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed appearance-none pr-8"
                        style={{ backgroundSize: '0', paddingRight: '1rem' }}
                        value={formData.estimatedTimeUnit}
                        onChange={(e) => setFormData(f => ({ ...f, estimatedTimeUnit: e.target.value as 'hours' | 'minutes' }))}
                        disabled={isSelf && isLabMaterial && !!uploadedFile}
                      >
                        <option value="hours">{t('hours')}</option>
                        <option value="minutes">{t('minutes')}</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Info size={11} />
                      {isSelf && isLabMaterial ? bw.autoCalc : t('estimatedTimeHint')}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t('estimatedGrams')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder={bw.exampleGrams}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm disabled:opacity-60 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      value={formData.estimatedGrams || ''}
                      onChange={(e) => setFormData(f => ({ ...f, estimatedGrams: parseInt(e.target.value) || 0 }))}
                      disabled={isSelf && isLabMaterial && !!uploadedFile}
                    />
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Info size={11} />
                      {isSelf && isLabMaterial ? bw.autoCalc : t('estimatedGramsHint')}
                    </p>
                  </div>

                  {/* Cost preview */}
                  {formData.estimatedGrams > 0 && (isSelf ? isLabMaterial : true) && (
                    <div className={`p-4 rounded-xl border space-y-1 ${isSelf ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'}`}>
                      <p className="text-xs text-slate-500 mb-2">{t('costEstimate')}</p>
                      {isLabMaterial && (
                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                          <span>{bw.materialCostLabel}: {formData.estimatedGrams}g × {getPricePerGram().toLocaleString()}đ/g</span>
                          <span className="font-bold">{matCost.toLocaleString()}đ</span>
                        </div>
                      )}
                      {!isSelf && getServiceFeePerGram() > 0 && (
                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                          <span>{bw.serviceCostLabel}: {formData.estimatedGrams}g × {getServiceFeePerGram().toLocaleString()}đ/g</span>
                          <span className="font-bold">{svcCost.toLocaleString()}đ</span>
                        </div>
                      )}
                      <div className={`flex justify-between pt-1 border-t ${isSelf ? 'border-blue-100 dark:border-blue-800' : 'border-amber-100 dark:border-amber-800'}`}>
                        <span className={`text-sm font-bold ${isSelf ? 'text-blue-600' : 'text-amber-700 dark:text-amber-300'}`}>{bw.totalEstimate}</span>
                        <span className={`text-xl font-black ${isSelf ? 'text-blue-600' : 'text-amber-700 dark:text-amber-300'}`}>{totalCost.toLocaleString()}đ</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {!isSelf ? bw.modConfirmAfterSlice : t('payLater')}
                      </p>
                    </div>
                  )}
                  {/* Self + Own: free */}
                  {isSelf && !isLabMaterial && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                      <p className="text-xs text-slate-500 mb-1">{t('costEstimate')}</p>
                      <p className="text-xl font-black text-emerald-600">{bw.freeTotal}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{bw.ownMaterialFreeNote}</p>
                    </div>
                  )}
                  {/* In hộ + Own + 0 service fee note */}
                  {!isSelf && !isLabMaterial && getServiceFeePerGram() === 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">{t('waitingSchedule')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      // ── Step 4: Máy & Lịch (Tự in only) ────────────────────────────────
      case 4:
        return (
          <div className="space-y-8">
            {/* Printer selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('selectPrinter')}</h4>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded border border-emerald-100 uppercase">{t('printerAvailable')}</span>
                  <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded border border-amber-100 uppercase">{t('printerBusy')}</span>
                  <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-100 uppercase">AMS</span>
                </div>
              </div>
              {printers.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 size={20} className="animate-spin mr-2" />
                  <span className="text-sm">{t('loadingPrinters')}</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {locations.map(loc => (
                    <div key={loc}>
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={14} className="text-blue-500" />
                        <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">{loc}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {printers.filter(p => (p.location || clr.other) === loc).map((printer) => (
                          <div
                            key={printer.id}
                            onClick={() => printer.status !== 'Maintenance' && setFormData(f => ({ ...f, printerId: printer.id }))}
                            className={cn(
                              "rounded-2xl border-2 transition-all relative overflow-hidden",
                              printer.status === 'Maintenance'
                                ? "opacity-50 cursor-not-allowed border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                                : formData.printerId === printer.id
                                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 cursor-pointer"
                                  : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-200 cursor-pointer"
                            )}
                          >
                            {formData.printerId === printer.id && (
                              <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white z-10">
                                <Check size={12} strokeWidth={4} />
                              </div>
                            )}
                            {printer.hasAMS && (
                              <div className="absolute top-3 left-3 z-10">
                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black rounded border border-purple-200 uppercase">{t('printerAMS')}</span>
                              </div>
                            )}
                            <div className="h-32 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                              {printer.imageUrl ? (
                                <img src={printer.imageUrl} alt={printer.name} className="h-full w-full object-contain p-3" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              ) : (
                                <PrinterIcon size={36} className="text-slate-300" strokeWidth={1} />
                              )}
                            </div>
                            <div className="p-4">
                              <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{printer.name}</h5>
                              <p className="text-[10px] text-slate-500 mb-2">{printer.buildVolume}</p>
                              <div className="flex flex-wrap gap-1 mb-3">
                                {(printer.supportedMaterials || []).map((m: string) => (
                                  <span key={m} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-bold rounded uppercase">{m}</span>
                                ))}
                              </div>
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400">{t('queue_length')}: {printer.queueLength || 0}</span>
                                <span className={cn("text-[10px] font-bold uppercase",
                                  printer.status === 'Available' ? "text-emerald-600" : printer.status === 'Maintenance' ? "text-red-500" : "text-amber-600"
                                )}>
                                  {printer.status === 'Available' ? t('printerAvailable') : printer.status === 'Maintenance' ? t('printerMaintenance') : t('printerBusy')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 italic">{bw.printerSkipNote}</p>
            </div>

            {/* Schedule */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('timeSlot')}</h4>
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Info size={14} /> {t('timezone')}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('preferredDate')}</label>
                  <input
                    type="date"
                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                    value={formData.preferredDate}
                    onChange={e => setFormData(f => ({ ...f, preferredDate: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                  />
                  {formData.preferredDate && (
                    <p className="text-xs text-slate-500">
                      {new Date(formData.preferredDate + 'T12:00:00').toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('timeSlot')}</label>
                  <div className="space-y-2">
                    {TIME_SLOTS.map(slot => (
                      <button
                        key={slot.key}
                        onClick={() => setFormData(f => ({ ...f, preferredSlot: slot.key, preferredSubSlot: '' }))}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left',
                          formData.preferredSlot === slot.key ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200'
                        )}
                      >
                        <span className={cn('text-sm font-bold', formData.preferredSlot === slot.key ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300')}>{slot.label}</span>
                        <span className={cn('text-xs', formData.preferredSlot === slot.key ? 'text-blue-500' : 'text-slate-400')}>{slot.range}</span>
                      </button>
                    ))}
                  </div>
                  {formData.preferredSlot && SUB_SLOTS[formData.preferredSlot] && (
                    <div className="pt-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{bw.subSlotLabel}</p>
                      <div className="flex flex-wrap gap-2">
                        {SUB_SLOTS[formData.preferredSlot].map(sub => (
                          <button
                            key={sub}
                            onClick={() => setFormData(f => ({ ...f, preferredSubSlot: f.preferredSubSlot === sub ? '' : sub }))}
                            className={cn(
                              'px-3 py-1.5 rounded-lg border text-xs font-bold transition-all',
                              formData.preferredSubSlot === sub
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                            )}
                          >{sub}</button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">{bw.subSlotHint}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl flex gap-3">
                <Info className="text-amber-600 shrink-0" size={18} />
                <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                  <strong>{bw.noteLabel}:</strong> {t('scheduleNote')}
                </p>
              </div>
            </div>
          </div>
        );

      // ── Step 5: Xác nhận ─────────────────────────────────────────────────
      case 5:
        return (
          <div className="space-y-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                !isSelf ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
              )}>
                {!isSelf ? <Wrench size={32} /> : <CheckCircle2 size={32} />}
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">{t('reviewRequest')}</h4>
              <p className="text-sm text-slate-500 mt-1">
                {!isSelf
                  ? (isLabMaterial ? t('waitingQuote') : t('waitingSchedule'))
                  : t('reviewSubtitle')
                }
              </p>
            </div>

            <div className="app-hover-box bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <div className="text-slate-500">Job:</div>
                  <div className="font-bold text-slate-900 dark:text-white">{formData.jobName || t('notNamed')}</div>

                  <div className="text-slate-500">{bw.reviewFormLabel}:</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {isSelf ? t('selfPrint') : t('labAssisted')}
                  </div>

                  <div className="text-slate-500">{t('materialSource')}:</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {isLabMaterial ? t('labMaterial') : t('ownMaterial')}
                  </div>

                  {!(isSelf && !isLabMaterial) && (
                    <>
                      <div className="text-slate-500">{t('materialType')}:</div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formData.materialType}{formData.brand ? ` — ${formData.brand}` : ''}
                      </div>
                    </>
                  )}

                  {isSelf && isLabMaterial && formData.colors.length > 0 && (
                    <>
                      <div className="text-slate-500">{t('color')}:</div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                        {formData.colors.map((c, i) => {
                          return <span key={i} className="w-4 h-4 rounded-full border border-slate-200 inline-block" style={{ backgroundColor: COLOR_HEX[c] || '#ccc' }} title={c} />;
                        })}
                        {formData.colors.join(', ')}
                      </div>
                    </>
                  )}

                  {isSelf && (
                    <>
                      <div className="text-slate-500">{t('printerName')}:</div>
                      <div className="font-bold text-slate-900 dark:text-white">{selectedPrinter?.name || t('notSelected')}</div>
                    </>
                  )}

                  {isSelf && selectedPrinter?.location && (
                    <>
                      <div className="text-slate-500">{t('area')}:</div>
                      <div className="font-bold text-slate-900 dark:text-white">{selectedPrinter.location}</div>
                    </>
                  )}

                  {formData.estimatedGrams > 0 && (
                    <>
                      <div className="text-slate-500">{t('estimatedGrams')}:</div>
                      <div className="font-bold text-slate-900 dark:text-white">{formData.estimatedGrams} {t('gram')}</div>
                    </>
                  )}

                  {formData.estimatedTimeValue && (
                    <>
                      <div className="text-slate-500">{t('estimatedTime')}:</div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {formData.estimatedTimeValue} {formData.estimatedTimeUnit === 'hours' ? t('hours') : t('minutes')}
                      </div>
                    </>
                  )}

                  {isSelf && formData.preferredDate && (
                    <>
                      <div className="text-slate-500">{t('preferredDate')}:</div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {new Date(formData.preferredDate + 'T12:00:00').toLocaleDateString('vi-VN')} – {TIME_SLOTS.find(s => s.key === formData.preferredSlot)?.label || formData.preferredSlot}{formData.preferredSubSlot ? ` (${formData.preferredSubSlot})` : ''}
                      </div>
                    </>
                  )}

                  {uploadedFile && (
                    <>
                      <div className="text-slate-500">{t('attachment')}:</div>
                      <div className="font-bold text-emerald-600">{uploadedFile.originalName}</div>
                    </>
                  )}
                </div>
              </div>

              {/* Cost footer */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('costEstimate')}</span>
                {isSelf && !isLabMaterial ? (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">{bw.reviewOwnFree}</span>
                    <span className="text-xl font-black text-emerald-600">0đ</span>
                  </div>
                ) : (
                  <>
                    {isLabMaterial && (
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>{bw.materialCostLabel}: {formData.estimatedGrams}g × {getPricePerGram().toLocaleString()}đ/g</span>
                        <span className="font-bold">{matCost.toLocaleString()}đ</span>
                      </div>
                    )}
                    {!isSelf && getServiceFeePerGram() > 0 && (
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                        <span>{bw.serviceCostLabel}: {formData.estimatedGrams}g × {getServiceFeePerGram().toLocaleString()}đ/g</span>
                        <span className="font-bold">{svcCost.toLocaleString()}đ</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{bw.reviewTotal}</span>
                      {isSelf ? (
                        <div className="text-right">
                          <span className="text-xl font-black text-blue-600">{totalCost.toLocaleString()}đ</span>
                          <p className="text-[10px] text-slate-400">{t('payLater')}</p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-xl font-black text-amber-600">{totalCost.toLocaleString()}đ</span>
                          <p className="text-[10px] text-slate-400">{bw.modConfirmAfterSlice}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">{error}</div>
            )}

            <label className={cn(
              "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
              confirmed ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
            )}>
              <div className={cn(
                "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                confirmed ? "bg-emerald-500 border-emerald-500" : "border-slate-300 bg-white dark:bg-slate-800"
              )}>
                {confirmed && <Check size={12} strokeWidth={3} className="text-white" />}
              </div>
              <input type="checkbox" className="hidden" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
              <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{t('confirmCheckbox')}</span>
            </label>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="app-student-squared app-booking-wizard mx-auto max-w-5xl space-y-6">
      <section className="app-panel app-hover-box p-5 sm:p-6 md:p-8">
        <div className="mx-auto max-w-4xl space-y-6 text-center">
          <div className="space-y-3">
            <p className="app-eyebrow">{bw.heroEyebrow}</p>
            <h2 className="app-display-sm text-slate-900 dark:text-[var(--landing-text)]">
              {bw.heroTitle}
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">
              {bw.heroDesc}
            </p>
          </div>

          <div className="grid gap-3 text-left sm:grid-cols-3">
            <div className="app-panel-soft border p-4">
              <p className="app-overline">{bw.currentStep}</p>
              <p className="mt-2 text-sm font-black text-slate-900 dark:text-[var(--landing-text)]">
                {step}. {steps.find((item) => item.id === step)?.label}
              </p>
            </div>
            <div className="app-panel-soft border p-4">
              <p className="app-overline">{bw.printModeLabel}</p>
              <p className="mt-2 text-sm font-black text-slate-900 dark:text-[var(--landing-text)]">
                {isSelf ? t('selfPrint') : t('labAssisted')}
              </p>
            </div>
            <div className="app-panel-soft border p-4">
              <p className="app-overline">{bw.materialLabel}</p>
              <p className="mt-2 text-sm font-black text-slate-900 dark:text-[var(--landing-text)]">
                {isLabMaterial ? t('labMaterial') : t('ownMaterial')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="app-panel-soft border p-4 sm:p-5">
        <div className="overflow-x-auto pb-1">
          <div className="relative min-w-[560px]">
            <div className="absolute left-0 top-[22px] h-px w-full bg-[rgba(30,23,19,0.1)] dark:bg-white/8" />
            <div className="relative z-10 flex justify-between gap-4">
              {steps.map((s) => {
                const isSkipped = skippedSteps.has(s.id);
                const isPast = step > s.id && !isSkipped;
                const isCurrent = step === s.id;

                return (
                  <div key={s.id} className="grid justify-items-center gap-2 text-center">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center border text-sm transition-all duration-300',
                        isCurrent
                          ? 'border-[rgba(239,125,87,0.48)] bg-[rgba(239,125,87,0.14)] text-[var(--landing-accent-strong)]'
                          : isPast
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300'
                            : isSkipped
                              ? 'border-[rgba(30,23,19,0.06)] bg-white/50 text-slate-300 opacity-50 dark:border-white/6 dark:bg-white/3 dark:text-white/20'
                              : 'border-[rgba(30,23,19,0.08)] bg-white/70 text-slate-500 dark:border-white/8 dark:bg-white/4 dark:text-[var(--landing-muted)]'
                      )}
                    >
                      {isPast ? <Check size={18} strokeWidth={3} /> : <s.icon size={18} />}
                    </div>
                    <div className="space-y-1">
                      <span
                        className={cn(
                          'block text-[10px] font-black uppercase tracking-[0.18em]',
                          isCurrent
                            ? 'text-[var(--landing-accent-strong)]'
                            : isSkipped
                              ? 'text-slate-300 dark:text-white/20'
                              : 'text-slate-500 dark:text-[var(--landing-muted)]'
                        )}
                      >
                        {bw.stepPrefix} {s.id}
                      </span>
                      <span className="block max-w-[88px] text-xs font-semibold leading-5 text-slate-700 dark:text-[var(--landing-text)]">
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="app-panel app-hover-box min-h-[420px] border p-4 sm:p-6 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="app-panel-soft border px-4 py-4 sm:px-5">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={step === 1 ? onCancel : prevStep}
            disabled={submitting}
            className="app-secondary-button flex w-full items-center justify-center gap-2 px-5 text-sm font-black uppercase tracking-[0.16em] sm:w-auto"
          >
            <ChevronLeft size={18} />
            {step === 1 ? t('cancel') : t('back')}
          </button>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <button
              onClick={step === 5 ? handleSubmit : nextStep}
              disabled={submitting || (step === 5 && !confirmed) || (step === 1 && !formData.jobName.trim())}
              className="app-primary-button flex w-full items-center justify-center gap-2 px-6 text-sm font-black uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {step === 5 ? t('submitRequest') : t('next')}
              {step !== 5 && <ChevronRight size={18} />}
            </button>
            <p className="text-xs leading-6 text-slate-500 dark:text-[var(--landing-muted)]">
              {step === 5 ? bw.submitHint : bw.editHint}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

