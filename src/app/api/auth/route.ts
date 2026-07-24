import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email, password, name } = body;

    if (action === 'login') {
      const user = await db.user.findUnique({ where: { email } });
      if (!user) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
      return NextResponse.json({ id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin });
    }

    if (action === 'register') {
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 });
      const hashed = await bcrypt.hash(password, 10);
      const user = await db.user.create({ data: { email, password: hashed, name, isAdmin: false } });
      return NextResponse.json({ id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
