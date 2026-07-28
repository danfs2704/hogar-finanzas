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

const SECURITY_QUESTIONS = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad naciste?',
  '¿Cuál es tu comida favorita?',
  '¿Cuál es el apellido de soltera de tu madre?',
  '¿Cuál fue tu primer auto?',
  '¿Cómo se llama tu mejor amigo de la infancia?',
  '¿Cuál es tu película favorita?',
  '¿En qué escuela primaria estudiaste?',
];

export default function LoginView() {
  const { setUser } = useAppStore();
  const [tab, setTab] = useState('login');
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regSecurityQ, setRegSecurityQ] = useState('');
  const [regSecurityA, setRegSecurityA] = useState('');
  const [forgotId, setForgotId] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotQuestion, setForgotQuestion] = useState('');
  const [forgotUserId, setForgotUserId] = useState('');
  const [forgotAnswer, setForgotAnswer] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotAdmins, setForgotAdmins] = useState<{ name: string; email: string | null }[] | null>(null);
  const [forgotAdminMsg, setForgotAdminMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = () => { setError(''); setSuccess(''); };

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
    if (!regSecurityQ) { setError('Seleccioná una pregunta de seguridad'); return; }
    if (!regSecurityA || regSecurityA.trim().length < 2) { setError('La respuesta de seguridad es requerida (mín. 2 caracteres)'); return; }
    setLoading(true); setError('');
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', name: regName, email: regEmail || undefined, password: regPass, securityQuestion: regSecurityQ, securityAnswer: regSecurityA }),
    }).then(async r => {
      const data = await r.json();
      if (r.ok) { setUser(data as User); localStorage.setItem('user', JSON.stringify(data)); }
      else setError(data.error || 'Error al registrarse');
    }).catch(() => setError('Error de conexión')).finally(() => setLoading(false));
  };

  const handleForgotStep1 = () => {
    if (!forgotId) return;
    setLoading(true); setError(''); setForgotAdmins(null); setForgotAdminMsg('');
    const isEmail = forgotId.includes('@');
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'forgotStep1', [isEmail ? 'email' : 'username']: forgotId }),
    }).then(async r => {
      const data = await r.json();
      if (r.ok) {
        if (data.step === 'answer') {
          setForgotStep(2);
          setForgotQuestion(data.question);
          setForgotUserId(data.userId);
        } else if (data.step === 'admins') {
          setForgotAdmins(data.admins);
          setForgotAdminMsg(data.message);
        }
      } else {
        setError(data.error || 'Usuario/email no encontrado');
      }
    }).catch(() => setError('Error de conexión')).finally(() => setLoading(false));
  };

  const handleForgotStep2 = () => {
    if (!forgotAnswer || !forgotNewPass) { setError('Completá todos los campos'); return; }
    if (forgotNewPass.length < 6) { setError('La nueva contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true); setError('');
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'forgotStep2', userId: forgotUserId, securityAnswer: forgotAnswer, password: forgotNewPass }),
    }).then(async r => {
      const data = await r.json();
      if (r.ok) {
        setSuccess(data.message);
        setForgotStep(1);
        setForgotId(''); setForgotAnswer(''); setForgotNewPass('');
      } else {
        setError(data.error || 'Error al restablecer');
      }
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
          {success && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{success}</div>}
          <Tabs value={tab} onValueChange={(v) => { setTab(v); clearMessages(); setForgotStep(1); setForgotAdmins(null); }}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="login" className="text-xs">Ingresar</TabsTrigger>
              <TabsTrigger value="register" className="text-xs">Crear Cuenta</TabsTrigger>
              <TabsTrigger value="forgot" className="text-xs">Recuperar</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
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

            {/* REGISTER */}
            <TabsContent value="register" className="space-y-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs mb-2">
                Se creará tu cuenta de administrador. Elegí una pregunta de seguridad para poder recuperar tu contraseña en el futuro.
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
                <Input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} placeholder="••••••" />
              </div>
              <div className="space-y-2">
                <Label>Pregunta de seguridad *</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={regSecurityQ}
                  onChange={e => setRegSecurityQ(e.target.value)}
                >
                  <option value="">— Seleccioná una pregunta —</option>
                  {SECURITY_QUESTIONS.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Respuesta de seguridad *</Label>
                <Input value={regSecurityA} onChange={e => setRegSecurityA(e.target.value)} placeholder="Tu respuesta" onKeyDown={e => handleKeyDown(e, handleRegister)} />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleRegister} disabled={loading || !regName || !regPass || !regSecurityQ || !regSecurityA}>
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </Button>
            </TabsContent>

            {/* FORGOT PASSWORD */}
            <TabsContent value="forgot" className="space-y-3">
              {forgotStep === 1 ? (
                forgotAdmins ? (
                  // Fallback: show admins (no security question set)
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-800 font-medium mb-2">{forgotAdminMsg}</p>
                      <p className="text-xs text-blue-600 font-medium mb-1">Administradores:</p>
                      {forgotAdmins.map(a => (
                        <p key={a.email || a.name} className="text-sm text-blue-700">
                          • {a.name}{a.email ? ` — <span className="font-mono">${a.email}</span>` : ''}
                        </p>
                      ))}
                      <p className="text-xs text-blue-500 mt-3">Pedile al administrador que te restablezca la contraseña desde Configuración → Usuarios.</p>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => { setForgotAdmins(null); setForgotAdminMsg(''); setForgotId(''); }}>Volver</Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 mb-2">
                      Ingresá tu usuario o email. Si tenés pregunta de seguridad configurada,
                      podrás restablecer tu contraseña directamente.
                    </p>
                    <div className="space-y-2">
                      <Label>Usuario o Email</Label>
                      <Input value={forgotId} onChange={e => setForgotId(e.target.value)} placeholder="tu_usuario o tu@email.com" onKeyDown={e => handleKeyDown(e, handleForgotStep1)} />
                    </div>
                    <Button className="w-full" onClick={handleForgotStep1} disabled={loading || !forgotId}>
                      {loading ? 'Buscando...' : 'Buscar Cuenta'}
                    </Button>
                  </>
                )
              ) : (
                // Step 2: answer security question
                <>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-2">
                    <p className="font-medium">Pregunta de seguridad:</p>
                    <p className="mt-1">{forgotQuestion}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tu respuesta</Label>
                    <Input value={forgotAnswer} onChange={e => setForgotAnswer(e.target.value)} placeholder="Tu respuesta" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nueva contraseña (mín. 6 caracteres)</Label>
                    <Input type="password" value={forgotNewPass} onChange={e => setForgotNewPass(e.target.value)} placeholder="••••••" onKeyDown={e => handleKeyDown(e, handleForgotStep2)} />
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleForgotStep2} disabled={loading || !forgotAnswer || !forgotNewPass}>
                      {loading ? 'Verificando...' : 'Restablecer Contraseña'}
                    </Button>
                    <Button variant="outline" onClick={() => { setForgotStep(1); setForgotAnswer(''); setForgotNewPass(''); setForgotQuestion(''); clearMessages(); }}>Volver</Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
