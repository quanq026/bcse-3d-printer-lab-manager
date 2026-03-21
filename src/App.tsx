import React, { Suspense, lazy, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronDown, Loader2, Menu } from 'lucide-react';
import { LanguageToggle } from './components/LanguageToggle';
import { Sidebar } from './components/Sidebar';
import { ThemeToggle } from './components/ThemeToggle';
import { useAuth } from './contexts/AuthContext';
import { useLang } from './contexts/LanguageContext';
import { api } from './lib/api';
import { createNavigationIntentState, failRequestedJob, requestJobIntent, requestPageIntent, resolveRequestedJob } from './lib/navigationIntent';
import { fillText, getSettingsExperienceCopy, getUiText } from './lib/uiText';
import { LandingPage } from './pages/LandingPage';
import { Role } from './types';

const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then((module) => ({ default: module.StudentDashboard })));
const BookingWizard = lazy(() => import('./pages/BookingWizard').then((module) => ({ default: module.BookingWizard })));
const ModeratorQueue = lazy(() => import('./pages/ModeratorQueue').then((module) => ({ default: module.ModeratorQueue })));
const AdminInventory = lazy(() => import('./pages/AdminInventory').then((module) => ({ default: module.AdminInventory })));
const AdminPricing = lazy(() => import('./pages/AdminPricing').then((module) => ({ default: module.AdminPricing })));
const AdminUsers = lazy(() => import('./pages/AdminUsers').then((module) => ({ default: module.AdminUsers })));
const AdminPrinters = lazy(() => import('./pages/AdminPrinters').then((module) => ({ default: module.AdminPrinters })));
const ChatPage = lazy(() => import('./pages/ChatPage').then((module) => ({ default: module.ChatPage })));
const BackupPage = lazy(() => import('./pages/BackupPage').then((module) => ({ default: module.BackupPage })));
const JobDetail = lazy(() => import('./pages/JobDetail').then((module) => ({ default: module.JobDetail })));
const AdminSettings = lazy(() => import('./pages/AdminSettings').then((module) => ({ default: module.AdminSettings })));
const PricingPage = lazy(() => import('./pages/PricingPage').then((module) => ({ default: module.PricingPage })));
const QueuePage = lazy(() => import('./pages/QueuePage').then((module) => ({ default: module.QueuePage })));

function PageLoader() {
  const { lang } = useLang();
  const copy = getUiText(lang);

  return (
    <div className="app-panel flex min-h-[260px] items-center justify-center px-6 py-12 text-sm text-slate-500 dark:text-[var(--landing-muted)]">
      <Loader2 size={22} className="mr-2 animate-spin" />
      <span className="tracking-[0.12em] uppercase">{copy.shared.loadingWorkspace}</span>
    </div>
  );
}

