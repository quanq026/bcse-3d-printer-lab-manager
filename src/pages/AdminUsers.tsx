import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { AppToast } from '../components/feedback/AppToast';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { useToast } from '../components/feedback/useToast';
import { AppIcon } from '../components/AppIcon';
import { useLang } from '../contexts/LanguageContext';
import { api } from '../lib/api';
import { fillText, getUiText } from '../lib/uiText';
import { cn } from '../lib/utils';
import { Role, type AdminUser } from '../types';

const ROLE_OPTIONS: Role[] = [Role.STUDENT, Role.MODERATOR, Role.ADMIN];

function formatDate(value?: string, locale = 'vi-VN', fallback = 'No date') {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

function formatDateTime(value?: string | null, locale = 'vi-VN', fallback = 'Permanent') {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export const AdminUsers: React.FC = () => {
  const { lang } = useLang();
  const copy = getUiText(lang).adminUsers;
  const locale = lang === 'JP' ? 'en-US' : 'vi-VN';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'warnings'>('users');
  const [banModal, setBanModal] = useState<{ user: AdminUser; type: 'temporary' | 'permanent' } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('7');
  const { toast, dismissToast, showError, showSuccess } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const doUpdate = async (id: string, data: Partial<AdminUser>) => {
    setActionLoading(id);
    try {
      await api.updateUser(id, data);
      await fetchUsers();
      showSuccess(copy.approve);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(null);
    }
  };

  const doDelete = async (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setActionLoading(id);
    try {
      await api.deleteUser(id);
      setDeleteTarget(null);
      await fetchUsers();
      showSuccess(copy.delete);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(null);
    }
  };

  const doBan = async () => {
    if (!banModal || !banReason.trim()) return;
    const { user, type } = banModal;
    const banUntil = type === 'temporary'
      ? new Date(Date.now() + Number.parseInt(banDays, 10) * 86400000).toISOString()
      : undefined;

    setActionLoading(user.id);
    try {
      await api.updateUser(user.id, {
        status: 'suspended',
        banReason: banReason.trim(),
        banUntil,
      });
      setBanModal(null);
      setBanReason('');
      await fetchUsers();
      showSuccess(copy.suspend);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(null);
    }
  };

  const doUnban = async (id: string) => {
    setActionLoading(id);
    try {
      await api.updateUser(id, { status: 'active', banReason: '', banUntil: '' });
      await fetchUsers();
      showSuccess(copy.restore);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(() => users.filter((user) => {
    const matchSearch = !search
      || user.fullName?.toLowerCase().includes(search.toLowerCase())
      || user.email?.toLowerCase().includes(search.toLowerCase())
      || user.studentId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchSearch && matchStatus;
  }), [filterStatus, search, users]);

  const pendingCount = users.filter((user) => user.status === 'pending').length;
  const suspendedUsers = users.filter((user) => user.status === 'suspended');
  const activeCount = users.filter((user) => user.status === 'active').length;
  const staffCount = users.filter((user) => user.role === 'Admin' || user.role === 'Moderator').length;

  const heroStats = [
    {
      label: copy.stats.total.label,
      value: `${users.length}`,
      note: copy.stats.total.note,
      icon: 'solar:users-group-rounded-bold-duotone',
      accent: 'text-sky-700 bg-sky-100/80 dark:text-sky-100 dark:bg-sky-300/10',
    },
    {
      label: copy.stats.active.label,
      value: `${activeCount}`,
      note: copy.stats.active.note,
      icon: 'solar:shield-check-bold-duotone',
      accent: 'text-emerald-700 bg-emerald-100/80 dark:text-emerald-100 dark:bg-emerald-300/10',
    },
    {
      label: copy.stats.pending.label,
      value: `${pendingCount}`,
      note: copy.stats.pending.note,
      icon: 'solar:clock-circle-bold-duotone',
      accent: 'text-amber-700 bg-amber-100/80 dark:text-amber-100 dark:bg-amber-300/10',
    },
    {
      label: copy.stats.staff.label,
      value: `${staffCount}`,
      note: copy.stats.staff.note,
      icon: 'solar:user-id-bold-duotone',
      accent: 'text-[var(--landing-accent)] bg-[rgba(239,125,87,0.12)] dark:text-[#ffd7cc] dark:bg-[rgba(239,125,87,0.12)]',
    },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:border-emerald-400/20',
      pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:border-amber-400/20',
      suspended: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-400/10 dark:text-red-200 dark:border-red-400/20',
    };
    return map[status] || 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/6 dark:text-slate-200 dark:border-white/10';
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      Admin: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-400/10 dark:text-violet-200 dark:border-violet-400/20',
      Moderator: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-400/10 dark:text-sky-200 dark:border-sky-400/20',
      Student: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/6 dark:text-slate-200 dark:border-white/10',
    };
    return map[role] || 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/6 dark:text-slate-200 dark:border-white/10';
  };

  const resolveUserStatus = (status?: string | null) => status || 'pending';

  const renderActions = (user: AdminUser, compact = false) => {
    const userStatus = resolveUserStatus(user.status);

    if (actionLoading === user.id) {
      return <Loader2 size={16} className="animate-spin text-slate-400" />;
    }

    const buttonClass = compact
      ? 'min-h-[38px] px-3 text-[11px]'
      : 'h-10 w-10';

    return (
      <>
        {userStatus === 'pending' && (
          <button
            onClick={() => doUpdate(user.id, { status: 'active' })}
            className={cn(
              'rounded-2xl border border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200',
              buttonClass,
              compact ? 'font-bold' : 'inline-flex items-center justify-center'
            )}
            title={copy.approve}
          >
            {compact ? copy.approve : <CheckCircle2 size={17} />}
          </button>
        )}
        {userStatus === 'active' && (
          <button
            onClick={() => {
              setBanModal({ user, type: 'temporary' });
              setBanReason('');
              setBanDays('7');
            }}
            className={cn(
              'rounded-2xl border border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200',
              buttonClass,
              compact ? 'font-bold' : 'inline-flex items-center justify-center'
            )}
            title={copy.suspend}
          >
            {compact ? copy.suspend : <XCircle size={17} />}
          </button>
        )}
        {userStatus === 'suspended' && (
          <button
            onClick={() => doUnban(user.id)}
            className={cn(
              'rounded-2xl border border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200',
              buttonClass,
              compact ? 'font-bold' : 'inline-flex items-center justify-center'
            )}
            title={copy.restore}
          >
            {compact ? copy.restore : <Shield size={17} />}
          </button>
        )}
        <button
          onClick={() => doDelete(user.id, user.fullName)}
          className={cn(
            'rounded-2xl border border-red-200 bg-red-100 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200',
            buttonClass,
            compact ? 'font-bold' : 'inline-flex items-center justify-center'
          )}
          title={copy.delete}
        >
          {compact ? copy.delete : <Trash2 size={16} />}
        </button>
      </>
    );
  };

  return (
    <div className="app-admin-squared app-admin-compact space-y-6">
      <AppToast toast={toast} onClose={dismissToast} />
      <ConfirmDialog
        open={!!deleteTarget}
        title={copy.delete}
        body={deleteTarget ? fillText(copy.deleteConfirm, { name: deleteTarget.name }) : ''}
        confirmLabel={copy.delete}
        cancelLabel="Cancel"
        destructive
        onConfirm={() => { void confirmDelete(); }}
        onCancel={() => setDeleteTarget(null)}
      />
      <section className="app-panel app-hover-box relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <p className="app-eyebrow">{copy.heroEyebrow}</p>
              <h1 className="app-display-sm max-w-4xl text-slate-900 dark:text-[var(--landing-text)]">{copy.heroTitle}</h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.heroDesc}</p>
            </div>
            <div className="app-tab-strip rounded-[26px]">
              {([
                ['users', copy.tabs.users],
                ['warnings', copy.tabs.warnings],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn('app-tab-button rounded-[20px]', activeTab === tab && 'is-active')}
                >
                  {label}
                  {tab === 'warnings' && suspendedUsers.length > 0 ? ` (${suspendedUsers.length})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      {activeTab === 'warnings' && (
        <div className="space-y-4">
          <section className="app-panel-soft rounded-[28px] border border-red-200/70 px-5 py-4 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/8 dark:text-red-200 sm:px-6">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-[0.24em]">{copy.riskEyebrow}</p>
                <p>{fillText(copy.riskCount, { count: suspendedUsers.length })}</p>
              </div>
            </div>
          </section>

          {suspendedUsers.length === 0 ? (
            <section className="app-panel rounded-[30px]">
              <div className="app-empty-state">
                <Shield size={42} strokeWidth={1.4} />
                <p className="text-sm font-semibold">{copy.noSuspended}</p>
                <p className="max-w-md text-xs leading-6">{copy.noSuspendedNote}</p>
              </div>
            </section>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {suspendedUsers.map((user) => (
                <section
                  key={user.id}
                  className="app-panel app-hover-box rounded-[30px] border border-red-200/70 px-5 py-5 dark:border-red-400/20 sm:px-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-200">
                        <Ban size={18} />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div>
                          <p className="text-base font-black text-slate-900 dark:text-[var(--landing-text)]">{user.fullName}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-[var(--landing-muted)]">{user.email}{user.studentId ? ` / ${user.studentId}` : ''}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]', roleBadge(user.role))}>
                            {copy.roleLabels[user.role as keyof typeof copy.roleLabels] || user.role}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
                            {user.banUntil ? copy.temporaryHold : copy.permanentHold}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => doUnban(user.id)}
                      className="app-secondary-button inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-bold"
                    >
                      {actionLoading === user.id ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                      {copy.restoreAccess}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-[rgba(30,23,19,0.08)] bg-white/55 p-4 dark:border-white/8 dark:bg-white/4">
                      <p className="app-overline">{copy.blockReason}</p>
                      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{user.banReason || copy.noReason}</p>
                    </div>
                    <div className="rounded-[22px] border border-[rgba(30,23,19,0.08)] bg-white/55 p-4 dark:border-white/8 dark:bg-white/4">
                      <p className="app-overline">{copy.restrictionWindow}</p>
                      <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{formatDateTime(user.banUntil, locale, copy.permanent)}</p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-[var(--landing-muted)]">{copy.restrictionNote}</p>
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          {pendingCount > 0 && (
            <section className="app-panel-soft rounded-[28px] border border-amber-200/70 px-5 py-4 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <UserCheck size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em]">{copy.approvalEyebrow}</p>
                    <p className="mt-1">{fillText(copy.approvalCount, { count: pendingCount })}</p>
                  </div>
                </div>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className="app-secondary-button inline-flex min-h-[42px] items-center justify-center rounded-[16px] px-4 text-xs font-bold uppercase tracking-[0.16em]"
                >
                  {copy.filterPending}
                </button>
              </div>
            </section>
          )}

          <section className="app-panel app-hover-box overflow-hidden rounded-[32px]">
            <div className="flex flex-col gap-4 px-5 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="app-eyebrow">{copy.boardEyebrow}</p>
                <h2 className="text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{copy.boardTitle}</h2>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.boardDesc}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="app-inline-pill rounded-full">{fillText(copy.visibleCount, { count: filtered.length })}</span>
                <span className="app-inline-pill rounded-full">{fillText(copy.suspendedCount, { count: suspendedUsers.length })}</span>
              </div>
            </div>
            <div className="app-toolbar-shell grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder={copy.searchPlaceholder}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="app-control app-search-input rounded-[18px] pr-4"
                  />
                </label>
                <select
                  value={filterStatus}
                  onChange={(event) => setFilterStatus(event.target.value)}
                  className="app-control rounded-[18px]"
                >
                  <option value="all">{copy.allStatuses}</option>
                  <option value="active">{copy.statusLabels.active}</option>
                  <option value="pending">{copy.statusLabels.pending}</option>
                  <option value="suspended">{copy.statusLabels.suspended}</option>
                </select>
              </div>
              <button
                onClick={fetchUsers}
                className="app-secondary-button inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-bold"
              >
                <RefreshCw size={16} />
                {copy.refresh}
              </button>
            </div>

            {loading ? (
              <div className="app-empty-state">
                <Loader2 size={28} className="animate-spin" />
                <p className="text-sm font-semibold">{copy.loading}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="app-empty-state">
                <Users size={40} strokeWidth={1.4} />
                <p className="text-sm font-semibold">{copy.noMatch}</p>
                <p className="max-w-md text-xs leading-6">{copy.noMatchNote}</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 p-4 md:hidden">
                  {filtered.map((user) => (
                    <article key={user.id} className="app-panel-soft app-hover-box rounded-[26px] p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
                          {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-black text-slate-900 dark:text-[var(--landing-text)]">{user.fullName}</p>
                              <p className="mt-1 text-[11px] text-slate-500 dark:text-[var(--landing-muted)]">{user.studentId || copy.noStudentId}</p>
                            </div>
                            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]', statusBadge(resolveUserStatus(user.status)))}>
                              {copy.statusLabels[resolveUserStatus(user.status) as keyof typeof copy.statusLabels] || resolveUserStatus(user.status)}
                            </span>
                          </div>
                          <div className="mt-4 grid gap-2 text-xs text-slate-500 dark:text-[var(--landing-muted)]">
                            <div className="flex items-center gap-2"><Mail size={12} /> <span className="truncate">{user.email}</span></div>
                            {user.phone && <div className="flex items-center gap-2"><Phone size={12} /> <span>{user.phone}</span></div>}
                            <div className="flex items-center gap-2"><Calendar size={12} /> <span>{formatDate(user.createdAt, locale, copy.noDate)}</span></div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <select
                          value={user.role}
                          disabled={actionLoading === user.id}
                          onChange={(event) => doUpdate(user.id, { role: event.target.value as Role })}
                          className={cn('h-11 rounded-[16px] border px-3 text-xs font-bold outline-none', roleBadge(user.role))}
                        >
                          {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{copy.roleLabels[role as keyof typeof copy.roleLabels] || role}</option>)}
                        </select>
                        <div className="flex flex-wrap gap-2">{renderActions(user, true)}</div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="app-table min-w-full text-left">
                    <thead>
                      <tr>
                        <th>{copy.table.user}</th>
                        <th>{copy.table.contact}</th>
                        <th>{copy.table.joined}</th>
                        <th>{copy.table.role}</th>
                        <th>{copy.table.status}</th>
                        <th className="text-right">{copy.table.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
                                {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900 dark:text-[var(--landing-text)]">{user.fullName}</p>
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-[var(--landing-muted)]">{user.studentId || copy.noStudentId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="grid gap-2 text-xs text-slate-500 dark:text-[var(--landing-muted)]">
                              <div className="flex items-center gap-2"><Mail size={12} /> <span>{user.email}</span></div>
                              {user.phone && <div className="flex items-center gap-2"><Phone size={12} /> <span>{user.phone}</span></div>}
                            </div>
                          </td>
                          <td className="px-6 py-5 text-xs font-semibold text-slate-500 dark:text-[var(--landing-muted)]">{formatDate(user.createdAt, locale, copy.noDate)}</td>
                          <td className="px-6 py-5">
                            <select
                              value={user.role}
                              disabled={actionLoading === user.id}
                              onChange={(event) => doUpdate(user.id, { role: event.target.value as Role })}
                              className={cn('h-11 rounded-[16px] border px-3 text-xs font-bold outline-none', roleBadge(user.role))}
                            >
                              {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{copy.roleLabels[role as keyof typeof copy.roleLabels] || role}</option>)}
                            </select>
                          </td>
                          <td className="px-6 py-5">
                            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]', statusBadge(resolveUserStatus(user.status)))}>
                              {copy.statusLabels[resolveUserStatus(user.status) as keyof typeof copy.statusLabels] || resolveUserStatus(user.status)}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-2">{renderActions(user)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="app-panel app-hover-box w-full max-w-xl overflow-hidden rounded-[32px]">
            <div className="border-b border-[rgba(30,23,19,0.08)] px-5 py-5 dark:border-white/8 sm:px-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-200">
                  <Ban size={18} />
                </div>
                <div>
                  <p className="app-eyebrow">{copy.modalEyebrow}</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{fillText(copy.modalTitle, { name: banModal.user.fullName })}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.modalDesc}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {(['temporary', 'permanent'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setBanModal((current) => (current ? { ...current, type } : null))}
                    className={cn(
                      'rounded-[22px] border px-4 py-4 text-left transition-all',
                      banModal.type === type
                        ? 'border-[rgba(239,125,87,0.28)] bg-[rgba(239,125,87,0.12)] text-slate-900 dark:border-[rgba(239,125,87,0.28)] dark:bg-[rgba(239,125,87,0.12)] dark:text-[var(--landing-text)]'
                        : 'border-[rgba(30,23,19,0.08)] bg-white/56 text-slate-600 dark:border-white/8 dark:bg-white/4 dark:text-[var(--landing-muted)]'
                    )}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em]">{type === 'temporary' ? copy.timedHold : copy.permanentHold}</p>
                    <p className="mt-2 text-sm leading-6">{type === 'temporary' ? copy.timedHoldDesc : copy.permanentHoldDesc}</p>
                  </button>
                ))}
              </div>

              {banModal.type === 'temporary' && (
                <div className="space-y-3">
                  <p className="app-overline">{copy.suspensionWindow}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {['3', '7', '14', '30'].map((days) => (
                      <button
                        key={days}
                        onClick={() => setBanDays(days)}
                        className={cn(
                          'rounded-[18px] border px-4 py-3 text-sm font-bold transition-all',
                          banDays === days
                            ? 'border-[rgba(239,125,87,0.28)] bg-[rgba(239,125,87,0.12)] text-slate-900 dark:border-[rgba(239,125,87,0.28)] dark:bg-[rgba(239,125,87,0.12)] dark:text-[var(--landing-text)]'
                            : 'border-[rgba(30,23,19,0.08)] bg-white/56 text-slate-600 dark:border-white/8 dark:bg-white/4 dark:text-[var(--landing-muted)]'
                        )}
                      >
                        {fillText(copy.days, { count: days })}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="app-overline">{copy.reason}</p>
                <textarea
                  rows={4}
                  placeholder={copy.reasonPlaceholder}
                  value={banReason}
                  onChange={(event) => setBanReason(event.target.value)}
                  className="app-control min-h-[120px] rounded-[22px] px-4 py-4 resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[rgba(30,23,19,0.08)] px-5 py-5 dark:border-white/8 sm:flex-row sm:px-6">
              <button
                onClick={() => setBanModal(null)}
                className="app-secondary-button inline-flex min-h-[50px] flex-1 items-center justify-center rounded-[18px] px-4 text-sm font-bold"
              >
                {copy.cancel}
              </button>
              <button
                onClick={doBan}
                disabled={!banReason.trim() || !!actionLoading}
                className="app-primary-button inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-[18px] px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                {copy.confirmSuspension}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

