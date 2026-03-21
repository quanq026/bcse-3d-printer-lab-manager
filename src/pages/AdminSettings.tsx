import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Save } from 'lucide-react';
import { AppIcon } from '../components/AppIcon';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { api } from '../lib/api';
import { getSettingsExperienceCopy, getUiText } from '../lib/uiText';
import type { AdminUser } from '../types';
import { Role } from '../types';

function SettingField({ label, hint, icon, children }: { label: string; hint: string; icon: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-3 rounded-[24px] border border-[rgba(30,23,19,0.08)] bg-white/55 p-4 dark:border-white/8 dark:bg-white/4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
          <AppIcon icon={icon} size={18} />
        </div>
        <div>
          <p className="text-sm font-black text-slate-900 dark:text-[var(--landing-text)]">{label}</p>
          <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-[var(--landing-muted)]">{hint}</p>
        </div>
      </div>
      {children}
    </label>
  );
}

export const AdminSettings: React.FC = () => {
  const { lang } = useLang();
  const { role, currentUser, logout } = useAuth();
  const text = getUiText(lang);
  const copy = text.adminSettings;
  const shared = text.shared;
  const isAdmin = role === Role.ADMIN;
  const settingsExperience = getSettingsExperienceCopy(lang, role);

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [staffAccounts, setStaffAccounts] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [selfSaving, setSelfSaving] = useState(false);
  const [selfSuccess, setSelfSuccess] = useState('');
  const [selfError, setSelfError] = useState('');
  const [selfPasswordForm, setSelfPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    userId: '',
    newPassword: '',
    confirmPassword: '',
  });

  const selfPasswordCopy = lang === 'JP'
    ? {
        eyebrow: '// My access',
        title: 'Update your own password.',
        desc: 'Use your current password to confirm the change before the new password is saved.',
        currentPassword: 'Current password',
        currentPasswordHint: 'Enter the password you are using right now.',
        newPassword: 'New password',
        newPasswordHint: 'At least 8 characters, including uppercase, lowercase, and a number.',
        confirmPassword: 'Confirm new password',
        confirmPasswordHint: 'Repeat the new password once more to avoid accidental changes.',
        save: 'Change my password',
        mismatch: 'Confirmation password does not match.',
        success: 'Your password has been updated. Please sign in again with the new password.',
      }
    : lang === 'EN'
      ? {
          eyebrow: '// My access',
          title: 'Update your own password.',
          desc: 'Use your current password to confirm the change before the new password is saved.',
          currentPassword: 'Current password',
          currentPasswordHint: 'Enter the password you are using right now.',
          newPassword: 'New password',
          newPasswordHint: 'At least 8 characters, including uppercase, lowercase, and a number.',
          confirmPassword: 'Confirm new password',
          confirmPasswordHint: 'Repeat the new password once more to avoid accidental changes.',
          save: 'Change my password',
          mismatch: 'Confirmation password does not match.',
          success: 'Your password has been updated. Please sign in again with the new password.',
        }
      : {
          eyebrow: '// Tài khoản của tôi',
          title: 'Đổi mật khẩu cho chính bạn.',
          desc: 'Nhập mật khẩu hiện tại để xác nhận trước khi hệ thống lưu mật khẩu mới.',
          currentPassword: 'Mật khẩu hiện tại',
          currentPasswordHint: 'Nhập đúng mật khẩu bạn đang dùng để đăng nhập.',
          newPassword: 'Mật khẩu mới',
          newPasswordHint: 'Tối thiểu 8 ký tự, có chữ hoa, chữ thường và chữ số.',
          confirmPassword: 'Xác nhận mật khẩu mới',
          confirmPasswordHint: 'Nhập lại một lần nữa để tránh đổi nhầm.',
          save: 'Đổi mật khẩu của tôi',
          mismatch: 'Mật khẩu xác nhận không khớp.',
          success: 'Đã cập nhật mật khẩu của bạn.',
        };

  const managedPasswordCopy = lang === 'JP'
    ? {
        eyebrow: '// Managed access',
        title: 'Rotate Admin and Moderator passwords.',
        desc: 'Only Admin can update another staff account from here. Student accounts are excluded from this flow.',
        target: 'Target account',
        targetHint: 'Select the Admin or Moderator account that should receive the new password.',
        newPassword: 'New password',
        confirmPassword: 'Confirm password',
        newPasswordHint: 'At least 8 characters, including uppercase, lowercase, and a number.',
        confirmPasswordHint: 'Repeat the new password once to avoid accidental resets.',
        noAccounts: 'No Admin or Moderator accounts are available.',
        save: 'Update password',
        success: 'Password updated successfully. The selected account will need to sign in again.',
        mismatch: 'Confirmation password does not match.',
        placeholder: 'Choose an Admin or Moderator account',
      }
    : lang === 'EN'
      ? {
          eyebrow: '// Managed access',
          title: 'Rotate Admin and Moderator passwords.',
          desc: 'Only Admin can update another staff account from here. Student accounts are excluded from this flow.',
          target: 'Target account',
          targetHint: 'Select the Admin or Moderator account that should receive the new password.',
          newPassword: 'New password',
          confirmPassword: 'Confirm password',
          newPasswordHint: 'At least 8 characters, including uppercase, lowercase, and a number.',
          confirmPasswordHint: 'Repeat the new password once to avoid accidental resets.',
          noAccounts: 'No Admin or Moderator accounts are available.',
          save: 'Update password',
          success: 'Password updated successfully. The selected account will need to sign in again.',
          mismatch: 'Confirmation password does not match.',
          placeholder: 'Choose an Admin or Moderator account',
        }
      : {
          eyebrow: '// Truy cập quản trị',
          title: 'Đổi mật khẩu cho tài khoản Admin và Moderator.',
          desc: 'Chỉ Admin mới có thể đổi mật khẩu cho tài khoản nhân sự khác. Tài khoản sinh viên không nằm trong luồng này.',
          target: 'Tài khoản cần đổi',
          targetHint: 'Chọn đúng tài khoản Admin hoặc Moderator cần cập nhật mật khẩu.',
          newPassword: 'Mật khẩu mới',
          confirmPassword: 'Xác nhận mật khẩu mới',
          newPasswordHint: 'Tối thiểu 8 ký tự, có chữ hoa, chữ thường và chữ số.',
          confirmPasswordHint: 'Nhập lại một lần để tránh đổi nhầm mật khẩu.',
          noAccounts: 'Hiện chưa có tài khoản Admin hoặc Moderator nào.',
          save: 'Cập nhật mật khẩu',
          success: 'Đổi mật khẩu thành công.',
          mismatch: 'Mật khẩu xác nhận không khớp.',
          placeholder: 'Chọn tài khoản Admin hoặc Moderator',
        };

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const [settingsData, users] = await Promise.all([api.getSettingsAdmin(), api.getUsers()]);
          const managedAccounts = users.filter((user) => user.role === 'Admin' || user.role === 'Moderator');
          setSettings(settingsData);
          setStaffAccounts(managedAccounts);
          setPasswordForm((current) => ({
            ...current,
            userId: current.userId || managedAccounts[0]?.id || '',
          }));
        }
      } catch (loadError) {
        console.error(loadError);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isAdmin]);

  const setValue = (key: string, value: string) => setSettings((current) => ({ ...current, [key]: value }));
  const setSelfPasswordValue = (key: 'currentPassword' | 'newPassword' | 'confirmPassword', value: string) =>
    setSelfPasswordForm((current) => ({ ...current, [key]: value }));
  const setPasswordValue = (key: 'userId' | 'newPassword' | 'confirmPassword', value: string) =>
    setPasswordForm((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSuccess(copy.success);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : copy.loading);
    } finally {
      setSaving(false);
    }
  };

  const handleSelfPasswordSave = async () => {
    setSelfError('');
    setSelfSuccess('');

    if (selfPasswordForm.newPassword !== selfPasswordForm.confirmPassword) {
      setSelfError(selfPasswordCopy.mismatch);
      return;
    }

    setSelfSaving(true);
    try {
        await api.changeOwnPassword(selfPasswordForm.currentPassword, selfPasswordForm.newPassword);
        setSelfPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        logout(selfPasswordCopy.success);
    } catch (err: unknown) {
      setSelfError(err instanceof Error ? err.message : copy.loading);
    } finally {
      setSelfSaving(false);
    }
  };

  const handleManagedPasswordSave = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(managedPasswordCopy.mismatch);
      return;
    }

    setPasswordSaving(true);
    try {
      await api.updateManagedPassword(passwordForm.userId, passwordForm.newPassword);
      setPasswordSuccess(managedPasswordCopy.success);
      setPasswordForm((current) => ({ ...current, newPassword: '', confirmPassword: '' }));
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : copy.loading);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="app-panel rounded-[30px]">
        <div className="app-empty-state">
          <AppIcon icon="solar:settings-bold-duotone" size={28} className="animate-pulse" />
          <p className="text-sm font-semibold">{copy.loading}</p>
        </div>
      </section>
    );
  }

  return (
    <div className="app-admin-squared app-admin-compact space-y-6">
      <section className="app-panel app-hover-box relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <div className="space-y-3">
            <p className="app-eyebrow">{settingsExperience.hero.eyebrow}</p>
            <h1 className="app-display-sm text-slate-900 dark:text-[var(--landing-text)]">
              {settingsExperience.hero.title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">
              {isAdmin ? copy.heroDesc : `${currentUser?.fullName || shared.userLabel} · ${currentUser?.email || ''}`}
            </p>
          </div>
          {isAdmin ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.values(copy.stats).map((stat) => (
                <div key={stat.label} className="app-hover-box app-metric-card rounded-[26px]">
                  <p className="app-metric-card-label">{stat.label}</p>
                  <p className="mt-4 app-metric-card-value text-[clamp(1.7rem,2.6vw,2.3rem)]">{stat.value}</p>
                  <p className="app-metric-card-note">{stat.note}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="app-panel-soft rounded-[26px] px-5 py-5">
              <p className="app-overline">{shared.userLabel}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-[var(--landing-text)]">{currentUser?.fullName || shared.userLabel}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-[var(--landing-muted)]">{currentUser?.email || ''}</p>
            </div>
          )}
        </div>
      </section>

      {error && (
        <section className="app-panel-soft rounded-[24px] border border-red-200/70 px-5 py-4 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
          <div className="flex items-start gap-3"><AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error}</span></div>
        </section>
      )}
      {success && (
        <section className="app-panel-soft rounded-[24px] border border-emerald-200/70 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
          <div className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /> <span>{success}</span></div>
        </section>
      )}
      {selfError && (
        <section className="app-panel-soft rounded-[24px] border border-red-200/70 px-5 py-4 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
          <div className="flex items-start gap-3"><AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{selfError}</span></div>
        </section>
      )}
      {selfSuccess && (
        <section className="app-panel-soft rounded-[24px] border border-emerald-200/70 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
          <div className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /> <span>{selfSuccess}</span></div>
        </section>
      )}
      {passwordError && (
        <section className="app-panel-soft rounded-[24px] border border-red-200/70 px-5 py-4 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
          <div className="flex items-start gap-3"><AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{passwordError}</span></div>
        </section>
      )}
      {passwordSuccess && (
        <section className="app-panel-soft rounded-[24px] border border-emerald-200/70 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
          <div className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /> <span>{passwordSuccess}</span></div>
        </section>
      )}

      <section className="app-panel app-hover-box rounded-[32px] px-5 py-6 sm:px-6">
        <div className="space-y-2">
          <p className="app-eyebrow">{selfPasswordCopy.eyebrow}</p>
          <h2 className="text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{selfPasswordCopy.title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{selfPasswordCopy.desc}</p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SettingField label={selfPasswordCopy.currentPassword} hint={selfPasswordCopy.currentPasswordHint} icon="solar:lock-keyhole-bold-duotone">
            <input type="password" value={selfPasswordForm.currentPassword} onChange={(event) => setSelfPasswordValue('currentPassword', event.target.value)} placeholder="Current password" className="app-control rounded-[18px]" />
          </SettingField>
          <SettingField label={selfPasswordCopy.newPassword} hint={selfPasswordCopy.newPasswordHint} icon="solar:lock-password-bold-duotone">
            <input type="password" value={selfPasswordForm.newPassword} onChange={(event) => setSelfPasswordValue('newPassword', event.target.value)} placeholder="New password" className="app-control rounded-[18px]" />
          </SettingField>
          <SettingField label={selfPasswordCopy.confirmPassword} hint={selfPasswordCopy.confirmPasswordHint} icon="solar:shield-keyhole-bold-duotone">
            <input type="password" value={selfPasswordForm.confirmPassword} onChange={(event) => setSelfPasswordValue('confirmPassword', event.target.value)} placeholder="Repeat new password" className="app-control rounded-[18px]" />
          </SettingField>
        </div>
        <p className="mt-4 text-xs leading-6 text-slate-500 dark:text-[var(--landing-muted)]">{selfPasswordCopy.newPasswordHint}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleSelfPasswordSave}
            disabled={selfSaving || !selfPasswordForm.currentPassword || !selfPasswordForm.newPassword || !selfPasswordForm.confirmPassword}
            className="app-primary-button inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold disabled:opacity-60"
          >
            <KeyRound size={16} />
            {selfSaving ? copy.saving : selfPasswordCopy.save}
          </button>
        </div>
      </section>

      {isAdmin && (
        <>
          <section className="app-panel app-hover-box rounded-[32px] px-5 py-6 sm:px-6">
            <div className="space-y-2">
              <p className="app-eyebrow">{copy.directoryEyebrow}</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{copy.directoryTitle}</h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{copy.directoryDesc}</p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <SettingField label={copy.supportEmail} hint={copy.supportEmailHint} icon="solar:letter-bold-duotone">
                <input type="email" value={settings.contact_email || ''} onChange={(event) => setValue('contact_email', event.target.value)} placeholder="lab@vju.ac.vn" className="app-control rounded-[18px]" />
              </SettingField>
              <SettingField label={copy.facebookPage} hint={copy.facebookPageHint} icon="solar:chat-square-like-bold-duotone">
                <input type="url" value={settings.contact_facebook || ''} onChange={(event) => setValue('contact_facebook', event.target.value)} placeholder="https://facebook.com/..." className="app-control rounded-[18px]" />
              </SettingField>
              <SettingField label={copy.zaloNumber} hint={copy.zaloNumberHint} icon="solar:chat-round-dots-bold-duotone">
                <input type="text" value={settings.contact_zalo || ''} onChange={(event) => setValue('contact_zalo', event.target.value)} placeholder="09xxxxxxxx" className="app-control rounded-[18px]" />
              </SettingField>
              <SettingField label={copy.guideUrl} hint={copy.guideUrlHint} icon="solar:notebook-bookmark-bold-duotone">
                <input type="url" value={settings.guide_url || ''} onChange={(event) => setValue('guide_url', event.target.value)} placeholder="https://docs.google.com/..." className="app-control rounded-[18px]" />
              </SettingField>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button onClick={handleSave} disabled={saving} className="app-primary-button inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold disabled:opacity-60">
                <Save size={16} />
                {saving ? copy.saving : shared.save}
              </button>
            </div>
          </section>

          <section className="app-panel app-hover-box rounded-[32px] px-5 py-6 sm:px-6">
            <div className="space-y-2">
              <p className="app-eyebrow">{managedPasswordCopy.eyebrow}</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-[var(--landing-text)]">{managedPasswordCopy.title}</h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-[var(--landing-muted)]">{managedPasswordCopy.desc}</p>
            </div>

            {staffAccounts.length === 0 ? (
              <div className="app-empty-state mt-6 min-h-[180px]">
                <KeyRound size={26} />
                <p className="text-sm font-semibold">{managedPasswordCopy.noAccounts}</p>
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <SettingField label={managedPasswordCopy.target} hint={managedPasswordCopy.targetHint} icon="solar:users-group-rounded-bold-duotone">
                    <select value={passwordForm.userId} onChange={(event) => setPasswordValue('userId', event.target.value)} className="app-control rounded-[18px]">
                      <option value="">{managedPasswordCopy.placeholder}</option>
                      {staffAccounts.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName} ({user.role})
                        </option>
                      ))}
                    </select>
                  </SettingField>
                  <SettingField label={managedPasswordCopy.newPassword} hint={managedPasswordCopy.newPasswordHint} icon="solar:lock-password-bold-duotone">
                    <input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordValue('newPassword', event.target.value)} placeholder="Admin@202444" className="app-control rounded-[18px]" />
                  </SettingField>
                  <SettingField label={managedPasswordCopy.confirmPassword} hint={managedPasswordCopy.confirmPasswordHint} icon="solar:shield-keyhole-bold-duotone">
                    <input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordValue('confirmPassword', event.target.value)} placeholder="Admin@202444" className="app-control rounded-[18px]" />
                  </SettingField>
                </div>
                <p className="mt-4 text-xs leading-6 text-slate-500 dark:text-[var(--landing-muted)]">{managedPasswordCopy.newPasswordHint}</p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleManagedPasswordSave}
                    disabled={passwordSaving || !passwordForm.userId || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    className="app-primary-button inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-bold disabled:opacity-60"
                  >
                    <KeyRound size={16} />
                    {passwordSaving ? copy.saving : managedPasswordCopy.save}
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
};
