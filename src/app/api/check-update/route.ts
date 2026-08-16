import { NextResponse } from 'next/server';

const UPDATE_URL = 'https://github.com/danfs2704/hogar-finanzas/releases/latest/download/latest.json';

export async function GET() {
  try {
    // Fetch desde el servidor (Node.js), no hay CORS server-to-server
    const res = await fetch(UPDATE_URL, {
      headers: { 'User-Agent': 'HogarFinanzas-Updater' },
      redirect: 'follow',
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'No se pudo verificar actualizaciones', status: res.status }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[check-update] Error:', err);
    return NextResponse.json({ error: 'Error al verificar actualizaciones' }, { status: 500 });
  }
}
