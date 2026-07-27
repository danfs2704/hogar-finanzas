import { NextRequest, NextResponse } from 'next/server';
import { db, dbReady } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await dbReady;
    const body = await request.json();
    const { name, icon, color, description, categoryId } = body;
    const subcategory = await db.subcategory.create({
      data: { name, icon: icon || 'CircleDot', color: color || '#6366f1', description: description || null, categoryId },
    });
    return NextResponse.json(subcategory, { status: 201 });
  } catch (error) {
    console.error('Subcategories POST error:', error);
    return NextResponse.json({ error: 'Error al crear subcategoría' }, { status: 500 });
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
    const subcategory = await db.subcategory.update({ where: { id }, data });
    return NextResponse.json(subcategory);
  } catch (error) {
    console.error('Subcategories PUT error:', error);
    return NextResponse.json({ error: 'Error al actualizar subcategoría' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    await db.subcategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subcategories DELETE error:', error);
    return NextResponse.json({ error: 'Error al eliminar subcategoría' }, { status: 500 });
  }
}
