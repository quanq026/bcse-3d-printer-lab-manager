import React from 'react';
import { LogOut, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppIcon } from './AppIcon';
import { useLang } from '../contexts/LanguageContext';
import { getUiText } from '../lib/uiText';
import { cn } from '../lib/utils';
import { Role } from '../types';
import type { User } from '../types';

interface SidebarProps {
  role: Role;
  activePage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  currentUser?: User | null;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, activePage, onPageChange, onLogout, currentUser, isMobileOpen, onCloseMobile }) => {
  const { lang } = useLang();
  const copy = getUiText(lang);

  const menuItems = [
    { id: 'dashboard', icon: 'solar:widget-5-bold', roles: [Role.STUDENT, Role.MODERATOR, Role.ADMIN] },
    { id: 'booking', icon: 'solar:add-square-bold', roles: [Role.STUDENT] },
    { id: 'history', icon: 'solar:history-bold', roles: [Role.STUDENT] },
    { id: 'pricing', icon: 'solar:tag-price-bold', roles: [Role.STUDENT] },
    { id: 'queue-status', icon: 'solar:sort-by-time-bold', roles: [Role.STUDENT, Role.MODERATOR, Role.ADMIN] },
    { id: 'queue', icon: 'solar:checklist-bold', roles: [Role.MODERATOR, Role.ADMIN] },
    { id: 'printers', icon: 'solar:printer-2-bold', roles: [Role.ADMIN] },
    { id: 'inventory', icon: 'solar:box-bold', roles: [Role.ADMIN] },
    { id: 'users', icon: 'solar:users-group-rounded-bold', roles: [Role.ADMIN] },
    { id: 'analytics', icon: 'solar:chart-2-bold', roles: [Role.ADMIN] },
    { id: 'backup', icon: 'solar:archive-bold', roles: [Role.ADMIN] },
    { id: 'settings', icon: 'solar:settings-bold', roles: [Role.ADMIN] },
    { id: 'chat', icon: 'solar:chat-round-dots-bold', roles: [Role.STUDENT, Role.MODERATOR, Role.ADMIN] },
  ];

  const filteredItems = menuItems.filter((item) => item.roles.includes(role));
  const roleLabel = {
    [Role.STUDENT]: copy.roles.sidebarStudent,
    [Role.MODERATOR]: copy.roles.sidebarModerator,
    [Role.ADMIN]: copy.roles.sidebarAdmin,
  }[role];

  const handlePageChange = (page: string) => {
    onPageChange(page);
    onCloseMobile();
  };

  const handleLogout = () => {
    onCloseMobile();
    onLogout();
  };

  return (
    <>
      <button
        type="button"
        aria-label={copy.shared.closeOverlay}
        onClick={onCloseMobile}
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/65 backdrop-blur-sm transition-opacity lg:hidden',
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />
      <aside className={cn(
        'app-sidebar fixed inset-y-0 left-0 z-40 flex w-72 max-w-[86vw] flex-col border-r transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[288px] lg:max-w-none',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 lg:hidden">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">{copy.sidebar.mobileEyebrow}</p>
            <p className="mt-1 text-sm font-semibold text-white">{copy.sidebar.mobileTitle}</p>
          </div>
          <button
            onClick={onCloseMobile}
            className="inline-flex h-11 w-11 items-center justify-center border border-white/10 bg-white/5 text-white/75 transition-colors hover:bg-white/10"
            aria-label={copy.shared.closeNavigation}
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-white/10 px-5 py-6">
          <button onClick={() => handlePageChange('dashboard')} className="app-sidebar-brand group w-full text-left">
            <div className="app-sidebar-brand-mark">
              <AppIcon icon="solar:printer-2-bold" size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/40">{copy.sidebar.brandEyebrow}</p>
              <h1 className="app-display-font mt-2 text-[1.35rem] leading-none text-white">{copy.sidebar.brandTitle}</h1>
              <p className="mt-2 text-[13px] leading-6 text-white/62">{copy.sidebar.brandNote}</p>
            </div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-4 px-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/38">{copy.sidebar.sectionLabel}</p>
          </div>
          <nav className="space-y-2">
            {filteredItems.map((item) => {
              const isActive = activePage === item.id;
              const label = copy.sidebar.nav[item.id as keyof typeof copy.sidebar.nav] || item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handlePageChange(item.id)}
                  className={cn('app-nav-link relative overflow-hidden', isActive && 'is-active')}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 bg-white/10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-3">
                    <AppIcon icon={item.icon} size={18} className={cn(isActive ? 'text-[var(--landing-amber)]' : 'text-white/42')} />
                    <span className="text-sm font-semibold">{label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="app-sidebar-user-card p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{roleLabel}</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center bg-[linear-gradient(135deg,var(--landing-accent),var(--landing-accent-strong))] text-sm font-black uppercase text-white">
                {currentUser?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{currentUser?.fullName || copy.shared.systemUser}</p>
                <p className="truncate text-xs text-white/52">{currentUser?.email || role}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 border border-[rgba(239,125,87,0.24)] bg-[rgba(239,125,87,0.12)] px-4 text-sm font-semibold text-[#ffd7cc] transition-all hover:bg-[rgba(239,125,87,0.18)]"
          >
            <LogOut size={18} />
            {copy.sidebar.logout}
          </button>
        </div>
      </aside>
    </>
  );
};
