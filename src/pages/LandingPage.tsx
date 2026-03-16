import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
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

  const heroFeatures = useMemo(
    () => [
      { icon: 'solar:document-text-bold', title: t('featurePolicy'), desc: t('featurePolicyDesc') },
      { icon: 'solar:layers-bold', title: t('featureMaterial'), desc: t('featureMaterialDesc') },
      { icon: 'solar:shield-keyhole-bold', title: t('featureSafe'), desc: t('featureSafeDesc') },
    ],
    [t]
  );

  const contactHref = settings.contact_facebook || (settings.contact_email ? `mailto:${settings.contact_email}` : settings.contact_zalo || '#');
  const guideUrl = settings.guide_url;

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

      <section className="landing-hero">
        <div className="landing-masthead landing-reveal">
          <div className="landing-brand-mark">
            <AppIcon icon="solar:printer-2-bold" size={26} />
          </div>
          <div>
            <h1 className="landing-brand-title">BCSE 3D Lab</h1>
            <p className="landing-brand-subtitle">
              <AppIcon icon="solar:map-point-bold" size={12} />
              <span>VJU My Dinh . VJU Hoa Lac</span>
            </p>
          </div>
        </div>

        <div className="landing-editorial landing-reveal landing-reveal-delay-1">
          <div className="landing-section-marker">// ACCESS PORTAL</div>
          <p className="landing-kicker">SMART 3D PRINT REQUEST PLATFORM</p>
          <h2 className="landing-display">
            <span className="landing-display-line">{t('heroTitle')}</span>
            <span className="landing-display-line landing-display-accent">{t('heroHighlight')}</span>
          </h2>
          <p className="landing-copy">{t('heroDesc')}</p>
        </div>

        <div className="landing-feature-list landing-reveal landing-reveal-delay-3">
          {heroFeatures.map(({ icon, title, desc }, index) => (
            <article key={title} className="landing-feature-card app-hover-box">
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
            </article>
          ))}
        </div>

        <div className="landing-footer-meta landing-reveal landing-reveal-delay-3">
          <span>{t('copyright')}</span>
          {guideUrl ? (
            <a href={guideUrl} target="_blank" rel="noopener noreferrer">
              {t('userGuide')}
            </a>
          ) : (
            <span className="is-muted">{t('userGuide')}</span>
          )}
          {settings.contact_email || settings.contact_facebook || settings.contact_zalo ? (
            <a href={contactHref} target="_blank" rel="noopener noreferrer">
              {t('contactSupport')}
            </a>
          ) : (
            <span className="is-muted">{t('contactSupport')}</span>
          )}
        </div>
      </section>

      <section className="landing-auth-wrap">
        <div className="landing-auth-panel landing-reveal landing-reveal-delay-1">
          <div className="landing-auth-topbar">
            <button
              onClick={() => setLang(lang === 'VN' ? 'EN' : lang === 'EN' ? 'JP' : 'VN')}
              className="landing-lang-toggle"
              aria-label="Toggle language"
            >
              <AppIcon icon="solar:global-bold" size={14} />
              <span>{lang}</span>
            </button>
          </div>

          <div className="landing-auth-header">
            <h2 id="auth-title" className="landing-auth-title">
              {tab === 'login' ? t('welcome') : t('registerTitle')}
            </h2>
            <p className="landing-auth-subtitle">
              {tab === 'login' ? t('loginSubtitle') : t('registerSubtitle')}
            </p>
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
                <span>{tabItem === 'login' ? t('login') : t('register')}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="landing-auth-alert is-error" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="landing-auth-alert is-success" role="status">
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

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
                    title={showPass ? copy.landing.hidePassword : copy.landing.showPassword}
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
        </div>
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
    <button type="submit" disabled={loading || disabled} className="landing-submit">
      {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
      <span>{label}</span>
    </button>
  );
}
