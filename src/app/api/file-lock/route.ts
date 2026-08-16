import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const LOCK_TIMEOUT_MS = 90 * 1000; // 90 seconds (heartbeat is every 30s)

function getDbDir(): string | null {
  const dbUrl = process.env.DATABASE_URL || '';
  const match = dbUrl.match(/^file:(.+)/);
  if (match) {
    return path.dirname(match[1]);
  }
  return null;
}

function getLockFilePath(): string | null {
  const dir = getDbDir();
  return dir ? path.join(dir, 'data.db.lock') : null;
}

// GET: check if file lock exists and is active
export async function GET() {
  try {
    const lockPath = getLockFilePath();
    if (!lockPath) {
      return NextResponse.json({ locked: false, reason: 'no_db_path' });
    }

    if (!fs.existsSync(lockPath)) {
      return NextResponse.json({ locked: false });
    }

    const content = fs.readFileSync(lockPath, 'utf8');
    const lockData = JSON.parse(content);

    // Check if lock is from THIS device/process (our own lock — ignore)
    if (lockData.device === os.hostname() && lockData.pid === process.pid) {
      return NextResponse.json({ locked: false, isOwn: true });
    }

    // Check if lock has expired (no heartbeat for 90 seconds)
    const heartbeatAt = new Date(lockData.heartbeatAt).getTime();
    const elapsed = Date.now() - heartbeatAt;

    if (elapsed > LOCK_TIMEOUT_MS) {
      // Lock expired — consider it stale
      return NextResponse.json({
        locked: false,
        stale: true,
        staleDevice: lockData.device,
        staleSeconds: Math.floor(elapsed / 1000),
      });
    }

    // Lock is active from another device
    const secondsAgo = Math.floor(elapsed / 1000);
    const lockedAt = new Date(lockData.lockedAt);
    const timeStr = lockedAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    return NextResponse.json({
      locked: true,
      deviceName: lockData.device,
      lockedAt: timeStr,
      secondsAgo,
    });
  } catch {
    return NextResponse.json({ locked: false });
  }
}

// DELETE: remove stale lock file
export async function DELETE() {
  try {
    const lockPath = getLockFilePath();
    if (!lockPath) {
      return NextResponse.json({ ok: true });
    }
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
