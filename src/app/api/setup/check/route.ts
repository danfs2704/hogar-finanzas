import { NextResponse } from 'next/server';
import { db, dbReady } from '@/lib/db';

// GET — check if this is a first run (no users exist)
export async function GET() {
  try {
    await dbReady;
    const count = await db.user.count();
    return NextResponse.json({ isFirstRun: count === 0 });
  } catch (error) {
    console.error('Setup check error:', error);
    // If DB is not ready or has errors, assume first run
    return NextResponse.json({ isFirstRun: true });
  }
}
