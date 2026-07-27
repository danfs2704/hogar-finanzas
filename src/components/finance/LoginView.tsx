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
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [forgotId, setForgotId] = useState('');
  const [forgotResult, setForgotResult] = useState<{ message: string; admins: { name: string; email: string | null }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clearError = () => setError('');

  const handleLogin = () => {
    setLoading(true); setError('');
    const isEmail = loginId.includes('@');
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', [isEmail ? 'email' : 'username']: loginId, password: loginPass }),
    }).then(async r => {
      const data = await r.json();
      if (r.ok) { setUser(data as User); localStorage.setItem('user', JSON.stringify(data)); }
      else setError(data.error || 'Error al iniciar sesión');
    }).catch(() => setError('Error de conexión')).finally(() => setLoading(false));
  };

  const handleRegister = () => {
    if (!regName || !regPass) { setError('Nombre y contraseña son requeridos'); return; }
    if (regPass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true); setError('');
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', name: regName, email: regEmail || undefined, password: regPass }),
    }).then(async r => {
      const data = await r.json();
      if (r.ok) { setUser(data as User); localStorage.setItem('user', JSON.stringify(data)); }
      else setError(data.error || 'Error al registrarse');
    }).catch(() => setError('Error de conexión')).finally(() => setLoading(false));
  };

  const handleForgot = () => {
    if (!forgotId) return;
    setLoading(true); setError(''); setForgotResult(null);
    const isEmail = forgotId.includes('@');
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'forgot', [isEmail ? 'email' : 'username']: forgotId }),
    }).then(async r => {
      const data = await r.json();
      if (r.ok) setForgotResult(data);
      else setError(data.error || 'Usuario/email no encontrado');
    }).catch(() => setError('Error de conexión')).finally(() => setLoading(false));
  };

  const handleKeyDown = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === 'Enter') fn();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <DynamicIcon name="Wallet" className="w-8 h-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">Hogar Finanzas</CardTitle>
          <CardDescription>Gestioná las finanzas de tu hogar de forma simple</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(''); setForgotResult(null); }}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="login" className="text-xs">Ingresar</TabsTrigger>
              <TabsTrigger value="register" className="text-xs">Crear Cuenta</TabsTrigger>
              <TabsTrigger value="forgot" className="text-xs">Recuperar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="li">Usuario o Email</Label>
                <Input id="li" value={loginId} onChange={e => setLoginId(e.target.value)} placeholder="tu_usuario o tu@email.com" onKeyDown={e => handleKeyDown(e, handleLogin)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lp">Contraseña</Label>
                <Input id="lp" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••" onKeyDown={e => handleKeyDown(e, handleLogin)} />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleLogin} disabled={loading || !loginId || !loginPass}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs mb-2">
                Se creará tu cuenta de usuario. El primer usuario registrado es el administrador.
              </div>
              <div className="space-y-2">
                <Label>Nombre completo *</Label>
                <Input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label>Email (opcional)</Label>
                <Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="juan@ejemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Contraseña (mín. 6 caracteres) *</Label>
                <Input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="••••••" onKeyDown={e => handleKeyDown(e, handleRegister)} />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleRegister} disabled={loading || !regName || !regPass}>
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Button>
            </TabsContent>

            <TabsContent value="forgot" className="space-y-3">
              {forgotResult ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium mb-2">{forgotResult.message}</p>
                    <p className="text-xs text-blue-600 font-medium mb-1">Administradores:</p>
                    {forgotResult.admins.map(a => (
                      <p key={a.email || a.name} className="text-sm text-blue-700">
                        • {a.name}{a.email ? ` — <span className="font-mono">${a.email}</span>` : ''}
                      </p>
                    ))}
                    <p className="text-xs text-blue-500 mt-3">Pedile al administrador que te restablezca la contraseña desde Configuración → Usuarios.</p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setForgotResult(null)}>Volver</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Usuario o Email registrado</Label>
                    <Input value={forgotId} onChange={e => setForgotId(e.target.value)} placeholder="tu_usuario o tu@email.com" onKeyDown={e => handleKeyDown(e, handleForgot)} />
                  </div>
                  <Button className="w-full" onClick={handleForgot} disabled={loading || !forgotId}>
                    {loading ? 'Buscando...' : 'Buscar Administrador'}
                  </Button>
                  <p className="text-xs text-slate-400 text-center">Te mostraremos los contactos del administrador para que te restablezca la contraseña.</p>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
