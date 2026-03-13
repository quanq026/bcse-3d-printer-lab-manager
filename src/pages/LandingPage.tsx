import React, { useState, useEffect } from 'react';
import { Printer, ShieldCheck, FileText, CheckCircle2, Loader2, AlertCircle, Globe, Eye, EyeOff, ArrowRight, MapPin, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useLang } from '../contexts/LanguageContext';

interface LandingPageProps {
  onLogin: (user: any) => void;
}

const VJU_REGEX = /@(st\.vju\.ac\.vn|vju\.ac\.vn)$/i;

// Floating decorative shapes
const FloatingShapes = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[
      { size: 120, top: '8%', left: '5%', delay: 0, opacity: 0.07 },
      { size: 80, top: '60%', left: '2%', delay: 1.5, opacity: 0.05 },
      { size: 60, top: '30%', right: '8%', delay: 0.8, opacity: 0.06 },
      { size: 100, bottom: '10%', right: '3%', delay: 2, opacity: 0.05 },
      { size: 40, top: '75%', left: '30%', delay: 1, opacity: 0.08 },
    ].map((s, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full border-2 border-amber-400"
        style={{ width: s.size, height: s.size, top: s.top, left: (s as any).left, right: (s as any).right, bottom: (s as any).bottom, opacity: s.opacity }}
        animate={{ y: [0, -18, 0], rotate: [0, 15, 0] }}
        transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
      />
    ))}
    {/* Grid dots pattern */}
    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #d97706 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: 0.08 }} />
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const { lang, setLang, t } = useLang();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // Register fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phone, setPhone] = useState('');
  const [supervisor, setSupervisor] = useState('');


  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => { });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.login(loginEmail, loginPass);
      localStorage.setItem('lab_token', res.token);
      onLogin(res.user);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!VJU_REGEX.test(email)) { setError(t('invalidEmail')); return; }
    if (password !== confirmPass) { setError('Mật khẩu xác nhận không khớp'); return; }

    setLoading(true);
    try {
      await api.register({ email, password, fullName, studentId, phone, supervisor });
      setSuccess(t('registerSuccess'));
      setTab('login');
      setError(''); setSuccess('');
      setLoginEmail(email);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };


  const guideUrl = settings.guide_url;
  const contactEmail = settings.contact_email;
  const contactFb = settings.contact_facebook;
  const contactZalo = settings.contact_zalo;

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#fdf8f0' }}>
      {/* ── Left: Hero ─────────────────────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col justify-between p-6 sm:p-10 md:p-14 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 60%, #1c1917 100%)' }}>
        <FloatingShapes />

        {/* Top logo */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-10 sm:mb-14"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl"
              style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
              <Printer size={26} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white" style={{ fontFamily: 'Georgia, serif' }}>
                BCSE 3D Lab
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin size={10} className="text-amber-400" />
                <p className="text-xs font-medium tracking-wider" style={{ color: '#d97706' }}>
                  VJU MỸ ĐÌNH · VJU HÒA LẠC
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: '#d97706' }}>
              Hệ thống quản lý
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-6 text-white" style={{ fontFamily: 'Georgia, serif' }}>
              {t('heroTitle')} <br />
              <span style={{ color: '#d97706' }}>{t('heroHighlight')}</span>
            </h2>
            <p className="text-sm sm:text-base leading-relaxed max-w-md" style={{ color: '#a8a29e' }}>
              {t('heroDesc')}
            </p>
          </motion.div>

          {/* Campus badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-3 mt-10"
          >
            {['VJU Mỹ Đình', 'VJU Hòa Lạc'].map((campus, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full border"
                style={{ borderColor: '#44403c', background: '#292524' }}>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-white">{campus}</span>
              </div>
            ))}
          </motion.div>

          {/* Feature list */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 space-y-5"
          >
            {[
              { icon: FileText, title: t('featurePolicy'), desc: t('featurePolicyDesc') },
              { icon: Layers, title: t('featureMaterial'), desc: t('featureMaterialDesc') },
              { icon: ShieldCheck, title: t('featureSafe'), desc: t('featureSafeDesc') },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="mt-0.5 p-1.5 rounded-lg shrink-0" style={{ background: '#292524', border: '1px solid #44403c' }}>
                  <Icon size={16} style={{ color: '#d97706' }} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{title}</h4>
                  <p className="text-xs leading-relaxed mt-0.5" style={{ color: '#78716c' }}>{desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Footer links */}
        <div className="relative z-10 flex items-center gap-5 text-xs flex-wrap mt-8" style={{ color: '#57534e' }}>
          <span>{t('copyright')}</span>
          {guideUrl
            ? <a href={guideUrl} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">{t('userGuide')}</a>
            : <span className="opacity-40">{t('userGuide')}</span>
          }
          {(contactEmail || contactFb || contactZalo) ? (
            <a
              href={contactFb || (contactEmail ? `mailto:${contactEmail}` : '#')}
              target="_blank" rel="noopener noreferrer"
              className="hover:text-amber-400 transition-colors"
            >
              {t('contactSupport')}
            </a>
          ) : (
            <span className="opacity-40">{t('contactSupport')}</span>
          )}
        </div>
      </div>

      {/* ── Right: Auth form ────────────────────────────────────────────── */}
      <div className="w-full md:w-[480px] flex flex-col justify-center p-5 sm:p-8 md:p-12 relative border-t md:border-t-0 md:border-l"
        style={{ background: '#fffbf5', borderColor: '#e7e0d6' }}>

        {/* Top bar: Lang toggle */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3">
          <button
            onClick={() => setLang(lang === 'VN' ? 'JP' : 'VN')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:bg-amber-50"
            style={{ color: '#78716c', border: '1px solid #e7e0d6' }}
          >
            <Globe size={13} />
            {lang === 'VN' ? '🇻🇳 Tiếng Việt' : '🇯🇵 日本語'}
          </button>
        </div>

        <div className="max-w-md mx-auto w-full pt-10 sm:pt-0">
          {/* Header */}
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="w-10 h-1 rounded-full bg-amber-500 mb-4" />
            <h3 className="text-2xl font-black mb-1.5" style={{ color: '#1c1917', fontFamily: 'Georgia, serif' }}>
              {tab === 'login' ? t('welcome') : t('registerTitle')}
            </h3>
            <p className="text-sm" style={{ color: '#78716c' }}>
              {tab === 'login' ? t('loginSubtitle') : t('registerSubtitle')}
            </p>
          </motion.div>

          {/* Tab switcher */}
          <div className="flex p-1 rounded-xl mb-7" style={{ background: '#f0e9de' }}>
            {(['login', 'register'] as const).map(t2 => (
              <button
                key={t2}
                onClick={() => { setTab(t2); setError(''); setSuccess(''); }}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                  tab === t2 ? "bg-white shadow-sm" : "hover:text-stone-700"
                )}
                style={{ color: tab === t2 ? '#1c1917' : '#78716c' }}
              >
                {t2 === 'login' ? t('login') : t('register')}
              </button>
            ))}
          </div>

          {/* Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 p-3 rounded-xl flex items-start gap-2 text-sm"
                style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 p-3 rounded-xl flex items-start gap-2 text-sm"
                style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Login form ── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label={t('email')}>
                <input type="email" placeholder={t('emailPlaceholder')} required
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  className="auth-input" />
              </Field>
              <Field label={t('password')}>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} placeholder="••••••••" required
                    value={loginPass} onChange={e => setLoginPass(e.target.value)}
                    className="auth-input pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#a8a29e' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <SubmitBtn loading={loading} label={t('login')} />
            </form>
          )}

          {/* ── Register form ── */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t('fullName')}>
                  <input type="text" placeholder="Nguyễn Văn A" required value={fullName} onChange={e => setFullName(e.target.value)} className="auth-input" />
                </Field>
                <Field label={t('studentId')}>
                  <input type="text" placeholder="2201xxxx" value={studentId} onChange={e => setStudentId(e.target.value)} className="auth-input" />
                </Field>
              </div>
              <Field label={t('phone')}>
                <input type="tel" placeholder="09xxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} className="auth-input" />
              </Field>
              <Field label={t('supervisor')}>
                <input type="text" placeholder="Dr. Nguyễn Văn B" value={supervisor} onChange={e => setSupervisor(e.target.value)} className="auth-input" />
              </Field>
              <Field label={t('email')} hint={t('emailHint')}>
                <input type="email" placeholder={t('emailPlaceholder')} required value={email} onChange={e => setEmail(e.target.value)}
                  className="auth-input"
                  style={{ borderColor: email && !VJU_REGEX.test(email) ? '#fca5a5' : '' }} />
                {email && !VJU_REGEX.test(email) && (
                  <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{t('invalidEmail')}</p>
                )}
              </Field>

              <Field label={t('password')}>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} className="auth-input pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#a8a29e' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field label="Xác nhận mật khẩu">
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••" required value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                  className="auth-input"
                  style={{ borderColor: confirmPass && confirmPass !== password ? '#fca5a5' : '' }} />
                {confirmPass && confirmPass !== password && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>Mật khẩu không khớp</p>}
              </Field>

              <SubmitBtn loading={loading} label={t('register')} disabled={(!!email && !VJU_REGEX.test(email)) || (!!confirmPass && confirmPass !== password)} />
            </form>
          )}
        </div>
      </div>



      {/* Inline styles for auth inputs */}
      <style>{`
        .auth-input {
          width: 100%;
          padding: 10px 16px;
          background: #fffbf5;
          border: 1px solid #e7e0d6;
          border-radius: 10px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          color: #1c1917;
        }
        .auth-input:focus {
          border-color: #d97706;
          box-shadow: 0 0 0 3px rgba(217,119,6,0.12);
        }
        .auth-input::placeholder { color: #a8a29e; }
        .auth-input::-ms-reveal,
        .auth-input::-ms-clear {
          display: none;
        }
      `}</style>
    </div>
  );
};

// Small helper components
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#44403c' }}>{label}</label>
      {children}
      {hint && <p className="text-[11px]" style={{ color: '#a8a29e' }}>{hint}</p>}
    </div>
  );
}

function SubmitBtn({ loading, label, disabled = false }: { loading: boolean; label: string; disabled?: boolean }) {
  return (
    <button type="submit" disabled={loading || disabled}
      className="w-full py-3 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      style={{ background: disabled ? '#d6cfc4' : 'linear-gradient(135deg, #d97706, #b45309)', color: 'white', boxShadow: disabled ? 'none' : '0 4px 14px rgba(217,119,6,0.3)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
      {label}
    </button>
  );
}

