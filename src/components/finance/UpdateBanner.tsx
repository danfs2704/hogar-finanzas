'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DynamicIcon } from '@/lib/icons';

interface UpdateInfo {
  version: string;
  notes: string;
  downloadUrl: string;
}

export default function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

  // Obtener version actual de la app
  const getCurrentVersion = (): string => {
    try {
      const cfg = (window as any).__TAURI_INTERNALS__?.metadata;
      if (cfg?.version) return cfg.version;
    } catch {}
    const meta = document.querySelector('meta[name="app-version"]');
    return meta?.getAttribute('content') || '0.0.0';
  };

  useEffect(() => {
    if (!isTauri || dismissed) return;

    const checkUpdate = async () => {
      try {
        // Usar API interna (sin CORS porque es server-to-server)
        const res = await fetch('/api/check-update');
        if (!res.ok) {
          console.log('[updater] API check-update fallo:', res.status);
          setLoading(false);
          return;
        }
        const data = await res.json();
        const latestVersion = data.version;
        const currentVersion = getCurrentVersion();

        console.log('[updater] Current:', currentVersion, 'Latest:', latestVersion);

        if (latestVersion && latestVersion !== currentVersion) {
          const downloadUrl = data.platforms?.['windows-x86_64']?.url || '';
          setUpdateAvailable(true);
          setUpdateInfo({
            version: latestVersion,
            notes: data.notes || '',
            downloadUrl,
          });
        }
      } catch (err) {
        console.log('[updater] Check failed:', err);
      }
      setLoading(false);
    };

    const timer = setTimeout(checkUpdate, 5000);
    return () => clearTimeout(timer);
  }, [isTauri, dismissed]);

  const handleUpdate = async () => {
    if (!updateInfo?.downloadUrl) return;

    // Usar el plugin updater de Tauri para descargar e instalar
    if (isTauri) {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update) {
          setDismissed(true);
          await update.downloadAndInstall();
          const { relaunch } = await import('@tauri-apps/plugin-process');
          await relaunch();
          return;
        }
      } catch (err) {
        console.log('[updater] Plugin updater fallo, abriendo navegador:', err);
      }
    }

    // Fallback: abrir en el navegador
    window.open(updateInfo.downloadUrl, '_blank');
    setDismissed(true);
  };

  if (!isTauri || loading || dismissed || !updateAvailable) return null;

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
            <p className="text-xs text-slate-500 mt-1">
              {updateInfo?.notes || 'Hay una nueva version disponible. Actualiza para obtener las ultimas mejoras.'}
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <DynamicIcon name="X" className="w-4 h-4" />
          </button>
        </div>
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
      </div>
    </div>
  );
}
