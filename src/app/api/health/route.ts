import { NextResponse } from 'next/server';
import { dbReady } from '@/lib/db';

export async function GET() {
  try {
    await dbReady;
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: 'starting', timestamp: new Date().toISOString() });
  }
}
