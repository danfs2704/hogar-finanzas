'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DynamicIcon, ICON_COLORS, AVAILABLE_ICONS } from '@/lib/icons';
import { useAppStore } from '@/store/useAppStore';
import type { Category } from '@/types';

function IconPicker({ form, setForm, show, setShow, search, setSearch, filtered }: {
  form: { icon: string; color: string }; setForm: (f: Record<string, unknown>) => void; show: boolean; setShow: (v: boolean) => void; search: string; setSearch: (v: string) => void; filtered: string[];
}) {
  return (
    <div className="space-y-2">
      <Button variant="outline" className="w-full justify-start gap-2" type="button" onClick={() => setShow(!show)}>
        <DynamicIcon name={form.icon} className="w-4 h-4" style={{ color: form.color }} />{form.icon}
      </Button>
      {show && (
        <div className="space-y-2">
          <Input placeholder="Buscar ícono..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="h-48 overflow-y-auto rounded-lg border p-2 grid grid-cols-8 gap-1">
            {filtered.map(icon => (
              <button key={icon} type="button" className={`w-8 h-8 rounded flex items-center justify-center hover:bg-slate-100 transition-colors ${form.icon === icon ? 'bg-emerald-100 ring-2 ring-emerald-500' : ''}`} onClick={() => { setForm({ ...form, icon }); setShow(false); }} title={icon}>
                <DynamicIcon name={icon} className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CategoriesView() {
  const { triggerRefresh, refreshKey } = useAppStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [catForm, setCatForm] = useState({ name: '', type: 'expense' as 'expense' | 'income', icon: 'Tag', color: '#6366f1' });
  const [subForm, setSubForm] = useState({ name: '', icon: 'CircleDot', color: '#6366f1' });
  const [iconSearch, setIconSearch] = useState('');
  const [showIcons, setShowIcons] = useState(false);
  const [showSubIcons, setShowSubIcons] = useState(false);
  const [subIconSearch, setSubIconSearch] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : []).then(setCategories);
  }, [refreshKey]);

  const expenses = categories.filter(c => c.type === 'expense');
  const incomes = categories.filter(c => c.type === 'income');

  const saveCategory = async () => {
    if (!catForm.name) return;
    if (editCat) {
      await fetch('/api/categories', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editCat.id, name: catForm.name, icon: catForm.icon, color: catForm.color }) });
    } else {
      await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(catForm) });
    }
    setOpen(false); resetCatForm(); triggerRefresh();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría y sus subcategorías?')) return;
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' }); triggerRefresh();
  };

  const saveSubcategory = async () => {
    if (!subForm.name || !selectedCatId) return;
    await fetch('/api/subcategories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...subForm, categoryId: selectedCatId }) });
    setOpenSub(false); resetSubForm(); triggerRefresh();
  };

  const deleteSubcategory = async (id: string) => {
    if (!confirm('¿Eliminar esta subcategoría?')) return;
    await fetch(`/api/subcategories?id=${id}`, { method: 'DELETE' }); triggerRefresh();
  };

  const resetCatForm = () => { setCatForm({ name: '', type: 'expense', icon: 'Tag', color: '#6366f1' }); setEditCat(null); setShowIcons(false); setIconSearch(''); };
  const resetSubForm = () => { setSubForm({ name: '', icon: 'CircleDot', color: '#6366f1' }); setShowSubIcons(false); setSubIconSearch(''); };

  const filteredIcons = iconSearch ? AVAILABLE_ICONS.filter(i => i.toLowerCase().includes(iconSearch.toLowerCase())) : AVAILABLE_ICONS;
  const filteredSubIcons = subIconSearch ? AVAILABLE_ICONS.filter(i => i.toLowerCase().includes(subIconSearch.toLowerCase())) : AVAILABLE_ICONS;

  const renderCategoryList = (cats: Category[]) => (
    <div className="space-y-3">
      {cats.map(cat => (
        <Card key={cat.id} className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div 
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/50"
              onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}15` }}>
                  <DynamicIcon name={cat.icon} className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">{cat.name}</h3>
                  <p className="text-xs text-slate-400">{cat.subcategories?.length || 0} subcategorías · {cat._count?.transactions || 0} transacciones{cat.isDefault ? ' · Predeterminada' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditCat(cat); setCatForm({ name: cat.name, type: cat.type, icon: cat.icon, color: cat.color }); setOpen(true); }}>
                  <DynamicIcon name="Edit" className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}>
                  <DynamicIcon name="Trash2" className="w-3.5 h-3.5" />
                </Button>
                <DynamicIcon name={expandedCat === cat.id ? 'ChevronUp' : 'ChevronDown'} className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            {expandedCat === cat.id && cat.subcategories && cat.subcategories.length > 0 && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.subcategories.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <DynamicIcon name={sub.icon} className="w-4 h-4 flex-shrink-0" style={{ color: sub.color }} />
                        <span className="text-sm text-slate-600 truncate">{sub.name}</span>
                        <span className="text-xs text-slate-400">({sub._count?.transactions || 0})</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 flex-shrink-0" onClick={() => deleteSubcategory(sub.id)}>
                        <DynamicIcon name="X" className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => { setSelectedCatId(cat.id); setOpenSub(true); }}>
                  <DynamicIcon name="Plus" className="w-3 h-3 mr-1" />Agregar Subcategoría
                </Button>
              </div>
            )}
            {expandedCat === cat.id && (!cat.subcategories || cat.subcategories.length === 0) && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                <p className="text-xs text-slate-400 mb-2">Sin subcategorías</p>
                <Button variant="outline" size="sm" onClick={() => { setSelectedCatId(cat.id); setOpenSub(true); }}>
                  <DynamicIcon name="Plus" className="w-3 h-3 mr-1" />Agregar Subcategoría
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Categorías</h2>
          <p className="text-slate-500 text-sm">Organice gastos e ingresos con categorías y subcategorías</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetCatForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><DynamicIcon name="Plus" className="w-4 h-4 mr-2" />Nueva Categoría</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editCat ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Nombre de la categoría" />
              </div>
              {!editCat && (
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={catForm.type} onValueChange={v => setCatForm({ ...catForm, type: v as 'expense' | 'income' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Gasto</SelectItem>
                      <SelectItem value="income">Ingreso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {ICON_COLORS.map(c => (
                    <button key={c} type="button" className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110" style={{ backgroundColor: c, borderColor: catForm.color === c ? 'black' : 'transparent' }} onClick={() => setCatForm({ ...catForm, color: c })} />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ícono</Label>
                <IconPicker form={catForm} setForm={(f) => setCatForm(f as typeof catForm)} show={showIcons} setShow={setShowIcons} search={iconSearch} setSearch={setIconSearch} filtered={filteredIcons} />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={saveCategory} disabled={!catForm.name}>
                {editCat ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={openSub} onOpenChange={(v) => { setOpenSub(v); if (!v) resetSubForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva Subcategoría</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} placeholder="Ej: Supermercado" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_COLORS.map(c => (
                  <button key={c} type="button" className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110" style={{ backgroundColor: c, borderColor: subForm.color === c ? 'black' : 'transparent' }} onClick={() => setSubForm({ ...subForm, color: c })} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ícono</Label>
              <IconPicker form={subForm} setForm={(f) => setSubForm(f as typeof subForm)} show={showSubIcons} setShow={setShowSubIcons} search={subIconSearch} setSearch={setSubIconSearch} filtered={filteredSubIcons} />
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={saveSubcategory} disabled={!subForm.name}>Crear</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses" className="gap-2"><DynamicIcon name="TrendingDown" className="w-4 h-4" />Gastos ({expenses.length})</TabsTrigger>
          <TabsTrigger value="incomes" className="gap-2"><DynamicIcon name="TrendingUp" className="w-4 h-4" />Ingresos ({incomes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses" className="mt-4">{renderCategoryList(expenses)}</TabsContent>
        <TabsContent value="incomes" className="mt-4">{renderCategoryList(incomes)}</TabsContent>
      </Tabs>
    </div>
  );
}
