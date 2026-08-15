'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DynamicIcon } from '@/lib/icons';

interface UpdateInfo {
  version: string;
  date: string;
  body: string;
}

export default function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);

  const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

  useEffect(() => {
    if (!isTauri || dismissed) return;

    const checkUpdate = async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();
        if (update) {
          setUpdateAvailable(true);
          setUpdateInfo({
            version: update.version,
            date: update.date || '',
            body: update.body || '',
          });
        }
      } catch (err) {
        // Silently fail - updater not configured yet or no network
        console.log('[updater] Check failed:', err);
      }
    };

    // Check after 5 seconds to not slow down app startup
    const timer = setTimeout(checkUpdate, 5000);
    return () => clearTimeout(timer);
  }, [isTauri, dismissed]);

  const handleUpdate = async () => {
    try {
      setDownloading(true);
      setError('');
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (!update) return;

      await update.downloadAndInstall((event) => {
        if (event.event === 'Progress') {
          setProgress(Math.round(event.data.progress));
        }
      });

      // Restart after successful update
      const { process } = await import('@tauri-apps/plugin-process');
      await process.relaunch();
    } catch (err: any) {
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
                Hay una nueva version disponible. Actualiza para obtener las ultimas mejoras.
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
