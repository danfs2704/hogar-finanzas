'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DynamicIcon } from '@/lib/icons';
import { useAppStore } from '@/store/useAppStore';

interface HouseholdData {
  id: string;
  name: string;
  description: string | null;
  _count: { users: number; accounts: number; transactions: number };
}

export default function SettingsView() {
  const { user, triggerRefresh, refreshKey } = useAppStore();
  const householdId = user?.householdId;

  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    fetch(`/api/household?id=${householdId}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: HouseholdData | null) => {
        if (data) {
          setHousehold(data);
          setForm({ name: data.name, description: data.description || '' });
        }
      });
  }, [householdId, refreshKey]);

  const handleSave = async () => {
    if (!form.name || !householdId) return;
    setSaving(true);
    try {
      await fetch('/api/household', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: householdId, name: form.name, description: form.description || null }),
      });
      setEditing(false);
      triggerRefresh();
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    if (household) {
      setForm({ name: household.name, description: household.description || '' });
    }
  };

  const STATS = [
    { label: 'Usuarios', value: household?._count.users ?? 0, icon: 'Users', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Cuentas', value: household?._count.accounts ?? 0, icon: 'Wallet', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Transacciones', value: household?._count.transactions ?? 0, icon: 'Receipt', color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configuración</h2>
        <p className="text-slate-500 text-sm">Administre la configuración del hogar</p>
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

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <DynamicIcon name="Home" className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg text-slate-800">Datos del Hogar</CardTitle>
                <p className="text-xs text-slate-400">ID: {householdId}</p>
              </div>
            </div>
            {!editing && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(true)}>
                <DynamicIcon name="Edit" className="w-3.5 h-3.5" />Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          {editing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre del Hogar</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre del hogar" />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descripción opcional del hogar" rows={3} />
              </div>
              <div className="flex gap-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving || !form.name}>
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button variant="outline" onClick={cancelEdit}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">Nombre</p>
                <p className="font-semibold text-slate-800">{household?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Descripción</p>
                <p className="text-slate-600 text-sm">{household?.description || 'Sin descripción'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <DynamicIcon name="User" className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-slate-800">Mi Cuenta</CardTitle>
              <p className="text-xs text-slate-400">Información de su usuario</p>
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
              <p className="text-slate-500 text-sm">{user?.email}</p>
              <p className="text-slate-400 text-xs mt-1">Hogar: {user?.householdName || household?.name || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
