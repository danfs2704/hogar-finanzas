'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DynamicIcon } from '@/lib/icons';
import { useAppStore } from '@/store/useAppStore';
import type { HouseholdMember, Pet } from '@/types';

export default function MembersView() {
  const { triggerRefresh, refreshKey } = useAppStore();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [openMember, setOpenMember] = useState(false);
  const [openPet, setOpenPet] = useState(false);
  const [editMember, setEditMember] = useState<HouseholdMember | null>(null);
  const [editPet, setEditPet] = useState<Pet | null>(null);
  const [memberForm, setMemberForm] = useState({ name: '', isMinor: false, notes: '' });
  const [petForm, setPetForm] = useState({ name: '', species: 'Perro', breed: '', notes: '' });

  useEffect(() => {
    Promise.all([fetch('/api/members'), fetch('/api/pets')]).then(([m, p]) => {
      if (m.ok) m.json().then(setMembers);
      if (p.ok) p.json().then(setPets);
    });
  }, [refreshKey]);

  const handleSaveMember = async () => {
    if (!memberForm.name) return;
    if (editMember) {
      await fetch('/api/members', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editMember.id, ...memberForm }) });
    } else {
      await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(memberForm) });
    }
    setOpenMember(false);
    setEditMember(null);
    setMemberForm({ name: '', isMinor: false, notes: '' });
    triggerRefresh();
  };

  const handleSavePet = async () => {
    if (!petForm.name) return;
    if (editPet) {
      await fetch('/api/pets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editPet.id, ...petForm }) });
    } else {
      await fetch('/api/pets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(petForm) });
    }
    setOpenPet(false);
    setEditPet(null);
    setPetForm({ name: '', species: 'Perro', breed: '', notes: '' });
    triggerRefresh();
  };

  const deleteMember = async (id: string) => {
    if (!confirm('¿Eliminar este miembro?')) return;
    await fetch(`/api/members?id=${id}`, { method: 'DELETE' });
    triggerRefresh();
  };

  const deletePet = async (id: string) => {
    if (!confirm('¿Eliminar esta mascota?')) return;
    await fetch(`/api/pets?id=${id}`, { method: 'DELETE' });
    triggerRefresh();
  };

  const SPECIES = ['Perro', 'Gato', 'Pájaro', 'Pez', 'Hámster', 'Conejo', 'Tortuga', 'Caballo', 'Gato', 'Otros'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Hogar</h2>
        <p className="text-slate-500 text-sm">Administre los integrantes y mascotas del hogar</p>
      </div>

      <Tabs defaultValue="members">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="members" className="gap-2"><DynamicIcon name="Users" className="w-4 h-4" />Miembros ({members.length})</TabsTrigger>
            <TabsTrigger value="pets" className="gap-2"><DynamicIcon name="PawPrint" className="w-4 h-4" />Mascotas ({pets.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="members">
          <div className="flex justify-end mb-4">
            <Dialog open={openMember} onOpenChange={(v) => { setOpenMember(v); if (!v) { setEditMember(null); setMemberForm({ name: '', isMinor: false, notes: '' }); } }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700"><DynamicIcon name="UserPlus" className="w-4 h-4 mr-2" />Agregar Miembro</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editMember ? 'Editar Miembro' : 'Nuevo Miembro'}</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} placeholder="Nombre completo" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={memberForm.isMinor} onCheckedChange={(v) => setMemberForm({ ...memberForm, isMinor: !!v })} id="minor-check" />
                    <Label htmlFor="minor-check" className="text-sm">Es menor de edad (no podrá iniciar sesión)</Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Notas (opcional)</Label>
                    <Input value={memberForm.notes} onChange={e => setMemberForm({ ...memberForm, notes: e.target.value })} placeholder="Ej: Hijo mayor, encargado de compras" />
                  </div>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveMember} disabled={!memberForm.name}>
                    {editMember ? 'Guardar' : 'Agregar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(m => (
              <Card key={m.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white ${m.isMinor ? 'bg-amber-400' : 'bg-slate-600'}`}>
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{m.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${m.isMinor ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {m.isMinor ? 'Menor' : 'Adulto'}
                          </span>
                          <span className="text-xs text-slate-400">{m._count?.transactions || 0} transacciones</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditMember(m); setMemberForm({ name: m.name, isMinor: m.isMinor, notes: m.notes || '' }); setOpenMember(true); }}>
                        <DynamicIcon name="Edit" className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => deleteMember(m.id)}>
                        <DynamicIcon name="Trash2" className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {m.notes && <p className="text-xs text-slate-400 mt-3 border-t pt-2">{m.notes}</p>}
                </CardContent>
              </Card>
            ))}
            {members.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400">
                <DynamicIcon name="Users" className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Agregue miembros del hogar</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pets">
          <div className="flex justify-end mb-4">
            <Dialog open={openPet} onOpenChange={(v) => { setOpenPet(v); if (!v) { setEditPet(null); setPetForm({ name: '', species: 'Perro', breed: '', notes: '' }); } }}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700"><DynamicIcon name="Plus" className="w-4 h-4 mr-2" />Agregar Mascota</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editPet ? 'Editar Mascota' : 'Nueva Mascota'}</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={petForm.name} onChange={e => setPetForm({ ...petForm, name: e.target.value })} placeholder="Nombre de la mascota" />
                  </div>
                  <div className="space-y-2">
                    <Label>Especie</Label>
                    <Select value={petForm.species} onValueChange={v => setPetForm({ ...petForm, species: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SPECIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Raza (opcional)</Label>
                    <Input value={petForm.breed} onChange={e => setPetForm({ ...petForm, breed: e.target.value })} placeholder="Ej: Golden Retriever" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notas (opcional)</Label>
                    <Input value={petForm.notes} onChange={e => setPetForm({ ...petForm, notes: e.target.value })} placeholder="Ej: Alimento especial, alergias" />
                  </div>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSavePet} disabled={!petForm.name}>
                    {editPet ? 'Guardar' : 'Agregar'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map(p => (
              <Card key={p.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-violet-100 flex items-center justify-center">
                        <DynamicIcon name="PawPrint" className="w-5 h-5 text-violet-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{p.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{p.species}{p.breed ? ` · ${p.breed}` : ''}</span>
                          <span className="text-xs text-slate-400">{p._count?.transactions || 0} gastos</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditPet(p); setPetForm({ name: p.name, species: p.species, breed: p.breed || '', notes: p.notes || '' }); setOpenPet(true); }}>
                        <DynamicIcon name="Edit" className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => deletePet(p.id)}>
                        <DynamicIcon name="Trash2" className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {p.notes && <p className="text-xs text-slate-400 mt-3 border-t pt-2">{p.notes}</p>}
                </CardContent>
              </Card>
            ))}
            {pets.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400">
                <DynamicIcon name="PawPrint" className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Agregue mascotas para rastrear sus gastos</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
