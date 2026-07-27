'use client';

import { useAppStore } from '@/store/useAppStore';
import { DynamicIcon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { ViewMode } from '@/types';

const NAV_ITEMS: { id: ViewMode; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'transactions', label: 'Transacciones', icon: 'ArrowLeftRight' },
  { id: 'accounts', label: 'Cuentas', icon: 'Wallet' },
  { id: 'members', label: 'Personas', icon: 'Users' },
  { id: 'categories', label: 'Categorías', icon: 'Tags' },
  { id: 'analytics', label: 'Análisis', icon: 'BarChart3' },
  { id: 'users', label: 'Usuarios', icon: 'UserCog', adminOnly: true },
  { id: 'settings', label: 'Configuración', icon: 'Settings' },
];

export default function Sidebar() {
  const { currentView, setCurrentView, user, setUser } = useAppStore();
  const hid = user?.householdId;
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => { setUser(null); localStorage.removeItem('user'); };

  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <DynamicIcon name="Wallet" className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-sm truncate">Finanzas Hogar</h1>
          <p className="text-xs text-slate-400 truncate">{user?.name}</p>
        </div>
      </div>
      <Separator className="bg-slate-700" />
      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="space-y-1">
          {NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map(item => (
            <Button key={item.id} variant="ghost"
              className={`w-full justify-start gap-3 h-10 px-3 text-sm ${currentView === item.id ? 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              onClick={() => setCurrentView(item.id)}>
              <DynamicIcon name={item.icon} className="w-4 h-4 flex-shrink-0" />{item.label}
            </Button>
          ))}
        </nav>
      </ScrollArea>
      <Separator className="bg-slate-700" />
      <div className="p-3 space-y-1">
        <div className="px-3 py-1.5 flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${isAdmin ? 'bg-emerald-500' : 'bg-slate-600'}`}>{user?.name?.charAt(0)}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-200 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{isAdmin ? 'Admin' : 'Miembro'}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800" onClick={handleLogout}>
          <DynamicIcon name="LogOut" className="w-4 h-4" />Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}
