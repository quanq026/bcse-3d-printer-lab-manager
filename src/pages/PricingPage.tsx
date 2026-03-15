import React, { useEffect, useState } from 'react';
import { Tag, Layers, Wrench, Info, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import type { PricingRule, ServiceFee } from '../types';

const MATERIAL_COLORS: Record<string, string> = {
  PLA: '#22c55e',
  PETG: '#3b82f6',
  TPU: '#a855f7',
  ABS: '#f97316',
};

const MATERIAL_DESC: Record<string, string> = {
  PLA: 'Dễ in, phổ biến nhất. Phù hợp mô hình, prototype và đồ trang trí.',
  PETG: 'Bền hơn PLA, chịu nhiệt tốt hơn. Phù hợp đồ dùng thực tế.',
  TPU: 'Nhựa dẻo, đàn hồi. Phù hợp vỏ bọc, gioăng hoặc chi tiết mềm.',
  ABS: 'Chịu nhiệt, bền cơ học. Dùng cho các bộ phận kỹ thuật.',
};

export const PricingPage: React.FC = () => {
  const [pricing, setPricing] = useState<PricingRule[]>([]);
  const [fees, setFees] = useState<ServiceFee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getPricing(), api.getServiceFees()])
      .then(([p, f]) => {
        setPricing(p);
        setFees(f);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="app-student-squared flex items-center justify-center py-20 text-slate-500 dark:text-[var(--landing-muted)]">
        <Loader2 size={24} className="mr-2 animate-spin" /> Đang tải bảng giá...
      </div>
    );
  }

  return (
    <div className="app-student-squared mx-auto max-w-5xl space-y-6 sm:space-y-8">
      <section className="app-panel app-hover-box p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="space-y-4">
            <p className="app-eyebrow">// Bảng giá</p>
            <div className="space-y-3">
              <h2 className="app-display-sm text-slate-900 dark:text-[var(--landing-text)]">
                Chi phí in 3D
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">
                Lab tính phí theo vật liệu, khối lượng thực tế và các khoản xử lý phát sinh. Bảng dưới đây
                giúp sinh viên ước lượng nhanh trước khi gửi yêu cầu in.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="app-panel-soft border p-5">
              <p className="app-overline">Vật liệu đang áp dụng</p>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-[var(--landing-text)]">{pricing.length}</p>
              <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-[var(--landing-muted)]">
                Bao gồm các cấu hình nhựa phổ biến đang được hỗ trợ cho yêu cầu in tại lab.
              </p>
            </div>
            <div className="app-panel-soft border p-5">
              <p className="app-overline">Phí phụ trợ</p>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-[var(--landing-text)]">{fees.length}</p>
              <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-[var(--landing-muted)]">
                Các khoản này được thêm khi cần xử lý file, hỗ trợ vận hành hoặc sử dụng dịch vụ đi kèm.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-[var(--landing-accent)]" />
          <h3 className="app-overline text-slate-700 dark:text-[var(--landing-muted)]">Giá vật liệu theo gram</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {pricing.map((rule: PricingRule) => (
            <article
              key={rule.material}
              className="app-panel app-hover-box grid gap-4 border p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center border text-sm font-black text-white"
                    style={{ background: MATERIAL_COLORS[rule.material] || '#64748b' }}
                  >
                    {rule.material}
                  </div>
                  <div>
                    <p className="app-overline">Vật liệu</p>
                    <h4 className="mt-2 text-lg font-black text-slate-900 dark:text-[var(--landing-text)]">{rule.material}</h4>
                  </div>
                </div>
                <div className="text-right">
                  <p className="app-overline">Đơn giá</p>
                  <p
                    className="mt-2 text-2xl font-black"
                    style={{ color: MATERIAL_COLORS[rule.material] || '#64748b' }}
                  >
                    {Number(rule.pricePerGram).toLocaleString('vi-VN')}đ
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400 dark:text-white/38">mỗi gram</p>
                </div>
              </div>
              <p className="text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">
                {MATERIAL_DESC[rule.material] || ''}
              </p>
            </article>
          ))}
        </div>
      </section>

      {fees.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Wrench size={18} className="text-[var(--landing-accent)]" />
            <h3 className="app-overline text-slate-700 dark:text-[var(--landing-muted)]">Phí dịch vụ và hỗ trợ</h3>
          </div>
          <div className="app-panel app-hover-box overflow-hidden border">
            {fees.map((fee: ServiceFee, i: number) => (
              <div
                key={fee.name}
                className={`grid gap-3 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 ${i < fees.length - 1 ? 'border-b border-[rgba(30,23,19,0.08)] dark:border-white/8' : ''
                  }`}
              >
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-[var(--landing-text)]">{fee.label}</p>
                  {fee.description && (
                    <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-[var(--landing-muted)]">{fee.description}</p>
                  )}
                </div>
                <span className={`text-sm font-black uppercase tracking-[0.16em] ${fee.amount === 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-[var(--landing-accent-strong)]'
                  }`}>
                  {fee.amount === 0 ? 'Miễn phí' : `${Number(fee.amount).toLocaleString('vi-VN')}đ`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="app-panel-soft app-hover-box border p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="flex h-12 w-12 items-center justify-center border bg-[rgba(239,125,87,0.12)] text-[var(--landing-accent-strong)]">
            <Tag size={18} />
          </div>
          <div>
            <p className="app-eyebrow">Cách tính</p>
            <h4 className="mt-2 text-lg font-black text-slate-900 dark:text-[var(--landing-text)]">Ước lượng trước khi gửi đơn</h4>
            <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">
              <p><strong>Chi phí vật liệu</strong> = khối lượng thực tế sau in × đơn giá vật liệu.</p>
              <p><strong>Tổng chi phí</strong> = chi phí vật liệu + phí dịch vụ phát sinh nếu có.</p>
              <p>Khối lượng cuối cùng được cân sau khi hoàn tất. Con số trên đơn chỉ là mức ước lượng để bạn chuẩn bị trước.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="app-panel-soft border px-5 py-4">
        <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-[var(--landing-muted)]">
          <Info size={16} className="mt-0.5 shrink-0 text-[var(--landing-accent)]" />
          <p>Giá có thể thay đổi theo chính sách vận hành của lab. Nếu cần xác nhận chi tiết, bạn có thể nhắn trực tiếp cho moderator trong mục Trao đổi.</p>
        </div>
      </div>
    </div>
  );
};
