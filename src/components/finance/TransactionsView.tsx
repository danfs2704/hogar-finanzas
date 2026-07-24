'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicIcon } from '@/lib/icons';
import { useAppStore } from '@/store/useAppStore';
import type { Transaction, Account, Category, HouseholdMember, Pet } from '@/types';

export default function TransactionsView() {
  const { triggerRefresh, refreshKey, user } = useAppStore();
  const hid = user?.householdId;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'expense' | 'income'>('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [form, setForm] = useState({
    type: 'expense' as 'expense' | 'income',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    accountId: '',
    categoryId: '',
    subcategoryId: '',
    memberId: '',
    petId: '',
  });

  const loadData = useCallback(() => {
    const params = new URLSearchParams();
    if (tab !== 'all') params.set('type', tab);
    if (filterAccount && filterAccount !== 'all') params.set('accountId', filterAccount);
    if (filterMember && filterMember !== 'all') params.set('memberId', filterMember);
    params.set('limit', '100');
    Promise.all([
      fetch(`/api/transactions?householdId=${hid}&${params}`),
      fetch(`/api/accounts?householdId=${hid}`),
      fetch(`/api/categories?householdId=${hid}`),
      fetch(`/api/members?householdId=${hid}`),
      fetch(`/api/pets?householdId=${hid}`),
    ]).then(([txRes, accRes, catRes, memRes, petRes]) => {
      if (txRes.ok) txRes.json().then(setTransactions);
      if (accRes.ok) accRes.json().then(setAccounts);
      if (catRes.ok) catRes.json().then(setCategories);
      if (memRes.ok) memRes.json().then(setMembers);
      if (petRes.ok) petRes.json().then(setPets);
    });
  }, [tab, filterAccount, filterMember]);

  useEffect(() => { loadData(); }, [loadData, refreshKey, hid]);

  const filteredCategories = categories.filter(c => c.type === form.type);
  const selectedCategory = categories.find(c => c.id === form.categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  const handleSave = async () => {
    if (!form.amount || !form.description || !form.accountId || !form.categoryId) return;
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        subcategoryId: form.subcategoryId || null,
        memberId: form.memberId || null,
        petId: form.petId || null,
        userId: user?.id || null,
        householdId: hid,
      }),
    });
    setOpen(false);
    setForm({ type: 'expense', amount: '', description: '', date: new Date().toISOString().split('T')[0], notes: '', accountId: '', categoryId: '', subcategoryId: '', memberId: '', petId: '' });
    triggerRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción? El saldo de la cuenta se ajustará automáticamente.')) return;
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    triggerRefresh();
  };

  const fmtARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

  const fmtAmount = (tx: Transaction) => {
    const cur = tx.account?.currency || 'ARS';
    return cur === 'USD' ? fmtUSD(tx.amount) : fmtARS(tx.amount);
  };

  // Group transactions by date
  const grouped = transactions.reduce((groups, tx) => {
    const dateKey = new Date(tx.date).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(tx);
    return groups;
  }, {} as Record<string, Transaction[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Transacciones</h2>
          <p className="text-slate-500 text-sm">Registre y visualice todos los movimientos</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><DynamicIcon name="Plus" className="w-4 h-4 mr-2" />Nueva Transacción</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nueva Transacción</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <Tabs value={form.type} onValueChange={v => { setForm({ ...form, type: v as any, categoryId: '', subcategoryId: '' }); }}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="expense" className="gap-2 text-rose-600 data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700"><DynamicIcon name="TrendingDown" className="w-4 h-4" />Gasto</TabsTrigger>
                  <TabsTrigger value="income" className="gap-2 text-emerald-600 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700"><DynamicIcon name="TrendingUp" className="w-4 h-4" />Ingreso</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto *</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción *</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ej: Compras en Coto" />
              </div>

              <div className="space-y-2">
                <Label>Cuenta *</Label>
                <Select value={form.accountId} onValueChange={v => setForm({ ...form, accountId: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                  <SelectContent>
                    {accounts.filter(a => a.isActive).map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría *</Label>
                  <Select value={form.categoryId} onValueChange={v => setForm({ ...form, categoryId: v, subcategoryId: '' })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {filteredCategories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subcategoría</Label>
                  <Select value={form.subcategoryId} onValueChange={v => setForm({ ...form, subcategoryId: v })}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {subcategories.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsable</Label>
                  <Select value={form.memberId} onValueChange={v => setForm({ ...form, memberId: v })}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name} {m.isMinor ? '(Menor)' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mascota</Label>
                  <Select value={form.petId} onValueChange={v => setForm({ ...form, petId: v })}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {pets.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.species})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas adicionales" />
              </div>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={!form.amount || !form.description || !form.accountId || !form.categoryId}>
                {form.type === 'expense' ? 'Registrar Gasto' : 'Registrar Ingreso'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={tab} onValueChange={v => setTab(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="expense">Gastos</SelectItem>
            <SelectItem value="income">Ingresos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAccount} onValueChange={v => setFilterAccount(v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todas las cuentas" /></SelectTrigger>
          <SelectContent>
            {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMember} onValueChange={v => setFilterMember(v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([date, txs]) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-slate-500 mb-2 capitalize">{date}</h3>
            <Card className="border-0 shadow-sm overflow-hidden divide-y divide-slate-100">
              {txs.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${tx.category?.color}15` }}>
                    <DynamicIcon name={tx.category?.icon || 'CircleDot'} className="w-5 h-5" style={{ color: tx.category?.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{tx.description}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {tx.category?.name}{tx.subcategory ? ` · ${tx.subcategory.name}` : ''}
                      {tx.member ? ` · ${tx.member.name}` : ''}
                      {tx.pet ? ` · ${tx.pet.name}` : ''}
                      {' · '}{tx.account?.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {tx.type === 'income' ? '+' : '-'}{fmtAmount(tx)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 flex-shrink-0" onClick={() => handleDelete(tx.id)}>
                    <DynamicIcon name="Trash2" className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </Card>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <DynamicIcon name="ArrowLeftRight" className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">No hay transacciones</p>
            <p className="text-sm">Registre su primer gasto o ingreso</p>
          </div>
        )}
      </div>
    </div>
  );
}
