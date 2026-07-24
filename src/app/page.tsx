'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import LoginView from '@/components/finance/LoginView';
import Sidebar from '@/components/finance/Sidebar';
import DashboardView from '@/components/finance/DashboardView';
import AccountsView from '@/components/finance/AccountsView';
import MembersView from '@/components/finance/MembersView';
import CategoriesView from '@/components/finance/CategoriesView';
import TransactionsView from '@/components/finance/TransactionsView';
import AnalyticsView from '@/components/finance/AnalyticsView';
import { Button } from '@/components/ui/button';
import { DynamicIcon } from '@/lib/icons';
import { useState } from 'react';

import type { User } from '@/types';

export default function Home() {
  const { currentView, user, setUser } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try { setUser(JSON.parse(saved) as User); } catch { /* ignore */ }
    }
  }, [setUser]);

  if (!user) return <LoginView />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'accounts': return <AccountsView />;
      case 'members': return <MembersView />;
      case 'categories': return <CategoriesView />;
      case 'transactions': return <TransactionsView />;
      case 'analytics': return <AnalyticsView />;
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