'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DynamicIcon, ICON_COLORS, AVAILABLE_ICONS } from '@/lib/icons';
import { useAppStore } from '@/store/useAppStore';
import type { Account } from '@/types';

export default function AccountsView() {
  const { triggerRefresh, refreshKey, user } = useAppStore();
  const hid = user?.householdId;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({ name: '', currency: 'ARS' as 'ARS' | 'USD', balance: 0, color: '#6366f1', icon: 'Wallet' });
  const [iconSearch, setIconSearch] = useState('');
  const [showIcons, setShowIcons] = useState(false);

  useEffect(() => {
    if (!hid) return;
    fetch(`/api/accounts?householdId=${hid}`).then(r => r.ok ? r.json() : []).then(setAccounts);
  }, [refreshKey, hid]);

  const resetForm = () => {
    setForm({ name: '', currency: 'ARS', balance: 0, color: '#6366f1', icon: 'Wallet' });
    setEditing(null);
    setShowIcons(false);
    setIconSearch('');
  };

  const handleSave = async () => {
    if (!form.name) return;
    if (editing) {
      await fetch('/api/accounts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...form, householdId: hid }) });
    } else {
      await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, householdId: hid }) });
    }
    setOpen(false);
    resetForm();
    triggerRefresh();
  };

  const handleEdit = (acc: Account) => {
    setEditing(acc);
    setForm({ name: acc.name, currency: acc.currency as 'ARS' | 'USD', balance: acc.balance, color: acc.color, icon: acc.icon });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta cuenta? Las transacciones asociadas también se eliminarán.')) return;
    await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
    triggerRefresh();
  };

  const fmtARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

  const arsTotal = accounts.filter(a => a.currency === 'ARS').reduce((s, a) => s + a.balance, 0);
  const usdTotal = accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0);

  const filteredIcons = iconSearch
    ? AVAILABLE_ICONS.filter(i => i.toLowerCase().includes(iconSearch.toLowerCase()))
    : AVAILABLE_ICONS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cuentas</h2>
          <p className="text-slate-500 text-sm">Gestione sus cuentas bancarias y de efectivo</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <DynamicIcon name="Plus" className="w-4 h-4 mr-2" />Nueva Cuenta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Cuenta' : 'Nueva Cuenta'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Cuenta Nación" />
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v as 'ARS' | 'USD' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">🇦🇷 Pesos Argentinos (ARS)</SelectItem>
                    <SelectItem value="USD">🇺🇸 Dólares Estadounidenses (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editing && (
                <div className="space-y-2">
                  <Label>Saldo Inicial</Label>
                  <Input type="number" value={form.balance || ''} onChange={e => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })} placeholder="0" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {ICON_COLORS.map(c => (
                    <button key={c} className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110" style={{ backgroundColor: c, borderColor: form.color === c ? 'black' : 'transparent' }} onClick={() => setForm({ ...form, color: c })} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ícono</Label>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowIcons(!showIcons)}>
                  <DynamicIcon name={form.icon} className="w-4 h-4" />{form.icon}
                  <span className="text-xs text-slate-400">(clic para cambiar)</span>
                </Button>
                {showIcons && (
                  <div className="space-y-2">
                    <Input placeholder="Buscar ícono..." value={iconSearch} onChange={e => setIconSearch(e.target.value)} />
                    <div className="h-48 overflow-y-auto rounded-lg border p-2 grid grid-cols-8 gap-1">
                      {filteredIcons.map(icon => (
                        <button key={icon} className={`w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100 transition-colors ${form.icon === icon ? 'bg-emerald-100 ring-2 ring-emerald-500' : ''}`} onClick={() => { setForm({ ...form, icon }); setShowIcons(false); }} title={icon}>
                          <DynamicIcon name={icon} className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={!form.name}>
                {editing ? 'Guardar Cambios' : 'Crear Cuenta'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50">
          <CardContent className="p-5">
            <p className="text-sm text-emerald-700 font-medium">Total en Pesos (ARS)</p>
            <p className="text-3xl font-bold text-emerald-800 mt-1">{fmtARS(arsTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-r from-teal-50 to-cyan-50">
          <CardContent className="p-5">
            <p className="text-sm text-teal-700 font-medium">Total en Dólares (USD)</p>
            <p className="text-3xl font-bold text-teal-800 mt-1">{fmtUSD(usdTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <Card key={acc.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${acc.color}15` }}>
                    <DynamicIcon name={acc.icon} className="w-5 h-5" style={{ color: acc.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{acc.name}</h3>
                    <p className="text-xs text-slate-400">{acc.currency === 'ARS' ? '🇦🇷 ARS' : '🇺🇸 USD'} · {acc._count?.transactions || 0} transacciones</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(acc)}><DynamicIcon name="Edit" className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => handleDelete(acc.id)}><DynamicIcon name="Trash2" className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <p className={`text-2xl font-bold mt-4 ${acc.currency === 'USD' ? 'text-teal-700' : 'text-emerald-700'}`}>
                {acc.currency === 'USD' ? fmtUSD(acc.balance) : fmtARS(acc.balance)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
