import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  CheckSquare,
  Printer as PrinterIcon,
  Package,
  Settings,
  LogOut,
  BarChart3,
  Users,
  MessageCircle,
  HardDrive,
  Tag,
  ListOrdered,
} from 'lucide-react';
import { Role } from '../types';
import { cn } from '../lib/utils';
import { useLang } from '../contexts/LanguageContext';

interface SidebarProps {
  role: Role;
  activePage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  currentUser?: any;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, activePage, onPageChange, onLogout, currentUser }) => {
  const { t } = useLang();

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard, roles: [Role.STUDENT, Role.MODERATOR, Role.ADMIN] },
    { id: 'booking', label: t('booking'), icon: PlusCircle, roles: [Role.STUDENT] },
    { id: 'history', label: t('history'), icon: Clock, roles: [Role.STUDENT] },
    { id: 'pricing', label: 'Bảng giá', icon: Tag, roles: [Role.STUDENT] },
    { id: 'queue-status', label: 'Hàng chờ', icon: ListOrdered, roles: [Role.STUDENT, Role.MODERATOR, Role.ADMIN] },
    { id: 'queue', label: t('queue'), icon: CheckSquare, roles: [Role.MODERATOR, Role.ADMIN] },
    { id: 'printers', label: t('printers'), icon: PrinterIcon, roles: [Role.ADMIN] },
    { id: 'inventory', label: t('inventory'), icon: Package, roles: [Role.ADMIN] },
    { id: 'users', label: t('users'), icon: Users, roles: [Role.ADMIN] },
    { id: 'analytics', label: t('analytics'), icon: BarChart3, roles: [Role.ADMIN] },
    { id: 'backup', label: t('backup'), icon: HardDrive, roles: [Role.ADMIN] },
    { id: 'settings', label: t('settings'), icon: Settings, roles: [Role.ADMIN] },
    { id: 'chat', label: t('chat'), icon: MessageCircle, roles: [Role.STUDENT, Role.MODERATOR, Role.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 transition-colors duration-200">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => onPageChange('dashboard')} className="flex items-center gap-3 w-full text-left hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
            <PrinterIcon size={22} />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white leading-tight">{t('appName')}</h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider">Lab Manager</p>
          </div>
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              activePage === item.id
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <item.icon size={18} className={activePage === item.id ? "text-amber-600 dark:text-amber-400" : "text-slate-400"} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
              style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
              {currentUser?.fullName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{currentUser?.fullName || 'Người dùng'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{role}</p>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={18} />
          {t('logout')}
        </button>
      </div>
    </aside>
  );
};
