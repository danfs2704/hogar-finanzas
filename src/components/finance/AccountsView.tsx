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
import { formatInputValue, parseLatam, formatCurrencyARS, formatCurrencyUSD } from '@/lib/format';
import type { Account, AccountType } from '@/types';

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string; color: string }[] = [
  { value: 'bank', label: 'Banco', icon: 'Landmark', color: '#3b82f6' },
  { value: 'cash', label: 'Efectivo', icon: 'Banknote', color: '#22c55e' },
  { value: 'virtual_wallet', label: 'Monedero Virtual', icon: 'Smartphone', color: '#8b5cf6' },
];

export default function AccountsView() {
  const { triggerRefresh, refreshKey, user } = useAppStore();
  const hid = user?.householdId;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState({ name: '', type: 'bank' as AccountType, currency: 'ARS' as 'ARS' | 'USD', balance: '', color: '#6366f1', icon: 'Wallet' });
  const [iconSearch, setIconSearch] = useState('');
  const [showIcons, setShowIcons] = useState(false);

  useEffect(() => {
    if (!hid) return;
    fetch(`/api/accounts?householdId=${hid}`).then(r => r.ok ? r.json() : []).then(setAccounts);
  }, [refreshKey, hid]);

  const resetForm = () => {
    setForm({ name: '', type: 'bank', currency: 'ARS', balance: '', color: '#6366f1', icon: 'Wallet' });
    setEditing(null);
    setShowIcons(false);
    setIconSearch('');
  };

  const handleSave = async () => {
    if (!form.name) return;
    const payload: Record<string, unknown> = { name: form.name, type: form.type, currency: form.currency, color: form.color, icon: form.icon, householdId: hid };
    if (!editing) {
      payload.balance = parseLatam(form.balance);
    }
    if (editing) {
      await fetch('/api/accounts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...payload }) });
    } else {
      await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }
    setOpen(false);
    resetForm();
    triggerRefresh();
  };

  const handleEdit = (acc: Account) => {
    setEditing(acc);
    setForm({ name: acc.name, type: acc.type || 'bank', currency: acc.currency as 'ARS' | 'USD', balance: formatInputValue(acc.balance.toString()), color: acc.color, icon: acc.icon });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta cuenta? Las transacciones asociadas también se eliminarán.')) return;
    await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
    triggerRefresh();
  };

  const arsTotal = accounts.filter(a => a.currency === 'ARS').reduce((s, a) => s + a.balance, 0);
  const usdTotal = accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0);

  const filteredIcons = iconSearch
    ? AVAILABLE_ICONS.filter(i => i.toLowerCase().includes(iconSearch.toLowerCase()))
    : AVAILABLE_ICONS;

  const getTypeLabel = (type?: string) => {
    return ACCOUNT_TYPES.find(t => t.value === type)?.label || type || 'Banco';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cuentas</h2>
          <p className="text-slate-500 text-sm">Gestione sus cuentas bancarias, de efectivo y monederos virtuales</p>
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
                <Label>Tipo de Cuenta</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ACCOUNT_TYPES.map(t => (
                    <button
                      key={t.value}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${form.type === t.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}
                      onClick={() => setForm({ ...form, type: t.value })}
                    >
                      <DynamicIcon name={t.icon} className="w-5 h-5" style={{ color: t.color }} />
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  ))}
                </div>
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
                  <Input value={form.balance} onChange={e => setForm({ ...form, balance: formatInputValue(e.target.value) })} placeholder="0" className="font-mono" />
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
            <p className="text-3xl font-bold text-emerald-800 mt-1">{formatCurrencyARS(arsTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-r from-teal-50 to-cyan-50">
          <CardContent className="p-5">
            <p className="text-sm text-teal-700 font-medium">Total en Dólares (USD)</p>
            <p className="text-3xl font-bold text-teal-800 mt-1">{formatCurrencyUSD(usdTotal)}</p>
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
                    <p className="text-xs text-slate-400">
                      {acc.currency === 'ARS' ? '🇦🇷 ARS' : '🇺🇸 USD'} · {getTypeLabel(acc.type)} · {acc._count?.transactions || 0} transacciones
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(acc)}><DynamicIcon name="Edit" className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => handleDelete(acc.id)}><DynamicIcon name="Trash2" className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <p className={`text-2xl font-bold mt-4 ${acc.currency === 'USD' ? 'text-teal-700' : 'text-emerald-700'}`}>
                {acc.currency === 'USD' ? formatCurrencyUSD(acc.balance) : formatCurrencyARS(acc.balance)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
