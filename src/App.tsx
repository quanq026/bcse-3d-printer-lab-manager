import React, { useState, useEffect } from 'react';
import { Role } from './types';
import { Sidebar } from './components/Sidebar';
import { ThemeToggle } from './components/ThemeToggle';
import { StarRain } from './components/StarRain';
import { LandingPage } from './pages/LandingPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { BookingWizard } from './pages/BookingWizard';
import { ModeratorQueue } from './pages/ModeratorQueue';
import { AdminInventory } from './pages/AdminInventory';
import { AdminPricing } from './pages/AdminPricing';
import { AdminUsers } from './pages/AdminUsers';
import { AdminPrinters } from './pages/AdminPrinters';
import { ChatPage } from './pages/ChatPage';
import { BackupPage } from './pages/BackupPage';
import { JobDetail } from './pages/JobDetail';
import { AdminSettings } from './pages/AdminSettings';
import { PricingPage } from './pages/PricingPage';
import { QueuePage } from './pages/QueuePage';
import { api } from './lib/api';
import { ArrowLeft, Menu } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('lab_token');
    if (token) {
      api.me().then(user => {
        setCurrentUser(user);
        setRole(user.role as Role);
        setIsLoggedIn(true);
      }).catch(() => {
        localStorage.removeItem('lab_token');
      });
    }
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    setRole(user.role as Role);
    setIsLoggedIn(true);
    setActivePage('dashboard');
    setMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('lab_token');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setActivePage('dashboard');
    setMobileSidebarOpen(false);
  };

  const handlePageChange = (page: string) => {
    setActivePage(page);
    setMobileSidebarOpen(false);
  };

  const navigateToJob = async (id: string) => {
    try {
      const job = await api.getJob(id);
      setSelectedJob(job);
      setSelectedJobId(id);
      setActivePage('job-detail');
    } catch {
      setSelectedJobId(id);
      setActivePage('job-detail');
    } finally {
      setMobileSidebarOpen(false);
    }
  };

  if (!isLoggedIn) {
    return <LandingPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <StudentDashboard activePage="dashboard" onNewBooking={() => handlePageChange('booking')} onSelectJob={navigateToJob} onPageChange={handlePageChange} role={role} currentUser={currentUser} />;
      case 'booking':
        return <BookingWizard onComplete={() => handlePageChange('dashboard')} onCancel={() => handlePageChange('dashboard')} currentUser={currentUser} />;
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
        return <JobDetail job={selectedJob} onBack={() => handlePageChange('dashboard')} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-400">
            Page is under construction...
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <StarRain />
      <div className="flex w-full flex-1 relative z-10">
        <Sidebar
          role={role}
          activePage={activePage}
          onPageChange={handlePageChange}
          onLogout={handleLogout}
          currentUser={currentUser}
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-14 sm:h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-20 transition-colors duration-200">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Open navigation"
              >
                <Menu size={18} />
              </button>
              {activePage !== 'dashboard' && (
                <button
                  onClick={() => handlePageChange('dashboard')}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 text-slate-500 transition-all"
                  title="Back to dashboard"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <h2 className="text-sm sm:text-lg font-semibold capitalize truncate">{activePage.replace('-', ' ')}</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {currentUser && (
                <span className="hidden xl:block text-xs text-slate-500 dark:text-slate-400">
                  {currentUser.fullName} · <span className="font-bold text-blue-600">{currentUser.role}</span>
                </span>
              )}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Lab Status: Online
              </div>
              <ThemeToggle />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

