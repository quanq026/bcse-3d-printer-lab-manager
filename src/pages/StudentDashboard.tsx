import React, { useState, useEffect } from 'react';
import {
  Plus,
  Clock,
  Zap,
  CreditCard,
  ArrowRight,
  FileText,
  MessageCircle,
  History,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Timer,
  PenLine,
  Search,
} from 'lucide-react';
import { StatusChip } from '../components/StatusChip';
import { Role } from '../types';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useLang } from '../contexts/LanguageContext';

interface StudentDashboardProps {
  onNewBooking: () => void;
  onSelectJob: (id: string) => void;
  onPageChange: (page: string) => void;
  role: Role;
  currentUser: any;
  activePage?: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNewBooking, onSelectJob, onPageChange, role, currentUser, activePage }) => {
  const isHistoryPage = activePage === 'history';
  const { t } = useLang();
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');

  useEffect(() => {
    api.getJobs()
      .then(setJobs)
      .catch(console.error)
      .finally(() => setLoading(false));

    if (role !== Role.STUDENT) {
      api.getStats().then(setStats).catch(() => {});
      api.getDailyStats().then(setDailyStats).catch(() => {});
    }
  }, [role]);

  const myJobs = role === Role.STUDENT
    ? jobs.filter(j => j.userId === currentUser?.id)
    : jobs;

  const kpiCards = [
    {
      label: t('pendingJobs'),
      value: loading ? '...' : myJobs.filter(j => ['Submitted', 'Pending review', 'Approved', 'Scheduled'].includes(j.status)).length.toString(),
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: t('totalJobs'),
      value: loading ? '...' : myJobs.length.toString(),
      icon: Zap,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    },
    {
      label: t('printing'),
      value: loading ? '...' : myJobs.filter(j => j.status === 'Printing').length.toString(),
      icon: FileText,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-900/30',
    },
    {
      label: t('done'),
      value: loading ? '...' : myJobs.filter(j => j.status === 'Done').length.toString(),
      icon: CreditCard,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/30',
    },
  ];

  const needsRevisionJobs = myJobs.filter(j => j.status === 'Needs Revision');

  return (
    <div className="space-y-8">
      {/* Revision Alert */}
      {!isHistoryPage && needsRevisionJobs.length > 0 && (
        <div className="p-4 rounded-2xl border-2 border-orange-300 flex items-start gap-3" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)' }}>
          <PenLine size={20} className="text-orange-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-orange-900 text-sm">Có {needsRevisionJobs.length} yêu cầu cần sửa đổi!</h4>
            <p className="text-xs text-orange-700 mt-0.5">
              Moderator đã yêu cầu bạn sửa: {needsRevisionJobs.map(j => j.jobName).join(', ')}. Bấm vào đơn để xem chi tiết và gửi lại.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards — hide on history page */}
      {!isHistoryPage && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lab</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── History Page: full-width job list with search/filter ── */}
      {isHistoryPage ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('history')}</h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 w-56"
                />
              </div>
              <select
                value={historyFilter}
                onChange={e => setHistoryFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none"
              >
                <option value="all">Tất cả</option>
                <option value="Submitted">Đã gửi</option>
                <option value="Approved">Đã duyệt</option>
                <option value="Printing">Đang in</option>
                <option value="Done">Hoàn thành</option>
                <option value="Rejected">Từ chối</option>
                <option value="Cancelled">Đã hủy</option>
                <option value="Needs Revision">Cần sửa</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 size={24} className="animate-spin mr-2" />
                <span className="text-sm">{t('loadingData')}</span>
              </div>
            ) : (() => {
              const filtered = myJobs
                .filter(j => historyFilter === 'all' || j.status === historyFilter)
                .filter(j => !historySearch || j.jobName.toLowerCase().includes(historySearch.toLowerCase()) || j.id.toLowerCase().includes(historySearch.toLowerCase()));
              return filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <History size={40} strokeWidth={1} />
                  <p className="text-sm font-medium">Không có yêu cầu nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('printerName')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('materialType')}</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filtered.map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer" onClick={() => onSelectJob(job.id)}>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{job.jobName}</span>
                              <span className="text-[10px] text-slate-400 font-medium uppercase">{job.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-slate-600 dark:text-slate-300">{job.printerName || t('notAssigned')}</span>
                              <span className="text-[10px] text-slate-400">{job.slotTime || t('waitingApproval')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-sm text-slate-600 dark:text-slate-300">{job.materialType} ({job.color})</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusChip status={job.status as any} />
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); onSelectJob(job.id); }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                            >
                              <ArrowRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Jobs Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {role === Role.STUDENT ? t('myJobs') : t('allJobs')}
            </h3>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 size={24} className="animate-spin mr-2" />
                <span className="text-sm">{t('loadingData')}</span>
              </div>
            ) : myJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <FileText size={40} strokeWidth={1} />
                <p className="text-sm font-medium">{t('noJobs')}</p>
                <button
                  onClick={onNewBooking}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
                >
                  {t('newRequest')}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Job</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('printerName')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{t('materialType')}</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {myJobs.slice(0, 10).map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{job.jobName}</span>
                            <span className="text-[10px] text-slate-400 font-medium uppercase">{job.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-600 dark:text-slate-300">{job.printerName || t('notAssigned')}</span>
                            <span className="text-[10px] text-slate-400">{job.slotTime || t('waitingApproval')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-sm text-slate-600 dark:text-slate-300">{job.materialType} ({job.color})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusChip status={job.status as any} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onSelectJob(job.id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                          >
                            <ArrowRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl p-6 text-white shadow-lg shadow-amber-200 dark:shadow-amber-500/10 relative overflow-hidden">
            {/* Light mode background */}
            <div className="absolute inset-0 dark:hidden rounded-2xl" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }} />
            {/* Dark mode glassmorphism */}
            <div className="absolute inset-0 hidden dark:block rounded-2xl" style={{ background: 'rgba(217,119,6,0.12)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(251,191,36,0.25)' }} />
            {/* Glow orbs */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -mr-16 -mt-16 opacity-40 dark:opacity-20" style={{ background: '#f59e0b' }} />
            <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full blur-2xl -ml-8 -mb-8 opacity-30 dark:opacity-15" style={{ background: '#92400e' }} />
            <h3 className="text-lg font-bold mb-2 relative z-10">{t('readyToPrint')}</h3>
            <p className="text-amber-100 dark:text-amber-200 text-sm mb-6 relative z-10">{t('readyToPrintDesc')}</p>
            <button
              onClick={onNewBooking}
              className="w-full py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 relative z-10 bg-white text-amber-700 hover:bg-amber-50 dark:bg-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/30 dark:border dark:border-amber-400/40"
            >
              <Plus size={20} />
              {t('newRequest')}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">{t('quickActions')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onPageChange('booking')}
                className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 border border-transparent transition-all group"
              >
                <Plus className="text-slate-400 group-hover:text-blue-600 mb-2" size={20} />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-blue-600">{t('booking')}</span>
              </button>
              <button
                onClick={() => onPageChange('history')}
                className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 border border-transparent transition-all group"
              >
                <History className="text-slate-400 group-hover:text-blue-600 mb-2" size={20} />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-blue-600">{t('history')}</span>
              </button>
              <button
                onClick={() => onPageChange('chat')}
                className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 border border-transparent transition-all group"
              >
                <MessageCircle className="text-slate-400 group-hover:text-blue-600 mb-2" size={20} />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-blue-600">{t('chat')}</span>
              </button>
              <button
                onClick={() => onPageChange('pricing')}
                className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 border border-transparent transition-all group"
              >
                <CreditCard className="text-slate-400 group-hover:text-amber-600 mb-2" size={20} />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-amber-600">Bảng giá</span>
              </button>
            </div>
          </div>

          {/* Active job status tracker */}
          {myJobs.filter(j => !['Done', 'Cancelled', 'Rejected'].includes(j.status)).length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('statusTracking')}</h3>
              {myJobs.filter(j => !['Done', 'Cancelled', 'Rejected'].includes(j.status)).slice(0, 3).map(job => {
                const statusStep = ['Submitted', 'Approved', 'Scheduled', 'Printing'].indexOf(job.status);
                const statusIcon = job.status === 'Printing'
                  ? <Timer size={14} className="text-blue-500 animate-pulse" />
                  : job.status === 'Approved' || job.status === 'Scheduled'
                  ? <CheckCircle2 size={14} className="text-emerald-500" />
                  : <AlertCircle size={14} className="text-amber-500" />;
                return (
                  <div key={job.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[140px]">{job.jobName}</span>
                      <div className="flex items-center gap-1">
                        {statusIcon}
                        <StatusChip status={job.status as any} />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {['Submitted', 'Approved', 'Printing', 'Done'].map((s, idx) => (
                        <div
                          key={s}
                          className={cn(
                            'h-1 flex-1 rounded-full transition-all',
                            idx <= statusStep ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">{job.id} · {job.printerName || t('notAssigned')}</p>
                  </div>
                );
              })}
              <button
                onClick={() => onPageChange('history')}
                className="w-full text-xs text-blue-600 font-bold py-1 hover:underline text-center"
              >
                {t('viewAllHistory')}
              </button>
            </div>
          )}

          {stats && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('labStats')}</h3>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t('totalJobs')}:</span>
                <span className="font-bold text-slate-900 dark:text-white">{stats.totalJobs}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t('printing')}:</span>
                <span className="font-bold text-emerald-600">{stats.printing}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t('pendingApproval')}:</span>
                <span className="font-bold text-amber-600">{stats.pendingReview}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t('activeUsers')}:</span>
                <span className="font-bold text-slate-900 dark:text-white">{stats.totalUsers}</span>
              </div>
            </div>
          )}

          {/* Daily Chart (Admin/Mod only) */}
          {dailyStats.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Thống kê 7 ngày</h3>
              <div className="flex items-end gap-1.5 h-24">
                {dailyStats.map((day: any) => {
                  const total = day.approved + day.done + day.rejected + day.needsRevision;
                  const maxH = 80;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col justify-end gap-px" style={{ height: maxH }}>
                        {day.done > 0 && <div className="w-full rounded-sm bg-emerald-500" style={{ height: total ? `${(day.done/Math.max(...dailyStats.map((d:any)=>d.approved+d.done+d.rejected+d.needsRevision),1))*maxH}px` : '2px' }} title={`Hoàn thành: ${day.done}`} />}
                        {day.approved > 0 && <div className="w-full rounded-sm bg-indigo-400" style={{ height: total ? `${(day.approved/Math.max(...dailyStats.map((d:any)=>d.approved+d.done+d.rejected+d.needsRevision),1))*maxH}px` : '2px' }} title={`Duyệt: ${day.approved}`} />}
                        {day.rejected > 0 && <div className="w-full rounded-sm bg-red-400" style={{ height: `${Math.max(day.rejected * 8, 3)}px` }} title={`Từ chối: ${day.rejected}`} />}
                        {day.needsRevision > 0 && <div className="w-full rounded-sm bg-orange-400" style={{ height: `${Math.max(day.needsRevision * 8, 3)}px` }} title={`Cần sửa: ${day.needsRevision}`} />}
                        {total === 0 && <div className="w-full rounded-sm bg-slate-100 dark:bg-slate-800" style={{ height: '3px' }} />}
                      </div>
                      <span className="text-[9px] text-slate-400 font-medium">{day.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {[{c:'bg-emerald-500',l:'Hoàn thành'},{c:'bg-indigo-400',l:'Duyệt'},{c:'bg-red-400',l:'Từ chối'},{c:'bg-orange-400',l:'Cần sửa'}].map(({c,l}) => (
                  <div key={l} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${c}`} />
                    <span className="text-[10px] text-slate-500">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
