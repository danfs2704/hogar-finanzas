import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');
    if (!householdId) return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    const accounts = await db.account.findMany({
      where: { householdId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { transactionsFrom: true } } },
    });
    // Map transactionsFrom count to transactions for backward compat
    return NextResponse.json(accounts.map(a => ({
      ...a,
      _count: { transactions: a._count.transactionsFrom },
    })));
  } catch (error) {
    console.error('Accounts GET error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, currency, balance, color, icon, householdId } = body;
    if (!householdId) return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    const account = await db.account.create({
      data: { name, type: type || 'bank', currency: currency || 'ARS', balance: balance || 0, color: color || '#6366f1', icon: icon || 'Wallet', householdId },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Accounts POST error:', error);
    return NextResponse.json({ error: 'Error al crear cuenta' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, currency, color, icon, isActive } = body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (currency !== undefined) data.currency = currency;
    if (color !== undefined) data.color = color;
    if (icon !== undefined) data.icon = icon;
    if (isActive !== undefined) data.isActive = isActive;
    const account = await db.account.update({ where: { id }, data });
    return NextResponse.json(account);
  } catch (error) {
    console.error('Accounts PUT error:', error);
    return NextResponse.json({ error: 'Error al actualizar cuenta' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    await db.account.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Accounts DELETE error:', error);
    return NextResponse.json({ error: 'Error al eliminar cuenta' }, { status: 500 });
  }
}
