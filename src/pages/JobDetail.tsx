import React, { useState } from 'react';
import {
  ArrowLeft,
  Clock,
  CreditCard,
  FileText,
  MessageSquare,
  Download,
  CheckCircle2,
  AlertCircle,
  PenLine,
  Send,
  Loader2,
  Package,
} from 'lucide-react';
import { motion } from 'motion/react';
import { PrintJob, JobStatus, MaterialSource } from '../types';
import { StatusChip } from '../components/StatusChip';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

interface JobDetailProps {
  job: PrintJob;
  onBack: () => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({ job, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitDone, setResubmitDone] = useState(false);

  const handleResubmit = async () => {
    setResubmitting(true);
    try {
      await api.resubmitJob(job.id);
      setResubmitDone(true);
    } catch (err: any) {
      alert(err.message || 'Gửi lại thất bại');
    } finally {
      setResubmitting(false);
    }
  };

  const createdDate = new Date(job.createdAt);
  const fmt = (d: Date) => d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const timeline = [
    { status: JobStatus.SUBMITTED, time: fmt(createdDate), done: true },
    { status: JobStatus.PENDING_REVIEW, time: fmt(new Date(createdDate.getTime() + 5 * 60000)), done: true },
    { status: JobStatus.APPROVED, time: job.status !== JobStatus.PENDING_REVIEW ? fmt(new Date(createdDate.getTime() + 24 * 3600000)) : '—', done: job.status !== JobStatus.PENDING_REVIEW },
    { status: JobStatus.SCHEDULED, time: [JobStatus.SCHEDULED, JobStatus.PRINTING, JobStatus.DONE].includes(job.status) ? fmt(new Date(createdDate.getTime() + 24 * 3600000 + 3600000)) : '—', done: [JobStatus.SCHEDULED, JobStatus.PRINTING, JobStatus.DONE].includes(job.status) },
    { status: JobStatus.PRINTING, time: [JobStatus.PRINTING, JobStatus.DONE].includes(job.status) ? (job.slotTime || '—') : '—', done: [JobStatus.PRINTING, JobStatus.DONE].includes(job.status) },
    { status: JobStatus.DONE, time: job.status === JobStatus.DONE ? fmt(new Date()) : '—', done: job.status === JobStatus.DONE },
  ];

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: FileText },
    { id: 'timeline', label: 'Tiến độ', icon: Clock },
    { id: 'files', label: 'File in', icon: Package },
    { id: 'payment', label: 'Thanh toán', icon: CreditCard },
    { id: 'messages', label: 'Tin nhắn', icon: MessageSquare },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <button
            onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition-all hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{job.jobName}</h2>
              <StatusChip status={job.status} />
            </div>
            <p className="text-sm text-slate-500">
              Mã yêu cầu: <span className="font-mono font-bold">{job.id}</span> • Tạo ngày {new Date(job.createdAt).toLocaleDateString('vi-VN')}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <Download size={18} />
            Hóa đơn
          </button>
          {![JobStatus.DONE, JobStatus.CANCELLED, JobStatus.REJECTED].includes(job.status) && (
            <button
              onClick={async () => {
                if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu này?')) return;
                try {
                  await api.updateJob(job.id, { status: JobStatus.CANCELLED });
                  alert('Đã hủy yêu cầu thành công.');
                  onBack();
                } catch (err: any) {
                  alert(err.message || 'Hủy yêu cầu thất bại');
                }
              }}
              className="rounded-xl bg-red-600 px-6 py-2 text-sm font-bold text-white transition-all hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none"
            >
              Hủy yêu cầu
            </button>
          )}
        </div>
      </div>

