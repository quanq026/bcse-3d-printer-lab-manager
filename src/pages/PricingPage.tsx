import React, { useEffect, useState } from 'react';
import { Tag, Layers, Wrench, Info, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

const MATERIAL_COLORS: Record<string, string> = {
  PLA: '#22c55e',
  PETG: '#3b82f6',
  TPU: '#a855f7',
  ABS: '#f97316',
};

const MATERIAL_DESC: Record<string, string> = {
  PLA: 'Dễ in, phổ biến nhất. Phù hợp mô hình, prototype, đồ trang trí.',
  PETG: 'Bền hơn PLA, chịu nhiệt tốt hơn. Phù hợp đồ dùng thực tế.',
  TPU: 'Nhựa dẻo, đàn hồi. Phù hợp vỏ bọc, gioăng, đế giày mô hình.',
  ABS: 'Chịu nhiệt, bền cơ học. Dùng cho bộ phận kỹ thuật.',
};

export const PricingPage: React.FC = () => {
  const [pricing, setPricing] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
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
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="mr-2 animate-spin" /> Đang tải bảng giá...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8 sm:space-y-10">
      <div>
        <h2 className="mb-1 text-xl font-black text-slate-900 dark:text-white sm:text-2xl" style={{ fontFamily: 'Georgia, serif' }}>
          Bảng giá dịch vụ
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Chi phí in 3D tại BCSE Lab được tính theo loại nhựa và khối lượng thực tế sau khi in.
        </p>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Layers size={18} className="text-amber-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Giá nhựa theo vật liệu</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pricing.map((rule: any) => (
            <div
              key={rule.material}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white"
                  style={{ background: MATERIAL_COLORS[rule.material] || '#64748b' }}
                >
                  {rule.material}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{rule.material}</h4>
                  <p className="text-xs text-slate-500">Nhựa in 3D</p>
                </div>
              </div>
              <div className="mb-3">
                <span className="text-2xl font-black" style={{ color: MATERIAL_COLORS[rule.material] || '#64748b' }}>
                  {Number(rule.pricePerGram).toLocaleString('vi-VN')}đ
                </span>
                <span className="ml-1 text-sm text-slate-500">/ gram</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {MATERIAL_DESC[rule.material] || ''}
              </p>
            </div>
          ))}
        </div>
      </section>

      {fees.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Wrench size={18} className="text-amber-500" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Phí dịch vụ</h3>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {fees.map((fee: any, i: number) => (
              <div
                key={fee.name}
                className={`flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 ${i < fees.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{fee.label}</p>
                  {fee.description && <p className="mt-0.5 text-xs text-slate-500">{fee.description}</p>}
                </div>
                <span className={`text-sm font-bold ${fee.amount === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {fee.amount === 0 ? 'Miễn phí' : `${Number(fee.amount).toLocaleString('vi-VN')}đ`}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-amber-200 p-4 dark:border-amber-900/40 sm:p-6" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="shrink-0 rounded-xl bg-amber-100 p-2">
            <Tag size={18} className="text-amber-600" />
          </div>
          <div>
            <h4 className="mb-2 font-bold text-amber-900">Công thức tính chi phí</h4>
            <p className="text-sm leading-relaxed text-amber-800">
              <strong>Chi phí nhựa</strong> = Khối lượng thực tế (gram) × Đơn giá vật liệu
              <br />
              <strong>Tổng chi phí</strong> = Chi phí nhựa + Phí dịch vụ (nếu có)
              <br />
              <br />
              Khối lượng thực tế sẽ được cân sau khi in xong. Chi phí tạm tính trong đơn là ước tính ban đầu của bạn.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-2 text-xs text-slate-400 dark:text-slate-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>Giá có thể thay đổi theo chính sách của Lab. Liên hệ Moderator nếu có thắc mắc về chi phí.</p>
      </div>
    </div>
  );
};
