import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, RefreshCw, Loader2, User, ShieldCheck, Crown } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  jobId?: string;
  content: string;
  createdAt: string;
}

interface ChatPageProps {
  currentUser: any;
}

const ROLE_BADGE: Record<string, { label: string; color: string; icon: any }> = {
  Admin: { label: 'Admin', color: 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400', icon: Crown },
  Moderator: { label: 'Mod', color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400', icon: ShieldCheck },
  Student: { label: 'SV', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400', icon: User },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export const ChatPage: React.FC<ChatPageProps> = ({ currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState('');
  const [jobId, setJobId] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = async () => {
    try {
      const data = await api.getMessages();
      setMessages(data.slice().reverse());
    } catch {}
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
    } catch (err: any) {
      alert(err.message);
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
    <div className="mx-auto flex h-[calc(100dvh-120px)] max-w-4xl flex-col">
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
            <MessageCircle size={24} className="text-blue-600" />
            Cộng đồng & Nhắc đơn
          </h2>
          <p className="text-sm text-slate-500">Gửi tin nhắn, nhắc nhở phê duyệt, hoặc hỏi về trạng thái yêu cầu in.</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchMessages().finally(() => setLoading(false));
          }}
          className="self-start rounded-lg p-2 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
          title="Làm mới"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Loader2 size={24} className="mr-2 animate-spin" />
            <span>Đang tải tin nhắn...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <MessageCircle size={40} className="opacity-30" />
            <p className="text-sm">Chưa có tin nhắn nào. Hãy là người đầu tiên.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUser?.id;
            const badge = ROLE_BADGE[msg.userRole] || ROLE_BADGE.Student;
            const BadgeIcon = badge.icon;
            return (
              <div key={msg.id} className={cn('flex gap-3', isMe && 'flex-row-reverse')}>
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                    isMe
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  {msg.userName.charAt(0).toUpperCase()}
                </div>

                <div className={cn('max-w-[88%] space-y-1 sm:max-w-[75%]', isMe && 'flex flex-col items-end')}>
                  <div className={cn('flex flex-wrap items-center gap-2 text-xs', isMe && 'flex-row-reverse')}>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {isMe ? 'Bạn' : msg.userName}
                    </span>
                    <span className={cn('flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold', badge.color)}>
                      <BadgeIcon size={10} />
                      {badge.label}
                    </span>
                    {msg.jobId && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        #{msg.jobId}
                      </span>
                    )}
                    <span className="text-slate-400">{formatTime(msg.createdAt)}</span>
                  </div>

                  <div
                    className={cn(
                      'whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      isMe
                        ? 'rounded-tr-sm bg-blue-600 text-white'
                        : 'rounded-tl-sm bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
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

      <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <label className="whitespace-nowrap text-xs font-semibold text-slate-500">Nhắc đơn #</label>
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <option value="">-- Không gắn đơn --</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.id} – {j.jobName} ({j.status})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            onClick={handleSend}
            disabled={sending || !content.trim()}
            className="flex min-h-11 items-center justify-center gap-2 self-stretch rounded-xl bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 sm:self-end"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};
