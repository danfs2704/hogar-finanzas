'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DynamicIcon } from '@/lib/icons';
import { useAppStore } from '@/store/useAppStore';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  isActive: boolean;
  createdAt: string;
  _count?: { transactions: number };
}

export default function UsersView() {
  const { user, triggerRefresh, refreshKey } = useAppStore();
  const householdId = user?.householdId;

  const [users, setUsers] = useState<UserRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' as 'admin' | 'member' });
  const [editForm, setEditForm] = useState({ name: '', role: 'admin' as 'admin' | 'member', isActive: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    fetch(`/api/users?householdId=${householdId}`)
      .then(r => r.ok ? r.json() : [])
      .then(setUsers);
  }, [householdId, refreshKey]);

  const resetForm = () => {
    setForm({ name: '', email: '', password: '', role: 'member' });
    setEditForm({ name: '', role: 'admin', isActive: true });
    setEditing(null);
  };

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password || !householdId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, householdId }),
      });
      if (res.ok) {
        setOpen(false);
        resetForm();
        triggerRefresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al crear usuario');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setLoading(true);
    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editing.id, ...editForm }),
      });
      setEditOpen(false);
      resetForm();
      triggerRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === user?.id) {
      alert('No puede eliminar su propia cuenta.');
      return;
    }
    if (!confirm('¿Eliminar este usuario? Sus transacciones también se eliminarán.')) return;
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    triggerRefresh();
  };

  const handleToggleActive = async (u: UserRow) => {
    if (u.id === user?.id) {
      alert('No puede desactivar su propia cuenta.');
      return;
    }
    await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, isActive: !u.isActive }),
    });
    triggerRefresh();
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setEditForm({ name: u.name, role: u.role, isActive: u.isActive });
    setEditOpen(true);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Usuarios</h2>
          <p className="text-slate-500 text-sm">Administre los usuarios del hogar</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <DynamicIcon name="UserPlus" className="w-4 h-4 mr-2" />Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre completo" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="correo@ejemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as 'admin' | 'member' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Miembro</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={loading || !form.name || !form.email || !form.password}>
                {loading ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Transacciones</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id} className={!u.isActive ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm ${u.role === 'admin' ? 'bg-emerald-500' : 'bg-slate-500'}`}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500">{u.email}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {u.role === 'admin' ? 'Admin' : 'Miembro'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.isActive}
                      onCheckedChange={() => handleToggleActive(u)}
                      disabled={u.id === user?.id}
                    />
                  </TableCell>
                  <TableCell className="text-slate-500">{u._count?.transactions || 0}</TableCell>
                  <TableCell className="text-slate-400 text-xs">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                        <DynamicIcon name="Edit" className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600"
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === user?.id}
                      >
                        <DynamicIcon name="Trash2" className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <DynamicIcon name="Users" className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-slate-400">No hay usuarios en este hogar</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm({ ...editForm, role: v as 'admin' | 'member' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Miembro</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleUpdate} disabled={loading || !editForm.name}>
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
