import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const pets = await db.pet.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { transactions: true } } },
    });
    return NextResponse.json(pets);
  } catch (error) {
    console.error('Pets GET error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, species, breed, avatar, notes } = body;
    const pet = await db.pet.create({
      data: { name, species: species || 'Perro', breed: breed || null, avatar: avatar || null, notes: notes || null },
    });
    return NextResponse.json(pet, { status: 201 });
  } catch (error) {
    console.error('Pets POST error:', error);
    return NextResponse.json({ error: 'Error al crear mascota' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, species, breed, avatar, notes } = body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (species !== undefined) data.species = species;
    if (breed !== undefined) data.breed = breed;
    if (avatar !== undefined) data.avatar = avatar;
    if (notes !== undefined) data.notes = notes;
    const pet = await db.pet.update({ where: { id }, data });
    return NextResponse.json(pet);
  } catch (error) {
    console.error('Pets PUT error:', error);
    return NextResponse.json({ error: 'Error al actualizar mascota' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    await db.pet.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pets DELETE error:', error);
    return NextResponse.json({ error: 'Error al eliminar mascota' }, { status: 500 });
  }
}
