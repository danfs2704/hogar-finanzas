'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicIcon } from '@/lib/icons';
import { useAppStore } from '@/store/useAppStore';
import { formatInputValue, parseLatam, formatCurrencyARS, formatCurrencyUSD } from '@/lib/format';
import { formatLatam } from '@/lib/format';
import CalculatorPopup from './CalculatorPopup';
import InlineCategoryCreate from './InlineCategoryCreate';
import type { Transaction, Account, Category, Subcategory, HouseholdMember, Pet, TransactionType } from '@/types';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: 'Banco',
  cash: 'Efectivo',
  virtual_wallet: 'Monedero Virtual',
};

export default function TransactionsView() {
  const { triggerRefresh, refreshKey, user } = useAppStore();
  const hid = user?.householdId;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [showCalc, setShowCalc] = useState(false);
  const [showNewCat, setShowNewCat] = useState(false);
  const [showNewSub, setShowNewSub] = useState(false);
  const [form, setForm] = useState({
    type: 'expense' as TransactionType,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    accountId: '',
    toAccountId: '',
    categoryId: '',
    subcategoryId: '',
    memberId: '',
    petId: '',
  });
  const calcRef = useRef<HTMLDivElement>(null);

  // Close calculator on outside click
  useEffect(() => {
    if (!showCalc) return;
    const handler = (e: MouseEvent) => {
      if (calcRef.current && !calcRef.current.contains(e.target as Node)) {
        setShowCalc(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCalc]);

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

  const filteredCategories = form.type === 'transfer' ? [] : categories.filter(c => c.type === form.type);
  const selectedCategory = categories.find(c => c.id === form.categoryId);
  const subcategories = selectedCategory?.subcategories || [];

  const handleAmountChange = (val: string) => {
    const formatted = formatInputValue(val);
    setForm(prev => ({ ...prev, amount: formatted }));
  };

  const handleSave = async () => {
    if (form.type === 'transfer') {
      if (!form.amount || !form.accountId || !form.toAccountId) return;
    } else {
      if (!form.amount || !form.description || !form.accountId || !form.categoryId) return;
    }
    const parsedAmount = parseLatam(form.amount);
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: parsedAmount,
        subcategoryId: form.subcategoryId || null,
        memberId: form.memberId || null,
        petId: form.petId || null,
        userId: user?.id || null,
        householdId: hid,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Error al crear transacción');
      return;
    }
    setOpen(false);
    setForm({ type: 'expense', amount: '', description: '', date: new Date().toISOString().split('T')[0], notes: '', accountId: '', toAccountId: '', categoryId: '', subcategoryId: '', memberId: '', petId: '' });
    triggerRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta transacción? El saldo de la cuenta se ajustará automáticamente.')) return;
    await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
    triggerRefresh();
  };

  const fmtAmount = (tx: Transaction) => {
    const cur = tx.account?.currency || 'ARS';
    return cur === 'USD' ? formatCurrencyUSD(tx.amount) : formatCurrencyARS(tx.amount);
  };

  const handleCategoryCreated = (cat: { id: string; name: string; icon: string; color: string; description: string }) => {
    setCategories(prev => [...prev, {
      id: cat.id, name: cat.name, type: form.type as 'expense' | 'income',
      icon: cat.icon, color: cat.color, description: cat.description, isDefault: false,
      subcategories: [], _count: { subcategories: 0, transactions: 0 },
    }]);
    setForm(prev => ({ ...prev, categoryId: cat.id }));
    setShowNewCat(false);
  };

  const handleSubcategoryCreated = (sub: { id: string; name: string; icon: string; color: string; description: string }) => {
    setCategories(prev => prev.map(c => {
      if (c.id === form.categoryId) {
        return { ...c, subcategories: [...(c.subcategories || []), {
          id: sub.id, name: sub.name, icon: sub.icon, color: sub.color,
          description: sub.description, categoryId: form.categoryId, isDefault: false,
          _count: { transactions: 0 },
        }] };
      }
      return c;
    }));
    setForm(prev => ({ ...prev, subcategoryId: sub.id }));
    setShowNewSub(false);
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
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); setShowCalc(false); setShowNewCat(false); setShowNewSub(false); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><DynamicIcon name="Plus" className="w-4 h-4 mr-2" />Nueva Transacción</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nueva Transacción</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Type tabs: Gasto, Ingreso, Transferencia */}
              <Tabs value={form.type} onValueChange={v => { setForm({ ...form, type: v as TransactionType, categoryId: '', subcategoryId: '', toAccountId: '' }); setShowNewCat(false); setShowNewSub(false); }}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="expense" className="gap-1.5 text-xs text-rose-600 data-[state=active]:bg-rose-100 data-[state=active]:text-rose-700"><DynamicIcon name="TrendingDown" className="w-3.5 h-3.5" />Gasto</TabsTrigger>
                  <TabsTrigger value="income" className="gap-1.5 text-xs text-emerald-600 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700"><DynamicIcon name="TrendingUp" className="w-3.5 h-3.5" />Ingreso</TabsTrigger>
                  <TabsTrigger value="transfer" className="gap-1.5 text-xs text-blue-600 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"><DynamicIcon name="ArrowLeftRight" className="w-3.5 h-3.5" />Transferencia</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Amount with calculator */}
              <div className="space-y-2">
                <Label>Monto *</Label>
                <div ref={calcRef}>
                  <div className="relative">
                    <Input
                      value={form.amount}
                      onChange={e => handleAmountChange(e.target.value)}
                      placeholder="0"
                      className="pr-10 text-lg font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-emerald-600"
                      onClick={() => setShowCalc(!showCalc)}
                    >
                      <DynamicIcon name="Calculator" className="w-4 h-4" />
                    </Button>
                  </div>
                  {showCalc && (
                    <div className="mt-2">
                      <CalculatorPopup
                        value={form.amount}
                        onChange={v => { setForm(prev => ({ ...prev, amount: v })); setShowCalc(false); }}
                        onClose={() => setShowCalc(false)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                {form.type === 'transfer' && (
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Opcional" />
                  </div>
                )}
              </div>

              {form.type !== 'transfer' && (
                <div className="space-y-2">
                  <Label>Descripción *</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ej: Compras en Coto" />
                </div>
              )}

              {/* Transfer: From/To accounts */}
              {form.type === 'transfer' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>De (origen) *</Label>
                    <Select value={form.accountId} onValueChange={v => setForm({ ...form, accountId: v })}>
                      <SelectTrigger><SelectValue placeholder="Cuenta origen" /></SelectTrigger>
                      <SelectContent>
                        {accounts.filter(a => a.isActive && a.id !== form.toAccountId).map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            <span className="flex items-center gap-1.5">
                              <DynamicIcon name={a.icon} className="w-3.5 h-3.5" style={{ color: a.color }} />
                              {a.name}
                              <span className="text-xs text-slate-400">({ACCOUNT_TYPE_LABELS[a.type] || a.type})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>A (destino) *</Label>
                    <Select value={form.toAccountId} onValueChange={v => setForm({ ...form, toAccountId: v })}>
                      <SelectTrigger><SelectValue placeholder="Cuenta destino" /></SelectTrigger>
                      <SelectContent>
                        {accounts.filter(a => a.isActive && a.id !== form.accountId).map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            <span className="flex items-center gap-1.5">
                              <DynamicIcon name={a.icon} className="w-3.5 h-3.5" style={{ color: a.color }} />
                              {a.name}
                              <span className="text-xs text-slate-400">({ACCOUNT_TYPE_LABELS[a.type] || a.type})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                /* Normal transaction: single account */
                <div className="space-y-2">
                  <Label>Cuenta *</Label>
                  <Select value={form.accountId} onValueChange={v => setForm({ ...form, accountId: v })}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => a.isActive).map(a => (
                        <SelectItem key={a.id} value={a.id}>
                          <span className="flex items-center gap-1.5">
                            <DynamicIcon name={a.icon} className="w-3.5 h-3.5" style={{ color: a.color }} />
                            {a.name} ({a.currency})
                            <span className="text-xs text-slate-400">{ACCOUNT_TYPE_LABELS[a.type] || ''}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Category & Subcategory (not for transfers) */}
              {form.type !== 'transfer' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoría *</Label>
                    <Select value={form.categoryId} onValueChange={v => { setForm({ ...form, categoryId: v, subcategoryId: '' }); setShowNewCat(false); setShowNewSub(false); }}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {filteredCategories.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-1.5">
                              <DynamicIcon name={c.icon} className="w-3.5 h-3.5" style={{ color: c.color }} />
                              {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!showNewCat && (
                      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-emerald-600" onClick={() => setShowNewCat(true)}>
                        + Crear categoría nueva
                      </Button>
                    )}
                    {showNewCat && (
                      <InlineCategoryCreate
                        mode="category"
                        type={form.type as 'expense' | 'income'}
                        householdId={hid!}
                        onCreated={handleCategoryCreated}
                        onCancel={() => setShowNewCat(false)}
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Subcategoría</Label>
                    <Select value={form.subcategoryId} onValueChange={v => setForm({ ...form, subcategoryId: v })}>
                      <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent>
                        {subcategories.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="flex items-center gap-1.5">
                              <DynamicIcon name={s.icon} className="w-3.5 h-3.5" style={{ color: s.color }} />
                              {s.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.categoryId && !showNewSub && (
                      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs text-emerald-600" onClick={() => setShowNewSub(true)}>
                        + Crear subcategoría nueva
                      </Button>
                    )}
                    {showNewSub && (
                      <InlineCategoryCreate
                        mode="subcategory"
                        parentId={form.categoryId}
                        householdId={hid!}
                        onCreated={handleSubcategoryCreated}
                        onCancel={() => setShowNewSub(false)}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Member & Pet */}
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

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={
                !form.amount || !form.accountId ||
                (form.type === 'transfer' ? !form.toAccountId : (!form.description || !form.categoryId))
              }>
                {form.type === 'transfer' ? 'Registrar Transferencia' : form.type === 'expense' ? 'Registrar Gasto' : 'Registrar Ingreso'}
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
            <SelectItem value="transfer">Transferencias</SelectItem>
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
                  {/* Icon */}
                  {tx.type === 'transfer' ? (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50">
                      <DynamicIcon name="ArrowLeftRight" className="w-5 h-5 text-blue-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${tx.category?.color}15` }}>
                      <DynamicIcon name={tx.category?.icon || 'CircleDot'} className="w-5 h-5" style={{ color: tx.category?.color }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {tx.type === 'transfer' ? (
                        <span className="text-blue-700">Transferencia</span>
                      ) : tx.description}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {tx.type === 'transfer' ? (
                        <span>{tx.account?.name} → {tx.toAccount?.name}</span>
                      ) : (
                        <>
                          {tx.category?.name}{tx.subcategory ? ` · ${tx.subcategory.name}` : ''}
                          {tx.member ? ` · ${tx.member.name}` : ''}
                          {tx.pet ? ` · ${tx.pet.name}` : ''}
                          {' · '}{tx.account?.name}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {tx.type === 'transfer' ? (
                      <p className="text-sm font-semibold text-blue-600">
                        {formatCurrencyARS(tx.amount)}
                      </p>
                    ) : (
                      <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}{fmtAmount(tx)}
                      </p>
                    )}
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
            <p className="text-sm">Registre su primer gasto, ingreso o transferencia</p>
          </div>
        )}
      </div>
    </div>
  );
}
