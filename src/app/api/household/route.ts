import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET — household info + seed default categories if needed
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    const household = await db.household.findUnique({ where: { id }, select: { id: true, name: true, description: true, _count: { select: { users: true, accounts: true, transactions: true } } } });
    if (!household) return NextResponse.json({ error: 'Hogar no encontrado' }, { status: 404 });
    return NextResponse.json(household);
  } catch (error) {
    console.error('Household GET error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// PUT — update household name/description
export async function PUT(request: NextRequest) {
  try {
    const { id, name, description } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    const household = await db.household.update({ where: { id }, data, select: { id: true, name: true, description: true } });
    return NextResponse.json(household);
  } catch (error) {
    console.error('Household PUT error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
