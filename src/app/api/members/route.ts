import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const members = await db.householdMember.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { transactions: true } } },
    });
    return NextResponse.json(members);
  } catch (error) {
    console.error('Members GET error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isMinor, avatar, notes } = body;
    const member = await db.householdMember.create({
      data: { name, isMinor: isMinor || false, avatar: avatar || null, notes: notes || null },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Members POST error:', error);
    return NextResponse.json({ error: 'Error al crear miembro' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, isMinor, avatar, notes } = body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (isMinor !== undefined) data.isMinor = isMinor;
    if (avatar !== undefined) data.avatar = avatar;
    if (notes !== undefined) data.notes = notes;
    const member = await db.householdMember.update({ where: { id }, data });
    return NextResponse.json(member);
  } catch (error) {
    console.error('Members PUT error:', error);
    return NextResponse.json({ error: 'Error al actualizar miembro' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    await db.householdMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Members DELETE error:', error);
    return NextResponse.json({ error: 'Error al eliminar miembro' }, { status: 500 });
  }
}
