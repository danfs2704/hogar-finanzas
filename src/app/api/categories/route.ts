import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const categories = await db.category.findMany({
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
    const { name, type, icon, color } = body;
    const category = await db.category.create({
      data: { name, type: type || 'expense', icon: icon || 'Tag', color: color || '#6366f1' },
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
    return NextResponse.json({ error: 'Error al eliminar categoría (puede tener transacciones asociadas)' }, { status: 500 });
  }
}