      {job.status === JobStatus.NEEDS_REVISION && (
        <div className="rounded-2xl border-2 border-orange-300 p-4 dark:border-orange-700 sm:p-5" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)' }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="shrink-0 rounded-xl bg-orange-100 p-2">
              <PenLine size={20} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <h4 className="mb-1 font-black text-orange-900">Moderator yêu cầu sửa đổi</h4>
              {job.revisionNote ? (
                <p className="mb-4 text-sm leading-relaxed text-orange-800">"{job.revisionNote}"</p>
              ) : (
                <p className="mb-4 text-sm text-orange-700">Vui lòng liên hệ Moderator để biết thêm chi tiết.</p>
              )}
              {resubmitDone ? (
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <CheckCircle2 size={18} /> Đã gửi lại thành công. Đang chờ duyệt lại.
                </div>
              ) : (
                <button
                  onClick={handleResubmit}
                  disabled={resubmitting}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}
                >
                  {resubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Gửi lại yêu cầu
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="-mx-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        <div className="flex min-w-max gap-5 px-1 sm:gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 pb-4 text-sm font-bold transition-all',
                activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              )}
            >
              <tab.icon size={18} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 h-1 w-full rounded-full bg-blue-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2 lg:space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:p-8">
                <h3 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Thông tin chi tiết</h3>
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:gap-x-12 lg:gap-y-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loại vật liệu</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{job.materialType} ({job.color})</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nguồn nhựa</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{job.materialSource === MaterialSource.LAB ? 'Mua từ Lab' : 'Tự mang'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Khối lượng ước tính</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{job.estimatedGrams} gram</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Thời gian in ước tính</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{job.estimatedTime}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Máy in gán</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{job.printerName || 'Chưa gán'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Khung giờ in</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{job.slotTime || 'Chưa xếp lịch'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 sm:p-6 lg:p-8">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Ghi chú in ấn</h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {job.description || 'Không có ghi chú.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:p-8">
              <div className="relative space-y-6 sm:space-y-8">
                <div className="absolute bottom-0 left-[15px] top-0 w-0.5 bg-slate-100 dark:bg-slate-800"></div>
                {timeline.map((item, i) => (
                  <div key={i} className="relative z-10 flex gap-4 sm:gap-6">
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-4 border-white transition-all dark:border-slate-900',
                      item.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                    )}>
                      {item.done ? <CheckCircle2 size={16} /> : <div className="h-2 w-2 rounded-full bg-current" />}
                    </div>
                    <div className="pt-1">
                      <h4 className={cn('text-sm font-bold', item.done ? 'text-slate-900 dark:text-white' : 'text-slate-400')}>
                        {item.status}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:p-8">
                <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Chi tiết thanh toán</h3>
                  <span className={cn(
                    'w-fit rounded-full px-3 py-1 text-xs font-bold uppercase',
                    job.status === JobStatus.DONE ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  )}>
                    {job.status === JobStatus.DONE ? 'Đã thanh toán' : 'Chờ thanh toán'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-slate-500">Tiền nhựa ({job.materialType})</span>
                    <span className="font-bold text-slate-900 dark:text-white">{job.cost.toLocaleString()}đ</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-slate-500">Phí dịch vụ</span>
                    <span className="font-bold text-slate-900 dark:text-white">0đ</span>
                  </div>
                  <div className="flex flex-col gap-2 border-t border-slate-100 pt-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">Tổng cộng</span>
                    <span className="text-2xl font-black text-blue-600">{job.cost.toLocaleString()}đ</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/20 sm:p-6">
                <h4 className="mb-2 text-sm font-bold text-blue-900 dark:text-blue-400">Hướng dẫn thanh toán</h4>
                <p className="mb-4 text-xs leading-relaxed text-blue-800 dark:text-blue-500">
                  Vui lòng thanh toán tại bàn trực của Lab hoặc chuyển khoản qua mã QR bên dưới với nội dung: <strong>{job.id} - {job.userName}</strong>
                </p>
                <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-xl border border-blue-100 bg-white">
                  <div className="flex h-24 w-24 items-center justify-center rounded bg-slate-100 text-[10px] font-bold uppercase text-slate-400">QR Code</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">File đính kèm</h4>
            <div className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-blue-300 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-900">
                <FileText size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{job.fileName}</p>
                <p className="text-[10px] text-slate-500">{job.fileName?.split('.').pop()?.toUpperCase() || 'File'}</p>
              </div>
              <Download size={16} className="text-slate-300 transition-colors group-hover:text-blue-600" />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Moderator phụ trách</h4>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                {job.moderatorName ? job.moderatorName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : '?'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">{job.moderatorName || 'Chưa gán'}</p>
                <p className="text-[10px] text-slate-500">Lab Moderator</p>
              </div>
            </div>
          </div>

          {job.rejectionReason && (
            <div className="rounded-3xl border border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/20 sm:p-6">
              <div className="mb-2 flex items-center gap-2 text-red-600">
                <AlertCircle size={18} />
                <h4 className="text-sm font-bold">Lý do từ chối</h4>
              </div>
              <p className="text-xs italic leading-relaxed text-red-700 dark:text-red-500">
                "{job.rejectionReason}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
