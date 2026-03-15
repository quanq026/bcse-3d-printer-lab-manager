import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, RefreshCw, Loader2, User as UserIcon, ShieldCheck, Crown, Clock3, MessagesSquare } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { useLang } from '../contexts/LanguageContext';
import { getUiText, fillText } from '../lib/uiText';
import type { Message as ChatMessage, PrintJob, User as AppUser } from '../types';
import type { LucideIcon } from 'lucide-react';

interface ChatPageProps {
  currentUser: AppUser | null;
}

const ROLE_BADGE_STYLE: Record<string, { className: string; icon: LucideIcon }> = {
  Admin: {
    className: 'border border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300',
    icon: Crown,
  },
  Moderator: {
    className: 'border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-300',
    icon: ShieldCheck,
  },
  Student: {
    className: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300',
    icon: UserIcon,
  },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export const ChatPage: React.FC<ChatPageProps> = ({ currentUser }) => {
  const { lang } = useLang();
  const copy = getUiText(lang);
  const ROLE_LABELS: Record<string, string> = {
    Admin: copy.chat.roleBadgeAdmin,
    Moderator: copy.chat.roleBadgeModerator,
    Student: copy.chat.roleBadgeStudent,
  };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('');
  const [jobId, setJobId] = useState('');
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = async () => {
    try {
      const data = await api.getMessages();
      setMessages(data.slice().reverse());
    } catch { }
  };

  useEffect(() => {
    Promise.all([
      api.getJobs().catch(() => []),
      fetchMessages(),
    ]).then(([jobsData]) => {
      if (Array.isArray(jobsData)) setJobs(jobsData);
      setLoading(false);
    });

    intervalRef.current = setInterval(fetchMessages, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(content.trim(), jobId || undefined);
      setMessages((prev) => [...prev, msg]);
      setContent('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app-student-squared mx-auto flex h-[calc(100dvh-128px)] max-w-5xl flex-col gap-4 xl:max-h-[864px]">
      <section className="app-panel app-hover-box p-5 sm:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] xl:items-start">
          <div className="space-y-3">
            <p className="app-eyebrow">{copy.chat.eyebrow}</p>
            <div className="space-y-3">
              <h2 className="app-display-sm flex items-center gap-3 text-slate-900 dark:text-[var(--landing-text)]">
                <MessageCircle size={28} className="text-[var(--landing-accent-strong)]" />
                {copy.chat.channelTitle}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">
                {copy.chat.channelDesc}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="app-panel-soft border p-4">
              <p className="app-overline">{copy.chat.autoRefresh}</p>
              <p className="mt-2 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-[var(--landing-text)]">
                <Clock3 size={14} className="text-[var(--landing-accent-strong)]" />
                {copy.chat.every15s}
              </p>
            </div>
            <div className="app-panel-soft border p-4">
              <p className="app-overline">{copy.chat.messages}</p>
              <p className="mt-2 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-[var(--landing-text)]">
                <MessagesSquare size={14} className="text-[var(--landing-accent-strong)]" />
                {fillText(copy.chat.itemsVisible, { count: messages.length })}
              </p>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                fetchMessages().finally(() => setLoading(false));
              }}
              className="app-secondary-button flex min-h-[64px] items-center justify-center gap-2 px-4 font-bold uppercase tracking-[0.16em] text-slate-700 dark:text-[var(--landing-text)]"
              title={copy.chat.refresh}
            >
              <RefreshCw size={16} />
              {copy.chat.refresh}
            </button>
          </div>
        </div>
      </section>

      <div className="min-h-0 grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="app-panel app-hover-box flex min-h-0 flex-col overflow-hidden border">
          <div className="border-b border-[rgba(30,23,19,0.08)] px-5 py-4 dark:border-white/8">
            <p className="app-overline">{copy.chat.threadTitle}</p>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
            {loading ? (
              <div className="flex h-full items-center justify-center text-slate-500 dark:text-[var(--landing-muted)]">
                <Loader2 size={24} className="mr-2 animate-spin" />
                <span>{copy.chat.loadingMessages}</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400 dark:text-[var(--landing-muted)]">
                <MessageCircle size={40} className="opacity-30" />
                <p className="text-sm">{copy.chat.noMessages}</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.userId === currentUser?.id;
                const badge = ROLE_BADGE_STYLE[msg.userRole] || ROLE_BADGE_STYLE.Student;
                const BadgeIcon = badge.icon;

                return (
                  <div key={msg.id} className={cn('flex gap-3', isMe && 'flex-row-reverse')}>
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center border text-sm font-black',
                        isMe
                          ? 'border-[rgba(239,125,87,0.4)] bg-[rgba(239,125,87,0.14)] text-[var(--landing-accent-strong)]'
                          : 'border-[rgba(30,23,19,0.08)] bg-white/70 text-slate-600 dark:border-white/8 dark:bg-white/5 dark:text-[var(--landing-muted)]'
                      )}
                    >
                      {msg.userName.charAt(0).toUpperCase()}
                    </div>

                    <div className={cn('max-w-[88%] space-y-2 sm:max-w-[76%]', isMe && 'flex flex-col items-end')}>
                      <div className={cn('flex flex-wrap items-center gap-2 text-xs', isMe && 'flex-row-reverse')}>
                        <span className="font-semibold text-slate-700 dark:text-[var(--landing-text)]">
                          {isMe ? copy.chat.you : msg.userName}
                        </span>
                        <span className={cn('inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]', badge.className)}>
                          <BadgeIcon size={10} />
                          {ROLE_LABELS[msg.userRole] || ROLE_LABELS.Student}
                        </span>
                        {msg.jobId && (
                          <span className="border border-[rgba(239,125,87,0.2)] bg-[rgba(239,125,87,0.12)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--landing-accent-strong)]">
                            #{msg.jobId}
                          </span>
                        )}
                        <span className="text-slate-400 dark:text-white/38">{formatTime(msg.createdAt)}</span>
                      </div>

                      <div
                        className={cn(
                          'whitespace-pre-wrap break-words border px-4 py-3 text-sm leading-7',
                          isMe
                            ? 'border-[rgba(239,125,87,0.28)] bg-[rgba(239,125,87,0.1)] text-slate-900 dark:border-[rgba(239,125,87,0.24)] dark:bg-[rgba(239,125,87,0.12)] dark:text-[var(--landing-text)]'
                            : 'border-[rgba(30,23,19,0.08)] bg-white/60 text-slate-800 dark:border-white/8 dark:bg-white/4 dark:text-[var(--landing-text)]'
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
        </section>

        <aside className="app-panel app-hover-box flex flex-col gap-3 border p-4 sm:p-5">
          <div className="space-y-2">
            <p className="app-overline">{copy.chat.attachJob}</p>
            <label className="text-sm font-semibold text-slate-700 dark:text-[var(--landing-text)]">{copy.chat.jobCodeLabel}</label>
            <select
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="app-control"
            >
              <option value="">{copy.chat.noJobAttached}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.id} - {j.jobName} ({j.status})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="app-overline">{copy.chat.composeTitle}</p>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={7}
              placeholder={copy.chat.composePlaceholder}
              className="app-control min-h-[168px] resize-none py-3"
            />
          </div>

          <div className="space-y-3 pt-1">
            <button
              onClick={handleSend}
              disabled={sending || !content.trim()}
              className="app-primary-button flex w-full items-center justify-center gap-2 px-4 text-sm font-black uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {copy.chat.send}
            </button>
            <p className="text-xs leading-6 text-slate-500 dark:text-[var(--landing-muted)]">
              {copy.chat.sendNote}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
