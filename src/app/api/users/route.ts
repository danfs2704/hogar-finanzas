import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

function generateUsername(name: string, householdId: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12);
  const suffix = householdId.slice(-4).toLowerCase();
  return `${base}_${suffix}`;
}

// GET — list users (admin only, filtered by household)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');
    if (!householdId) return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    const users = await db.user.findMany({
      where: { householdId },
      select: { id: true, email: true, username: true, name: true, role: true, isActive: true, createdAt: true, _count: { select: { transactions: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    console.error('Users GET error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST — admin creates user in household
export async function POST(request: NextRequest) {
  try {
    const { name, username: reqUsername, email, password, role, householdId } = await request.json();
    if (!name || !password || !householdId) return NextResponse.json({ error: 'Nombre, contraseña y hogar son requeridos' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });

    let username = reqUsername || generateUsername(name, householdId);
    const existingUname = await db.user.findFirst({ where: { username, householdId } });
    if (existingUname) { username = `${username}_${Date.now().toString(36).slice(-4)}`; }

    if (email) {
      const existing = await db.user.findFirst({ where: { email, householdId } });
      if (existing) return NextResponse.json({ error: 'Este email ya existe en este hogar' }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: { email: email || null, username, password: hashed, name, role: role || 'member', householdId },
      select: { id: true, email: true, username: true, name: true, role: true, isActive: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Users POST error:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}

// PUT — update user (role, active status)
export async function PUT(request: NextRequest) {
  try {
    const { id, name, role, isActive } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    const user = await db.user.update({ where: { id }, data, select: { id: true, email: true, username: true, name: true, role: true, isActive: true } });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Users PUT error:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}

// DELETE — remove user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Users DELETE error:', error);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
