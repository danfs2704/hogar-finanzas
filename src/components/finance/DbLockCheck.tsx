'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DynamicIcon } from '@/lib/icons';

interface LockInfo {
  deviceName: string;
  userName: string;
  secondsAgo: number;
}

interface FileLockInfo {
  deviceName: string;
  lockedAt: string;
  secondsAgo: number;
}

const HEARTBEAT_INTERVAL = 15_000; // 15 seconds

function getDeviceName(): string {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (ua.includes('Tauri')) return 'PC (Tauri)';
    if (/iPhone|iPad/.test(ua)) return 'iPhone/iPad';
    if (/Android/.test(ua)) return 'Android';
    return 'Navegador Web';
  }
  return 'Dispositivo desconocido';
}

export default function DbLockCheck({ userName }: { userName: string }) {
  const [dbLockInfo, setDbLockInfo] = useState<LockInfo | null>(null);
  const [fileLockInfo, setFileLockInfo] = useState<FileLockInfo | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [checking, setChecking] = useState(true);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deviceName = useRef(getDeviceName());

  // --- DB table lock (existing) ---
  const acquireDbLock = useCallback(async (force = false) => {
    try {
      const res = await fetch('/api/db-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: deviceName.current, userName, force }),
      });
      if (res.ok) { setDbLockInfo(null); return true; }
      const data = await res.json();
      setDbLockInfo(data);
      return false;
    } catch { return true; }
  }, [userName]);

  const releaseDbLock = useCallback(async () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    try {
      await fetch(`/api/db-lock?deviceName=${encodeURIComponent(deviceName.current)}&userName=${encodeURIComponent(userName)}`, { method: 'DELETE' });
    } catch { /* ignore */ }
  }, [userName]);

  const dbHeartbeat = useCallback(async () => {
    try {
      await fetch('/api/db-lock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceName: deviceName.current, userName }),
      });
    } catch { /* ignore */ }
  }, [userName]);

  // --- File lock check ---
  const checkFileLock = useCallback(async () => {
    try {
      const res = await fetch('/api/file-lock');
      const data = await res.json();
      if (data.locked && !data.isOwn) {
        setFileLockInfo({
          deviceName: data.deviceName,
          lockedAt: data.lockedAt,
          secondsAgo: data.secondsAgo,
        });
        return true; // locked by another device
      }
      if (data.stale) {
        // Clean up stale lock
        await fetch('/api/file-lock', { method: 'DELETE' });
      }
      return false;
    } catch { return false; }
  }, []);

  // --- Initial check: both file lock AND db table lock ---
  useEffect(() => {
    let cancelled = false;

    async function check() {
      // First check file lock (more important for shared DB/OneDrive)
      const fileLocked = await checkFileLock();
      if (cancelled) return;

      if (fileLocked) {
        setChecking(false);
        setShowWarning(true);
        return;
      }

      // Then check DB table lock
      try {
        const res = await fetch('/api/db-lock');
        if (cancelled) return;
        const data = await res.json();

        if (data.locked) {
          setDbLockInfo(data);
          setShowWarning(true);
          setChecking(false);
        } else {
          const acquired = await acquireDbLock();
          if (!acquired && !cancelled) {
            setShowWarning(true);
          }
          if (!cancelled) setChecking(false);
        }
      } catch {
        if (!cancelled) setChecking(false);
      }
    }

    check();
    return () => { cancelled = true; };
  }, [acquireDbLock, checkFileLock]);

  // Start heartbeat once lock is acquired
  useEffect(() => {
    if (!showWarning && !checking) {
      heartbeatRef.current = setInterval(dbHeartbeat, HEARTBEAT_INTERVAL);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [showWarning, checking, dbHeartbeat]);

  // Release lock on close/unload
  useEffect(() => {
    const handleUnload = () => { releaseDbLock(); };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      releaseDbLock();
    };
  }, [releaseDbLock]);

  const handleForceOpen = async () => {
    // Clear file lock if present
    await fetch('/api/file-lock', { method: 'DELETE' });
    setFileLockInfo(null);
    // Acquire DB lock with force
    const acquired = await acquireDbLock(true);
    if (acquired) {
      setShowWarning(false);
    }
  };

  if (checking) return null;

  // Determine which lock message to show (file lock takes priority)
  const isFileLock = fileLockInfo !== null;
  const lockDevice = isFileLock ? fileLockInfo.deviceName : (dbLockInfo?.deviceName || 'Otro dispositivo');
  const lockUser = dbLockInfo?.userName;
  const lockTime = isFileLock ? fileLockInfo.lockedAt : '';

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <DynamicIcon name="AlertTriangle" className="w-5 h-5" />
            Base de datos en uso
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            {isFileLock ? (
              <>
                <p className="mb-2">
                  <strong>{lockDevice}</strong> está usando la base de datos
                  {lockTime && <> desde las <strong>{lockTime}</strong></>}
                  {fileLockInfo && fileLockInfo.secondsAgo <= 30 && (
                    <span className="text-amber-600 font-medium"> (ahora mismo)</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Si la otra persona ya cerró la aplicación, podés forzar la apertura.
                  Si ambas usan la base al mismo tiempo, pueden perderse datos.
                </p>
              </>
            ) : (
              <>
                <p className="mb-2">
                  <strong>{lockUser}</strong> está usando la base de datos
                  desde <strong>{lockDevice}</strong>
                  {dbLockInfo && dbLockInfo.secondsAgo <= 30 && (
                    <span className="text-amber-600 font-medium"> (ahora mismo)</span>
                  )}
                  {dbLockInfo && dbLockInfo.secondsAgo > 30 && dbLockInfo.secondsAgo <= 60 && (
                    <span> (hace {dbLockInfo.secondsAgo} segundos)</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  Si la otra persona ya cerró la aplicación, podés forzar la apertura.
                  Si ambas usan la base al mismo tiempo, pueden perderse datos.
                </p>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleForceOpen}>
            Forzar apertura
          </Button>
          <Button onClick={() => setShowWarning(false)} variant="destructive">
            Entendido, abrir de todos modos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
