import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Lock expires after 60 seconds of no heartbeat
const LOCK_TIMEOUT_MS = 60 * 1000;

export async function GET() {
  try {
    const locks = await db.dbLock.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 1,
    });

    if (locks.length === 0) {
      return NextResponse.json({ locked: false });
    }

    const lock = locks[0];
    const elapsed = Date.now() - new Date(lock.updatedAt).getTime();

    if (elapsed > LOCK_TIMEOUT_MS) {
      // Lock expired — clean it up
      await db.dbLock.deleteMany();
      return NextResponse.json({ locked: false });
    }

    const secondsAgo = Math.floor(elapsed / 1000);
    return NextResponse.json({
      locked: true,
      deviceName: lock.deviceName,
      userName: lock.userName,
      secondsAgo,
    });
  } catch {
    // If table doesn't exist yet (first migration), ignore
    return NextResponse.json({ locked: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceName, userName, force } = body;

    if (!deviceName || !userName) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Check existing lock
    const existing = await db.dbLock.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      const elapsed = Date.now() - new Date(existing.updatedAt).getTime();
      if (elapsed <= LOCK_TIMEOUT_MS && !force) {
        const secondsAgo = Math.floor(elapsed / 1000);
        return NextResponse.json({
          locked: true,
          deviceName: existing.deviceName,
          userName: existing.userName,
          secondsAgo,
        }, { status: 409 });
      }
      // Lock expired or force — delete old and create new
      await db.dbLock.deleteMany();
    }

    const lock = await db.dbLock.create({
      data: { deviceName, userName },
    });

    return NextResponse.json({ locked: false, lockId: lock.id });
  } catch {
    // If table doesn't exist yet, try to create it silently
    return NextResponse.json({ locked: false });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceName, userName } = body;

    // Update heartbeat — find lock by device+user combo or update the most recent
    const existing = await db.dbLock.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (existing && existing.deviceName === deviceName && existing.userName === userName) {
      await db.dbLock.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceName = searchParams.get('deviceName');
    const userName = searchParams.get('userName');

    if (deviceName && userName) {
      await db.dbLock.deleteMany({
        where: { deviceName, userName },
      });
    } else {
      // Fallback: delete all locks (for cleanup)
      await db.dbLock.deleteMany();
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
