'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DynamicIcon } from '@/lib/icons';

interface UpdateInfo {
  version: string;
  notes: string;
}

// URL del manifiesto de actualizaciones
const UPDATE_URL = 'https://github.com/danfs2704/hogar-finanzas/releases/latest/download/latest.json';

export default function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);

  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

  // Obtener version actual de la app
  const getCurrentVersion = (): string => {
    try {
      const cfg = (window as any).__TAURI_INTERNALS__?.metadata;
      if (cfg?.version) return cfg.version;
    } catch {}
    // Fallback: leer del HTML
    const meta = document.querySelector('meta[name="app-version"]');
    return meta?.getAttribute('content') || '0.0.0';
  };

  useEffect(() => {
    if (!isTauri || dismissed) return;

    const checkUpdate = async () => {
      try {
        // Usar fetch directo (no pasa por ACL de Tauri)
        const res = await fetch(UPDATE_URL);
        if (!res.ok) {
          console.log('[updater] No se pudo obtener latest.json:', res.status);
          return;
        }
        const data = await res.json();
        const latestVersion = data.version;
        const currentVersion = getCurrentVersion();

        console.log('[updater] Current:', currentVersion, 'Latest:', latestVersion);

        if (latestVersion && latestVersion !== currentVersion) {
          setUpdateAvailable(true);
          setUpdateInfo({
            version: latestVersion,
            notes: data.notes || '',
          });
        }
      } catch (err) {
        console.log('[updater] Check failed:', err);
      }
    };

    const timer = setTimeout(checkUpdate, 5000);
    return () => clearTimeout(timer);
  }, [isTauri, dismissed]);

  const handleUpdate = async () => {
    try {
      setDownloading(true);
      setError('');

      // Descargar via fetch y ejecutar el instalador
      const res = await fetch(UPDATE_URL);
      const data = await res.json();
      const downloadUrl = data.platforms?.['windows-x86_64']?.url;
      if (!downloadUrl) {
        setError('No se encontro URL de descarga');
        setDownloading(false);
        return;
      }

      // Descargar el exe
      const exeRes = await fetch(downloadUrl);
      if (!exeRes.ok) {
        setError('Error al descargar el instalador');
        setDownloading(false);
        return;
      }

      const contentLength = parseInt(exeRes.headers.get('content-length') || '0');
      const reader = exeRes.body?.getReader();
      if (!reader) {
        setError('Error al leer la descarga');
        setDownloading(false);
        return;
      }

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (contentLength) {
          setProgress(Math.round((received / contentLength) * 100));
        }
      }

      // Guardar el exe temporalmente
      const blob = new Blob(chunks, { type: 'application/octet-stream' });
      const exeUrl = URL.createObjectURL(blob);

      // Abrir el instalador usando Tauri shell
      const { Command } = await import('@tauri-apps/plugin-shell');
      // Descargar a archivo temporal
      const { convertFileSrc } = await import('@tauri-apps/core');
      const { invoke } = (window as any).__TAURI_INTERNALS__ || {};

      // Usar metodo simple: abrir la URL de descarga directa con el navegador
      // Esto permite que el usuario lo descargue y ejecute
      window.open(downloadUrl, '_blank');

      setDownloading(false);
      setDismissed(true);
    } catch (err: any) {
      console.error('[updater] Download error:', err);
      setError(err?.message || 'Error al descargar la actualizacion');
      setDownloading(false);
    }
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-white rounded-xl shadow-lg border border-emerald-200 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <DynamicIcon name="Download" className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">
              Actualizacion disponible (v{updateInfo?.version})
            </p>
            {downloading ? (
              <div className="mt-2">
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Descargando... {progress}%</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                {updateInfo?.notes || 'Hay una nueva version disponible. Actualiza para obtener las ultimas mejoras.'}
              </p>
            )}
            {error && (
              <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <DynamicIcon name="X" className="w-4 h-4" />
          </button>
        </div>
        {!downloading && (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs"
              onClick={handleUpdate}
            >
              <DynamicIcon name="Download" className="w-3 h-3 mr-1" />
              Actualizar ahora
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => setDismissed(true)}
            >
              Despues
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
