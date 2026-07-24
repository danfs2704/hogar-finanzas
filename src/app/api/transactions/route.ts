import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');
    if (!householdId) return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });
    const type = searchParams.get('type');
    const accountId = searchParams.get('accountId');
    const categoryId = searchParams.get('categoryId');
    const memberId = searchParams.get('memberId');
    const month = searchParams.get('month');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = { householdId };
    if (type) where.type = type;
    if (accountId) where.accountId = accountId;
    if (categoryId) where.categoryId = categoryId;
    if (memberId) where.memberId = memberId;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      where.date = { gte: new Date(y, m - 1, 1).toISOString(), lt: new Date(y, m, 1).toISOString() };
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        account: { select: { id: true, name: true, currency: true, color: true } },
        category: { select: { id: true, name: true, icon: true, color: true, type: true } },
        subcategory: { select: { id: true, name: true, icon: true, color: true } },
        member: { select: { id: true, name: true, isMinor: true } },
        pet: { select: { id: true, name: true, species: true } },
        user: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Transactions GET error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, amount, description, date, notes, accountId, categoryId, subcategoryId, memberId, petId, userId, householdId } = body;
    if (!householdId) return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });

    const transaction = await db.transaction.create({
      data: {
        type: type || 'expense', amount: parseFloat(amount), description,
        date: date ? new Date(date) : new Date(), notes: notes || null,
        accountId, categoryId, subcategoryId: subcategoryId || null,
        memberId: memberId || null, petId: petId || null,
        userId: userId || null, householdId,
      },
    });

    const account = await db.account.findUnique({ where: { id: accountId } });
    if (account) {
      const newBalance = type === 'income' ? account.balance + parseFloat(amount) : account.balance - parseFloat(amount);
      await db.account.update({ where: { id: accountId }, data: { balance: newBalance } });
    }
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error('Transactions POST error:', error);
    return NextResponse.json({ error: 'Error al crear transacción' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    const transaction = await db.transaction.findUnique({ where: { id }, include: { account: true } });
    if (transaction) {
      const newBalance = transaction.type === 'income' ? transaction.account.balance - transaction.amount : transaction.account.balance + transaction.amount;
      await db.account.update({ where: { id: transaction.accountId }, data: { balance: newBalance } });
    }
    await db.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Transactions DELETE error:', error);
    return NextResponse.json({ error: 'Error al eliminar transacción' }, { status: 500 });
  }
}
