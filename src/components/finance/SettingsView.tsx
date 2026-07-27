'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DynamicIcon } from '@/lib/icons';
import { useAppStore } from '@/store/useAppStore';

interface StatsData {
  _count: { users: number; accounts: number; transactions: number };
}

export default function SettingsView() {
  const { user, triggerRefresh, refreshKey } = useAppStore();
  const householdId = user?.householdId;

  const [stats, setStats] = useState<StatsData | null>(null);
  const [saving, setSaving] = useState(false);

  // Password change state
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // DB location state
  const [dbPath, setDbPath] = useState('Cargando...');
  const [dbChanging, setDbChanging] = useState(false);
  const [dbMsg, setDbMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!householdId) return;
    fetch(`/api/household?id=${householdId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: StatsData | null) => {
        if (data) setStats(data);
      });
    // Load DB path
    fetch('/api/settings/db-path')
      .then(r => r.ok ? r.json() : null)
      .then((data: { path: string } | null) => {
        if (data) setDbPath(data.path);
      });
  }, [householdId, refreshKey]);

  const handleChangePassword = () => {
    if (!user?.id) return;
    if (newPassword.length < 6) { setPwMsg({ type: 'err', text: 'La contraseña debe tener al menos 6 caracteres' }); return; }
    if (newPassword !== confirmPassword) { setPwMsg({ type: 'err', text: 'Las contraseñas no coinciden' }); return; }
    setPwLoading(true);
    setPwMsg(null);
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'changePassword', userId: user.id, password: newPassword }),
    }).then(r => r.json()).then(data => {
      if (data.success) {
        setPwMsg({ type: 'ok', text: 'Contraseña actualizada correctamente' });
        setNewPassword(''); setConfirmPassword(''); setShowPwForm(false);
      } else {
        setPwMsg({ type: 'err', text: data.error || 'Error al cambiar la contraseña' });
      }
    }).catch(() => setPwMsg({ type: 'err', text: 'Error de conexión' })).finally(() => setPwLoading(false));
  };

  const handleChangeDbLocation = async () => {
    try {
      // Dynamically import Tauri dialog plugin (only available in desktop app)
      const { open } = await import('@tauri-apps/plugin-dialog');
      const folder = await open({
        directory: true,
        title: 'Elegir ubicación para la base de datos',
      });
      if (!folder) return;

      setDbChanging(true);
      setDbMsg(null);
      const res = await fetch('/api/settings/db-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folder }),
      });
      const data = await res.json();
      if (res.ok) {
        setDbPath(data.path);
        setDbMsg({ type: 'ok', text: 'Ubicación cambiada. La base de datos fue copiada. Reiniciá la aplicación para usar la nueva ubicación.' });
      } else {
        setDbMsg({ type: 'err', text: data.error || 'Error al cambiar la ubicación' });
      }
    } catch {
      setDbMsg({ type: 'err', text: 'No se pudo abrir el selector de carpetas. Verificá que estés usando la aplicación de escritorio.' });
    } finally {
      setDbChanging(false);
    }
  };

  const STATS = [
    { label: 'Usuarios', value: stats?._count.users ?? 0, icon: 'Users', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Cuentas', value: stats?._count.accounts ?? 0, icon: 'Wallet', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Transacciones', value: stats?._count.transactions ?? 0, icon: 'Receipt', color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configuración</h2>
        <p className="text-slate-500 text-sm">Administrar cuenta y preferencias</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATS.map(s => (
          <Card key={s.label} className={`border-0 shadow-sm ${s.bg}`}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/70 flex items-center justify-center">
                  <DynamicIcon name={s.icon} className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mi Cuenta */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <DynamicIcon name="User" className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-800">Mi Cuenta</CardTitle>
              <p className="text-xs text-slate-400">Información de usuario</p>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-xl ${user?.role === 'admin' ? 'bg-emerald-500' : 'bg-slate-500'}`}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800 text-lg">{user?.name}</p>
                <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'} className={user?.role === 'admin' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : ''}>
                  {user?.role === 'admin' ? 'Admin' : 'Miembro'}
                </Badge>
              </div>
              <p className="text-slate-500 text-sm">@{user?.username}{user?.email ? ` · ${user.email}` : ''}</p>
            </div>
          </div>

          <div className="mt-6">
            {pwMsg && (
              <div className={`mb-3 p-3 rounded-lg text-sm ${pwMsg.type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                {pwMsg.text}
              </div>
            )}
            {!showPwForm ? (
              <Button variant="outline" className="gap-2" onClick={() => { setShowPwForm(true); setPwMsg(null); }}>
                <DynamicIcon name="KeyRound" className="w-4 h-4" />Cambiar Contraseña
              </Button>
            ) : (
              <div className="space-y-3 p-4 rounded-lg bg-slate-50 border">
                <p className="text-sm font-medium text-slate-700">Cambiar mi contraseña</p>
                <div className="space-y-2">
                  <Label className="text-xs">Nueva contraseña (mín. 6 caracteres)</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Confirmar contraseña</Label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••" />
                </div>
                <div className="flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleChangePassword} disabled={pwLoading || !newPassword || !confirmPassword}>
                    {pwLoading ? 'Guardando...' : 'Actualizar Contraseña'}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowPwForm(false); setNewPassword(''); setConfirmPassword(''); setPwMsg(null); }}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ubicación de Base de Datos */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <DynamicIcon name="Database" className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-800">Base de Datos</CardTitle>
              <p className="text-xs text-slate-400">Ubicación del archivo de datos</p>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-400 mb-1">Ubicación actual</p>
              <code className="block text-sm font-mono bg-slate-50 px-3 py-2 rounded border border-slate-200 text-slate-700 break-all">{dbPath}</code>
            </div>
            {dbMsg && (
              <div className={`p-3 rounded-lg text-sm ${dbMsg.type === 'ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                {dbMsg.text}
              </div>
            )}
            {isTauri && (
              <Button variant="outline" className="gap-2" onClick={handleChangeDbLocation} disabled={dbChanging}>
                <DynamicIcon name={dbChanging ? 'Loader2' : 'FolderOpen'} className={`w-4 h-4 ${dbChanging ? 'animate-spin' : ''}`} />
                {dbChanging ? 'Copiando...' : 'Cambiar Ubicación'}
              </Button>
            )}
            <p className="text-xs text-slate-400">
              Podés elegir dónde guardar la base de datos (por ejemplo, en un pendrive o carpeta de respaldo).
              Al cambiar la ubicación, el archivo actual se copia a la nueva carpeta.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
