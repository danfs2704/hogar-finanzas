'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import LoginView from '@/components/finance/LoginView';
import SetupView from '@/components/finance/SetupView';
import Sidebar from '@/components/finance/Sidebar';
import DashboardView from '@/components/finance/DashboardView';
import AccountsView from '@/components/finance/AccountsView';
import MembersView from '@/components/finance/MembersView';
import CategoriesView from '@/components/finance/CategoriesView';
import TransactionsView from '@/components/finance/TransactionsView';
import AnalyticsView from '@/components/finance/AnalyticsView';
import UsersView from '@/components/finance/UsersView';
import SettingsView from '@/components/finance/SettingsView';
import { Button } from '@/components/ui/button';
import { DynamicIcon } from '@/lib/icons';

import type { User } from '@/types';

export default function Home() {
  const { currentView, user, setUser } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [checkedSetup, setCheckedSetup] = useState(false);

  // Restore user session
  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try { setUser(JSON.parse(saved) as User); } catch { /* ignore */ }
    }
  }, [setUser]);

  // Check if this is a first run (no users in DB)
  useEffect(() => {
    if (setupDone) return; // skip if user already completed setup
    const saved = localStorage.getItem('user');
    if (saved) {
      // User has a session — skip setup
      setCheckedSetup(true);
      setSetupDone(true);
      return;
    }
    fetch('/api/setup/check')
      .then(r => r.json())
      .then(data => {
        if (!data.isFirstRun) {
          setSetupDone(true); // DB has users, skip setup
        }
        setCheckedSetup(true);
      })
      .catch(() => setCheckedSetup(true)); // on error, show login
  }, [setupDone]);

  // Show setup on first run
  if (!setupDone && checkedSetup) {
    return <SetupView onReady={() => { setSetupDone(true); }} />;
  }

  // Loading state while checking
  if (!checkedSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-slate-400 text-sm">Cargando...</div>
      </div>
    );
  }

  if (!user) return <LoginView />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'accounts': return <AccountsView />;
      case 'members': return <MembersView />;
      case 'categories': return <CategoriesView />;
      case 'transactions': return <TransactionsView />;
      case 'analytics': return <AnalyticsView />;
      case 'users': return <UsersView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex w-64 flex-shrink-0 flex-col fixed inset-y-0 z-50 transition-transform ${sidebarOpen ? 'translate-x-0' : ''}`}>
        <Sidebar />
      </aside>

      {/* Sidebar - Mobile */}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64 min-h-screen">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Mobile header */}
          <div className="md:hidden mb-4">
            <Button variant="outline" size="sm" onClick={() => setSidebarOpen(true)} className="gap-2">
              <DynamicIcon name="Menu" className="w-4 h-4" />
              Menú
            </Button>
          </div>
          {renderView()}
        </div>
      </main>
    </div>
  );
}
