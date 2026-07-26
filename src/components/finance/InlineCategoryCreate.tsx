'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DynamicIcon, ICON_COLORS, AVAILABLE_ICONS } from '@/lib/icons';

interface InlineCategoryCreateProps {
  mode: 'category' | 'subcategory';
  type?: 'expense' | 'income';
  parentId?: string; // categoryId for subcategory
  onCreated: (item: { id: string; name: string; icon: string; color: string; description: string }) => void;
  onCancel: () => void;
}

export default function InlineCategoryCreate({ mode, type = 'expense', parentId, onCreated, onCancel }: InlineCategoryCreateProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('Tag');
  const [iconSearch, setIconSearch] = useState('');
  const [showIcons, setShowIcons] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredIcons = iconSearch
    ? AVAILABLE_ICONS.filter(i => i.toLowerCase().includes(iconSearch.toLowerCase()))
    : AVAILABLE_ICONS;

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const url = mode === 'category' ? '/api/categories' : '/api/subcategories';
      const body = mode === 'category'
        ? { name: name.trim(), type, icon, color, description: description.trim() || null }
        : { name: name.trim(), icon, color, categoryId: parentId, description: description.trim() || null };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated({ id: data.id, name: data.name, icon: data.icon, color: data.color, description: data.description || '' });
      }
    } catch (err) {
      console.error('Error creating:', err);
    }
    setLoading(false);
  };

  return (
    <div className="p-3 border border-emerald-200 bg-emerald-50/50 rounded-lg space-y-3">
      <p className="text-sm font-medium text-emerald-800">
        {mode === 'category' ? 'Nueva Categoría' : 'Nueva Subcategoría'}
      </p>
      <Input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nombre"
        className="h-9"
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
      />
      <Input
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Descripción (opcional)"
        className="h-9"
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel(); }}
      />

      {/* Color picker - compact */}
      <div className="flex flex-wrap gap-1.5">
        {ICON_COLORS.slice(0, 12).map(c => (
          <button
            key={c}
            className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-125 ${color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
          />
        ))}
        <button
          className="w-5 h-5 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center text-[8px] text-slate-400 hover:border-slate-600"
          onClick={() => setShowIcons(!showIcons)}
          title="Ver más colores e íconos"
        >
          +
        </button>
      </div>

      {/* Icon picker */}
      {showIcons && (
        <div className="space-y-1.5">
          <Input
            placeholder="Buscar ícono..."
            value={iconSearch}
            onChange={e => setIconSearch(e.target.value)}
            className="h-8 text-xs"
          />
          <div className="flex items-center gap-2 mb-1.5">
            <DynamicIcon name={icon} className="w-4 h-4" style={{ color }} />
            <span className="text-xs text-slate-500">{icon}</span>
          </div>
          <div className="h-32 overflow-y-auto rounded border p-1.5 grid grid-cols-8 gap-0.5">
            {filteredIcons.map(ic => (
              <button
                key={ic}
                className={`w-7 h-7 rounded flex items-center justify-center hover:bg-slate-100 transition-colors ${icon === ic ? 'bg-emerald-100 ring-1 ring-emerald-500' : ''}`}
                onClick={() => { setIcon(ic); setShowIcons(false); }}
                title={ic}
              >
                <DynamicIcon name={ic} className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={handleSave} disabled={!name.trim() || loading}>
          {loading ? 'Creando...' : 'Crear'}
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
