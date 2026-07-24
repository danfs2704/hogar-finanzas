'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicIcon } from '@/lib/icons';
import { useAppStore } from '@/store/useAppStore';
import type { User } from '@/types';

export default function LoginView() {
  const { setUser } = useAppStore();
  const [tab, setTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('admin@hogar.com');
  const [loginPass, setLoginPass] = useState('admin123');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResult, setForgotResult] = useState<{ message: string; admins: { name: string; email: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', email: loginEmail, password: loginPass }) });
      const data = await res.json();
      if (res.ok) { setUser(data as User); localStorage.setItem('user', JSON.stringify(data)); }
      else setError(data.error || 'Error al iniciar sesión');
    } catch { setError('Error de conexión'); }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!regName || !regEmail || !regPass) { setError('Todos los campos son requeridos'); return; }
    if (regPass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'register', email: regEmail, password: regPass, name: regName }) });
      const data = await res.json();
      if (res.ok) { setUser(data as User); localStorage.setItem('user', JSON.stringify(data)); }
      else setError(data.error || 'Error al registrarse');
    } catch { setError('Error de conexión'); }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!forgotEmail) return;
    setLoading(true); setError(''); setForgotResult(null);
    try {
      const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'forgot', email: forgotEmail }) });
      const data = await res.json();
      if (res.ok) setForgotResult(data);
      else setError(data.error || 'Email no encontrado');
    } catch { setError('Error de conexión'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <DynamicIcon name="Wallet" className="w-8 h-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">Finanzas del Hogar</CardTitle>
          <CardDescription>Gestioná las finanzas de tu hogar de forma simple</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(''); setForgotResult(null); }}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="login">Ingresar</TabsTrigger>
              <TabsTrigger value="register">Crear Hogar</TabsTrigger>
              <TabsTrigger value="forgot">Recuperar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-3">
              <div className="space-y-2"><Label htmlFor="le">Email</Label><Input id="le" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="tu@email.com" /></div>
              <div className="space-y-2"><Label htmlFor="lp">Contraseña</Label><Input id="lp" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••" /></div>
              <Button className="w-full" onClick={handleLogin} disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</Button>
              <p className="text-xs text-center text-slate-400 mt-2">Demo: admin@hogar.com / admin123</p>
            </TabsContent>

            <TabsContent value="register" className="space-y-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs mb-2">
                Al registrarte se crea un nuevo hogar. El primer usuario es el administrador. Podrás invitar a otros después.
              </div>
              <div className="space-y-2"><Label>Nombre completo</Label><Input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Juan Pérez" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="juan@ejemplo.com" /></div>
              <div className="space-y-2"><Label>Contraseña (mín. 6 caracteres)</Label><Input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="••••••" /></div>
              <Button className="w-full" onClick={handleRegister} disabled={loading}>{loading ? 'Creando hogar...' : 'Crear Nuevo Hogar'}</Button>
            </TabsContent>

            <TabsContent value="forgot" className="space-y-3">
              {forgotResult ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium mb-2">{forgotResult.message}</p>
                    <p className="text-xs text-blue-600 font-medium mb-1">Administradores de "{forgotResult.householdName}":</p>
                    {forgotResult.admins.map(a => (
                      <p key={a.email} className="text-sm text-blue-700">• {a.name} — <span className="font-mono">{a.email}</span></p>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setForgotResult(null)}>Volver</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2"><Label>Email registrado</Label><Input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="tu@email.com" /></div>
                  <Button className="w-full" onClick={handleForgot} disabled={loading || !forgotEmail}>{loading ? 'Buscando...' : 'Buscar Administrador'}</Button>
                  <p className="text-xs text-slate-400 text-center">Te mostraremos los contactos del admin de tu hogar para que te restablezcan la contraseña.</p>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
