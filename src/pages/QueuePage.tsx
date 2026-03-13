import React, { useEffect, useState } from 'react';
import { Clock, Loader2, RefreshCw, User, Printer as PrinterIcon, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

const STATUS_STYLE: Record<string, string> = {
  Submitted: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  'Pending review': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Scheduled: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Printing: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const STATUS_DOT: Record<string, string> = {
  Submitted: 'bg-slate-400',
  'Pending review': 'bg-yellow-400',
  Approved: 'bg-emerald-500',
  Scheduled: 'bg-blue-500',
  Printing: 'bg-purple-500 animate-pulse',
};

interface QueuePageProps {
  currentUser: any;
}

export const QueuePage: React.FC<QueuePageProps> = ({ currentUser }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await api.getQueue();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const myJobs = jobs.filter((j) => j.userId === currentUser?.id);
  const myPositions = new Set(myJobs.map((j) => j.id));

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Hàng chờ in</h2>
          <p className="mt-1 text-sm text-slate-500">
            {jobs.length} lệnh đang chờ — được sắp xếp theo thứ tự thời gian nộp
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {myJobs.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">
          <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
            Lệnh của bạn: {myJobs.map((j) => {
              const pos = jobs.findIndex((q) => q.id === j.id) + 1;
              return `${j.jobName} — vị trí #${pos}`;
            }).join(' · ')}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={24} className="mr-2 animate-spin" />
          <span className="text-sm">Đang tải hàng chờ...</span>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
          <Clock size={40} strokeWidth={1} />
          <p className="text-sm">Không có lệnh nào trong hàng chờ</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
            {jobs.map((job, idx) => {
              const isMe = myPositions.has(job.id);
              return (
                <div
                  key={job.id}
                  className={cn(
                    'space-y-3 p-4',
                    isMe ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'bg-white dark:bg-slate-900'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black',
                          idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                          idx === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                          idx === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' :
                          'bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500'
                        )}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isMe && (
                            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">Bạn</span>
                          )}
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{job.jobName}</p>
                        </div>
                        <p className="font-mono text-[10px] text-slate-400">{job.id}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold',
                        STATUS_STYLE[job.status] || 'bg-slate-100 text-slate-500'
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[job.status] || 'bg-slate-400')} />
                      {job.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <User size={14} className="text-slate-500" />
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{job.userName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <PrinterIcon size={14} className="text-slate-500" />
                      </div>
                      <span>{job.materialType} • {job.color}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span>{job.slotTime || 'Chưa xếp lịch'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>{new Date(job.createdAt).toLocaleString('vi-VN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  <th className="w-12 px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">#</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Tên lệnh</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Người gửi</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Vật liệu</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Ca / Giờ</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Trạng thái</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nộp lúc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {jobs.map((job, idx) => {
                  const isMe = myPositions.has(job.id);
                  return (
                    <tr
                      key={job.id}
                      className={cn(
                        'transition-colors',
                        isMe ? 'bg-blue-50/60 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      )}
                    >
                      <td className="px-6 py-4">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-black',
                            idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                            idx === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                            idx === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' :
                            'bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500'
                          )}
                        >
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isMe && (
                            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">Bạn</span>
                          )}
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{job.jobName}</p>
                            <p className="font-mono text-[10px] text-slate-400">{job.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                            <User size={14} className="text-slate-500" />
                          </div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{job.userName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{job.materialType}</p>
                          <p className="text-[10px] text-slate-400">{job.color}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {job.slotTime ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <Calendar size={12} />
                            {job.slotTime}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold',
                            STATUS_STYLE[job.status] || 'bg-slate-100 text-slate-500'
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[job.status] || 'bg-slate-400')} />
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock size={12} />
                          {new Date(job.createdAt).toLocaleString('vi-VN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30 sm:px-6">
            <p className="text-[11px] text-slate-400">
              Duyệt theo thứ tự từ trên xuống. Nộp sớm = được ưu tiên hơn.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_STYLE).map(([s]) => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[s])} />
            <span className="text-[11px] text-slate-500">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
