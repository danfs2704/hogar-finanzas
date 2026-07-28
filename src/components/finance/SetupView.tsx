'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DynamicIcon } from '@/lib/icons';

export default function SetupView({ onReady }: { onReady: () => void }) {
  const [step, setStep] = useState<'choose' | 'picking'>('choose');
  const [chosenPath, setChosenPath] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUseDefault = async () => {
    setLoading(true);
    setError('');
    try {
      // No need to change path — just proceed
      onReady();
    } catch {
      setError('Error al inicializar');
    } finally {
      setLoading(false);
    }
  };

  const handlePickFolder = async () => {
    setStep('picking');
    setError('');
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const folder = await open({
        directory: true,
        title: '¿Dónde querés guardar la base de datos?',
      });
      if (!folder) {
        setStep('choose');
        return;
      }
      setChosenPath(folder);

      // Try to use an existing DB in that folder, or prepare for a new one
      const res = await fetch('/api/settings/db-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folder }),
      });
      const data = await res.json();
      if (res.ok) {
        onReady();
      } else {
        setError(data.error || 'Error al configurar la ubicación');
        setStep('choose');
      }
    } catch (err: any) {
      // If Tauri dialog not available, fall through to default
      console.warn('Dialog not available:', err);
      setError('No se pudo abrir el selector de carpetas. Se usará la ubicación por defecto.');
      setStep('choose');
      // Proceed anyway with default
      setTimeout(() => onReady(), 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <DynamicIcon name="Database" className="w-8 h-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">Bienvenido a Hogar Finanzas</CardTitle>
          <CardDescription>Primero, elegí dónde guardar tus datos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              {error}
            </div>
          )}

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <p className="text-sm text-slate-600">
              Tus datos financieros se guardan en un archivo local en tu computadora.
              Podés elegir la ubicación o usar la predeterminada.
            </p>
            <p className="text-xs text-slate-400">
              Si ya tenés una base de datos de Hogar Finanzas en alguna carpeta,
              seleccionala para seguir usando tus datos.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={handleUseDefault}
              disabled={loading}
            >
              <DynamicIcon name="CheckCircle" className="w-4 h-4 mr-2" />
              {loading ? 'Preparando...' : 'Usar ubicación predeterminada'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">o</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handlePickFolder}
              disabled={step === 'picking'}
            >
              <DynamicIcon name="FolderOpen" className="w-4 h-4" />
              {step === 'picking' ? 'Abriendo selector...' : 'Elegir otra ubicación'}
            </Button>
          </div>

          {chosenPath && step === 'choose' && (
            <p className="text-xs text-center text-slate-400">
              Última ubicación seleccionada: <code className="text-slate-500">{chosenPath}</code>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
