import { NextResponse } from 'next/server';

const UPDATE_URL = 'https://github.com/danfs2704/hogar-finanzas/releases/latest/download/latest.json';

// Cache en memoria para no golpear GitHub en cada request
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function GET() {
  try {
    // Verificar cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data);
    }

    // Fetch desde el servidor (Node.js), no hay CORS server-to-server
    const res = await fetch(UPDATE_URL, {
      headers: { 'User-Agent': 'HogarFinanzas-Updater' },
      redirect: 'follow',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'No se pudo verificar actualizaciones', status: res.status }, { status: 502 });
    }

    const data = await res.json();

    // Guardar en cache
    cache = { data, timestamp: Date.now() };

    return NextResponse.json(data);
  } catch (err) {
    console.error('[check-update] Error:', err);
    return NextResponse.json({ error: 'Error al verificar actualizaciones' }, { status: 500 });
  }
}
