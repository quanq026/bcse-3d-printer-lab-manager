import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppIcon } from '../components/AppIcon';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useLang } from '../contexts/LanguageContext';
import { getUiText } from '../lib/uiText';
import type { User } from '../types';

interface LandingPageProps {
  onLogin: (user: User) => void;
}

const VJU_REGEX = /@(st\.vju\.ac\.vn|vju\.ac\.vn)$/i;

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const { lang, setLang, t } = useLang();
  const copy = getUiText(lang);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

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

  useEffect(() => {
    const authNotice = sessionStorage.getItem('lab_auth_notice');
    if (!authNotice) return;
    setTab('login');
    setSuccess(authNotice);
    sessionStorage.removeItem('lab_auth_notice');
  }, []);

  const heroFeatures = useMemo(
    () => [
      { icon: 'solar:document-text-bold', title: t('featurePolicy'), desc: t('featurePolicyDesc') },
      { icon: 'solar:layers-bold', title: t('featureMaterial'), desc: t('featureMaterialDesc') },
      { icon: 'solar:shield-keyhole-bold', title: t('featureSafe'), desc: t('featureSafeDesc') },
    ],
    [t]
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await api.login(loginEmail, loginPass);
      localStorage.setItem('lab_token', res.token);
      onLogin(res.user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : copy.landing.genericError);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!VJU_REGEX.test(email)) {
      setError(t('invalidEmail'));
      return;
    }

    if (password !== confirmPass) {
      setError(copy.landing.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      await api.register({ email, password, fullName, studentId, phone, supervisor });
      setTab('login');
      setLoginEmail(email);
      setPassword('');
      setConfirmPass('');
      setSuccess(t('registerSuccess'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : copy.landing.genericError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="landing-shell">
      <div className="landing-noise" aria-hidden="true" />
      <div className="landing-grid" aria-hidden="true" />

      {/* Background blobs — pure CSS for performance */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="landing-blob landing-blob--a" />
        <div className="landing-blob landing-blob--b" />
      </div>

      <section className="landing-hero">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="landing-masthead"
        >
          <div className="landing-brand-mark p-1 flex items-center justify-center">
            <img src="/images/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="landing-brand-title">BCSE 3D Lab</h1>
            <p className="landing-brand-subtitle">
              <AppIcon icon="solar:map-point-bold" size={12} />
              <span>VJU My Dinh . VJU Hoa Lac</span>
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="landing-editorial"
        >
          <div className="landing-section-marker">// ACCESS PORTAL</div>
          <p className="landing-kicker">SMART 3D PRINT REQUEST PLATFORM</p>
          <h2 className="landing-display">
            <motion.span
              style={{ display: 'block' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="landing-display-line"
            >
              {t('heroTitle')}
            </motion.span>
            <motion.span
              style={{ display: 'block' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="landing-display-line landing-display-accent"
            >
              {t('heroHighlight')}
            </motion.span>
          </h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="landing-copy"
          >
            {t('heroDesc')}
          </motion.p>
        </motion.div>

        <div className="landing-feature-list">
          {heroFeatures.map(({ icon, title, desc }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="landing-feature-card app-hover-box"
            >
              <div className="landing-feature-visual">
                <div className="landing-feature-index">{String(index + 1).padStart(2, '0')}</div>
                <div className="landing-feature-icon">
                  <AppIcon icon={icon} size={18} />
                </div>
              </div>
              <div className="landing-feature-body">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="landing-footer-meta flex items-center justify-between w-full"
        >
          <span>{t('copyright')}</span>
          <div className="flex items-center gap-3 text-[var(--landing-amber)]">
            <span className="text-[var(--landing-muted)] mr-2">{t('contactSupport')}:</span>
            {settings.contact_facebook && (
              <a href={settings.contact_facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200" title="Facebook">
                <AppIcon icon="solar:chat-square-like-bold-duotone" size={22} />
              </a>
            )}
            {settings.contact_zalo && (
              <a href={`https://zalo.me/${settings.contact_zalo.replace(/[^\d+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200" title="Zalo">
                <AppIcon icon="solar:chat-round-dots-bold-duotone" size={22} />
              </a>
            )}
            {settings.contact_email && (
              <a href={`mailto:${settings.contact_email}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200" title="Email">
                <AppIcon icon="solar:letter-bold-duotone" size={22} />
              </a>
            )}
            {settings.guide_url && (
              <a href={settings.guide_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200" title="Guide">
                <AppIcon icon="solar:notebook-bookmark-bold-duotone" size={22} />
              </a>
            )}
          </div>
        </motion.div>
      </section>

      <section className="landing-auth-wrap">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="landing-auth-panel"
        >
          <div className="landing-auth-topbar">
            <div className="relative flex p-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl">
              {(['VN', 'EN', 'JP'] as const).map((l) => {
                const isActive = lang === l;
                return (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn(
                      'relative z-10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors duration-300',
                      isActive ? 'text-[var(--landing-bg)]' : 'text-white/40 hover:text-white/70'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="lang-active"
                        className="absolute inset-0 bg-[var(--landing-amber)] rounded-lg"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-20">{l}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="landing-auth-header">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <h2 id="auth-title" className="landing-auth-title">
                {tab === 'login' ? t('welcome') : t('registerTitle')}
              </h2>
              <p className="landing-auth-subtitle">
                {tab === 'login' ? t('loginSubtitle') : t('registerSubtitle')}
              </p>
            </motion.div>
          </div>

          <div className="landing-auth-tabs" role="tablist" aria-labelledby="auth-title">
            {(['login', 'register'] as const).map((tabItem) => (
              <button
                key={tabItem}
                type="button"
                role="tab"
                aria-selected={tab === tabItem}
                onClick={() => {
                  setTab(tabItem);
                  setError('');
                  setSuccess('');
                }}
                className={cn('landing-auth-tab', tab === tabItem && 'is-active')}
              >
                <span className="relative z-10">{tabItem === 'login' ? t('login') : t('register')}</span>
                {tab === tabItem && (
                  <motion.div
                    layoutId="auth-tab-active"
                    className="absolute inset-0 z-0 bg-white shadow-sm"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="landing-auth-alert is-error"
                role="alert"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="landing-auth-alert is-success"
                role="status"
              >
                <CheckCircle2 size={16} />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22 }}
          >
            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="landing-auth-form">
                  <Field label={t('email')}>
                    <input
                      type="email"
                      name="loginEmail"
                      placeholder={t('emailPlaceholder')}
                      autoComplete="username"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="landing-input"
                    />
                  </Field>

                  <Field label={t('password')}>
                    <div className="landing-password-field">
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        name="loginPassword"
                        autoComplete="current-password"
                        required
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                        className="landing-input landing-input-password"
                      />
                      <button
                        type="button"
                        className="landing-password-toggle"
                        onClick={() => setShowPass((prev) => !prev)}
                        aria-label={showPass ? copy.landing.hidePassword : copy.landing.showPassword}
                        title={showPass ? copy.landing.hidePassword : copy.landing.showPassword}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>

                  <SubmitBtn loading={loading} label={t('login')} />
              </form>
            ) : (
              <form onSubmit={handleRegister} className="landing-auth-form">
                  <div className="landing-form-grid">
                    <Field label={t('fullName')}>
                      <input
                        type="text"
                        name="fullName"
                        placeholder="Nguyen Van A"
                        autoComplete="name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="landing-input"
                      />
                    </Field>

                    <Field label={t('studentId')}>
                      <input
                        type="text"
                        name="studentId"
                        placeholder="2201xxxx"
                        autoComplete="off"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="landing-input"
                      />
                    </Field>
                  </div>

                  <Field label={t('phone')}>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="09xxxxxxxx"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="landing-input"
                    />
                  </Field>

                  <Field label={t('supervisor')}>
                    <input
                      type="text"
                      name="supervisor"
                      placeholder="Dr. Nguyen Van B"
                      autoComplete="organization-title"
                      value={supervisor}
                      onChange={(e) => setSupervisor(e.target.value)}
                      className="landing-input"
                    />
                  </Field>

                  <Field label={t('email')} hint={t('emailHint')}>
                    <input
                      type="email"
                      name="registerEmail"
                      placeholder={t('emailPlaceholder')}
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={cn('landing-input', email && !VJU_REGEX.test(email) && 'is-invalid')}
                    />
                    {email && !VJU_REGEX.test(email) && (
                      <p className="landing-field-error">{t('invalidEmail')}</p>
                    )}
                  </Field>

                  <Field label={t('password')}>
                    <div className="landing-password-field">
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="••••••••"
                        name="newPassword"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="landing-input landing-input-password"
                      />
                      <button
                        type="button"
                        className="landing-password-toggle"
                        onClick={() => setShowPass((prev) => !prev)}
                        aria-label={showPass ? copy.landing.hidePassword : copy.landing.showPassword}
                        title={showPass ? copy.landing.showPassword : copy.landing.showPassword}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>

                  <Field label={copy.landing.confirmPassword}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      name="confirmPassword"
                      autoComplete="new-password"
                      required
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      className={cn('landing-input', confirmPass && confirmPass !== password && 'is-invalid')}
                    />
                    {confirmPass && confirmPass !== password && (
                      <p className="landing-field-error">{copy.landing.passwordNotMatch}</p>
                    )}
                  </Field>

                  <SubmitBtn
                    loading={loading}
                    label={t('register')}
                    disabled={(!!email && !VJU_REGEX.test(email)) || (!!confirmPass && confirmPass !== password)}
                  />
              </form>
            )}
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="landing-field">
      <span className="landing-field-label">{label}</span>
      {children}
      {hint && <span className="landing-field-hint">{hint}</span>}
    </label>
  );
}

function SubmitBtn({ loading, label, disabled = false }: { loading: boolean; label: string; disabled?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, x: 5 }}
      whileTap={{ scale: 0.98 }}
      type="submit"
      disabled={loading || disabled}
      className="landing-submit"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
      <span>{label}</span>
    </motion.button>
  );
}