export default function App() {
  const { lang } = useLang();
  const copy = getUiText(lang);
  const { isLoggedIn, currentUser, role, login, logout, loading } = useAuth();
  const [navigation, setNavigation] = useState(() => createNavigationIntentState('dashboard'));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [headerMetaOpen, setHeaderMetaOpen] = useState(false);

  const handleLogin = (user: Parameters<typeof login>[0]) => {
    login(user);
    setNavigation(createNavigationIntentState('dashboard'));
    setMobileSidebarOpen(false);
    setHeaderMetaOpen(false);
  };

  const handleLogout = () => {
    logout();
    setNavigation(createNavigationIntentState('dashboard'));
    setMobileSidebarOpen(false);
    setHeaderMetaOpen(false);
  };

  const handlePageChange = (page: string) => {
    setNavigation((previous) => requestPageIntent(previous, page));
    setMobileSidebarOpen(false);
    setHeaderMetaOpen(false);
  };

  const navigateToJob = async (id: string) => {
    let requestId = 0;

    setNavigation((previous) => {
      const next = requestJobIntent(previous, id);
      requestId = next.jobRequestId;
      return next;
    });
    setMobileSidebarOpen(false);
    setHeaderMetaOpen(false);

    try {
      const job = await api.getJob(id);
      setNavigation((previous) => resolveRequestedJob(previous, requestId, job));
    } catch {
      setNavigation((previous) => failRequestedJob(previous, requestId));
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!isLoggedIn) {
    return <LandingPage onLogin={handleLogin} />;
  }

  const currentMeta = navigation.activePage === 'job-detail' && navigation.selectedJob
    ? {
        eyebrow: copy.pageMeta['job-detail'].eyebrow,
        title: navigation.selectedJob.jobName || copy.pageMeta['job-detail'].title,
        note: navigation.selectedJob.id
          ? fillText(copy.shared.jobDetailSelectedNote, { id: navigation.selectedJob.id })
          : copy.pageMeta['job-detail'].note,
      }
    : navigation.activePage === 'settings'
      ? getSettingsExperienceCopy(lang, role).page
      : (copy.pageMeta as Record<string, { eyebrow: string; title: string; note: string }>)[navigation.activePage] || copy.pageMeta.dashboard;

  const roleCopy = {
    [Role.STUDENT]: copy.roles.studentSpace,
    [Role.MODERATOR]: copy.roles.moderatorSpace,
    [Role.ADMIN]: copy.roles.adminSpace,
  }[role];
  const headerMetaToggleLabel = lang === 'JP'
    ? (headerMetaOpen ? 'Hide quick panels' : 'Show quick panels')
    : (headerMetaOpen ? 'Ẩn bảng nhanh' : 'Hiện bảng nhanh');

  const renderPage = () => {
    switch (navigation.activePage) {
      case 'dashboard':
        return <StudentDashboard activePage="dashboard" onNewBooking={() => handlePageChange('booking')} onSelectJob={navigateToJob} onPageChange={handlePageChange} role={role} currentUser={currentUser} />;
      case 'booking':
        return <BookingWizard onComplete={() => handlePageChange('dashboard')} onCancel={() => handlePageChange('dashboard')} />;
      case 'history':
        return <StudentDashboard activePage="history" onNewBooking={() => handlePageChange('booking')} onSelectJob={navigateToJob} onPageChange={handlePageChange} role={role} currentUser={currentUser} />;
      case 'queue':
        return <ModeratorQueue onSelectJob={navigateToJob} />;
      case 'inventory':
        return <AdminInventory />;
      case 'analytics':
        return <AdminPricing />;
      case 'users':
        return <AdminUsers />;
      case 'printers':
        return <AdminPrinters />;
      case 'chat':
        return <ChatPage currentUser={currentUser} />;
      case 'backup':
        return <BackupPage />;
      case 'settings':
        return <AdminSettings />;
      case 'pricing':
        return <PricingPage />;
      case 'queue-status':
        return <QueuePage currentUser={currentUser} />;
      case 'job-detail':
        return navigation.pendingJobId ? (
          <PageLoader />
        ) : navigation.selectedJob ? (
          <JobDetail job={navigation.selectedJob} onBack={() => handlePageChange('dashboard')} />
        ) : (
          <div className="app-panel flex min-h-[240px] items-center justify-center px-6 py-12 text-sm text-slate-500 dark:text-[var(--landing-muted)]">
            {copy.shared.pageLoadFailed}
          </div>
        );
      default:
        return (
          <div className="app-panel flex min-h-[240px] items-center justify-center px-6 py-12 text-sm text-slate-500 dark:text-[var(--landing-muted)]">
            {copy.shared.pageUnavailable}
          </div>
        );
    }
  };

  return (
    <div className="app-shell transition-colors duration-200">
      <div className="app-shell-noise" />
      <div className="app-shell-grid" />
      <div className="relative z-10 flex min-h-screen w-full flex-1">
        <Sidebar
          role={role}
          activePage={navigation.activePage}
          onPageChange={handlePageChange}
          onLogout={handleLogout}
          currentUser={currentUser}
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
            <div className="app-panel flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setMobileSidebarOpen(true)}
                      className="app-icon-button inline-flex h-11 w-11 items-center justify-center lg:hidden"
                      aria-label={copy.shared.openNavigation}
                    >
                      <Menu size={18} />
                    </button>
                    {navigation.activePage !== 'dashboard' && (
                      <button
                        onClick={() => handlePageChange('dashboard')}
                        className="app-icon-button inline-flex h-11 w-11 items-center justify-center"
                        title={copy.shared.backDashboard}
                        aria-label={copy.shared.backDashboard}
                      >
                        <ArrowLeft size={18} />
                      </button>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="app-eyebrow">{currentMeta.eyebrow}</p>
                    <h1 className="app-display-sm mt-2 break-words">{currentMeta.title}</h1>
                    <p className="app-subtle-copy mt-2 max-w-3xl text-sm">{currentMeta.note}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHeaderMetaOpen((value) => !value)}
                  className={`app-icon-button app-header-meta-toggle inline-flex h-11 w-11 shrink-0 items-center justify-center ${headerMetaOpen ? 'is-open' : ''}`}
                  aria-label={headerMetaToggleLabel}
                  title={headerMetaToggleLabel}
                >
                  <ChevronDown size={18} />
                </button>
              </div>
              <div className={`app-header-meta ${headerMetaOpen ? 'is-open' : ''}`}>
                <div className={`app-header-meta-grid grid w-full gap-3 ${currentUser ? 'sm:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]' : 'sm:grid-cols-3'}`}>
                  {currentUser && (
                    <div className="app-panel-soft app-header-meta-card flex h-full min-w-0 items-center gap-3 px-4 py-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[linear-gradient(135deg,var(--landing-accent),var(--landing-amber))] text-sm font-black uppercase text-white">
                        {currentUser.fullName?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="app-overline">{copy.shared.userLabel}</p>
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{currentUser.fullName}</p>
                        <p className="text-xs text-slate-500 dark:text-[var(--landing-muted)]">{roleCopy}</p>
                      </div>
                    </div>
                  )}
                  <div className="app-panel-soft app-header-meta-card hidden h-full min-w-0 items-center gap-3 px-4 py-3 sm:flex">
                    <span className="h-2.5 w-2.5 bg-[var(--landing-amber)]" />
                    <div>
                      <p className="app-overline">{copy.shared.statusLabel}</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-[var(--landing-text)]">{copy.shared.statusOnline}</p>
                    </div>
                  </div>
                  <div className="app-header-meta-card">
                    <LanguageToggle expanded />
                  </div>
                  <div className="app-header-meta-card">
                    <ThemeToggle expanded />
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
            <Suspense fallback={<PageLoader key={`${navigation.activePage}-${navigation.pendingJobId ?? 'idle'}`} />}>
              <motion.div
                key={navigation.activePage + (navigation.selectedJob?.id || navigation.pendingJobId || '')}
                initial={{ opacity: 0, y: 12, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
              >
                {renderPage()}
              </motion.div>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
