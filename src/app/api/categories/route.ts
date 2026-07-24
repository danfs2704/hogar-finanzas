import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');
    if (!householdId) return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    const categories = await db.category.findMany({
      where: { householdId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { subcategories: true, transactions: true } },
        subcategories: { orderBy: { name: 'asc' }, include: { _count: { select: { transactions: true } } } },
      },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Categories GET error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, icon, color, householdId } = body;
    if (!householdId) return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    const category = await db.category.create({
      data: { name, type: type || 'expense', icon: icon || 'Tag', color: color || '#6366f1', householdId },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Categories POST error:', error);
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, icon, color } = body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (icon !== undefined) data.icon = icon;
    if (color !== undefined) data.color = color;
    const category = await db.category.update({ where: { id }, data });
    return NextResponse.json(category);
  } catch (error) {
    console.error('Categories PUT error:', error);
    return NextResponse.json({ error: 'Error al actualizar categoría' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    await db.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Categories DELETE error:', error);
    return NextResponse.json({ error: 'Error al eliminar categoría' }, { status: 500 });
  }
}
