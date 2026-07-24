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
  const [loginEmail, setLoginEmail] = useState('admin@hogar.com');
  const [loginPass, setLoginPass] = useState('admin123');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: loginEmail, password: loginPass }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data as User);
        localStorage.setItem('user', JSON.stringify(data));
      } else {
        setError(data.error || 'Error al iniciar sesión');
      }
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!regName || !regEmail || !regPass) { setError('Todos los campos son requeridos'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', email: regEmail, password: regPass, name: regName }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data as User);
        localStorage.setItem('user', JSON.stringify(data));
      } else {
        setError(data.error || 'Error al registrarse');
      }
    } catch {
      setError('Error de conexión');
    }
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
          <CardDescription>Administre las finanzas de su hogar de forma simple</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
          )}
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@hogar.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-pass">Contraseña</Label>
                <Input id="login-pass" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••" />
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={loading}>
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
              <p className="text-xs text-center text-slate-400 mt-2">Demo: admin@hogar.com / admin123</p>
            </TabsContent>
            <TabsContent value="register" className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Nombre completo</Label>
                <Input id="reg-name" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email</Label>
                <Input id="reg-email" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="juan@ejemplo.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-pass">Contraseña</Label>
                <Input id="reg-pass" type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <Button className="w-full" onClick={handleRegister} disabled={loading}>
                {loading ? 'Registrando...' : 'Crear Cuenta'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
