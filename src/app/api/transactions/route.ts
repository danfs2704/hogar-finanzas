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
        account: { select: { id: true, name: true, currency: true, color: true, icon: true } },
        toAccount: { select: { id: true, name: true, currency: true, color: true, icon: true } },
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
    const { type, amount, description, date, notes, accountId, toAccountId, categoryId, subcategoryId, memberId, petId, userId, householdId } = body;
    if (!householdId) return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });

    const parsedAmount = parseFloat(amount);

    // TRANSFER
    if (type === 'transfer') {
      if (!accountId || !toAccountId) return NextResponse.json({ error: 'Cuentas de origen y destino son requeridas' }, { status: 400 });
      if (accountId === toAccountId) return NextResponse.json({ error: 'Las cuentas deben ser diferentes' }, { status: 400 });

      // Debit from source
      const fromAccount = await db.account.findUnique({ where: { id: accountId } });
      if (!fromAccount) return NextResponse.json({ error: 'Cuenta de origen no encontrada' }, { status: 404 });
      await db.account.update({ where: { id: accountId }, data: { balance: fromAccount.balance - parsedAmount } });

      // Credit to destination
      const toAccount = await db.account.findUnique({ where: { id: toAccountId } });
      if (!toAccount) return NextResponse.json({ error: 'Cuenta de destino no encontrada' }, { status: 404 });
      await db.account.update({ where: { id: toAccountId }, data: { balance: toAccount.balance + parsedAmount } });

      const transaction = await db.transaction.create({
        data: {
          type: 'transfer', amount: parsedAmount,
          description: description || `Transferencia a ${toAccount.name}`,
          date: date ? new Date(date) : new Date(), notes: notes || null,
          accountId, toAccountId,
          categoryId: null, subcategoryId: null,
          memberId: memberId || null, petId: petId || null,
          userId: userId || null, householdId,
        },
      });
      return NextResponse.json(transaction, { status: 201 });
    }

    // Normal income/expense
    if (!categoryId) return NextResponse.json({ error: 'Categoría requerida' }, { status: 400 });

    const transaction = await db.transaction.create({
      data: {
        type: type || 'expense', amount: parsedAmount, description,
        date: date ? new Date(date) : new Date(), notes: notes || null,
        accountId, toAccountId: null,
        categoryId, subcategoryId: subcategoryId || null,
        memberId: memberId || null, petId: petId || null,
        userId: userId || null, householdId,
      },
    });

    const account = await db.account.findUnique({ where: { id: accountId } });
    if (account) {
      const newBalance = type === 'income' ? account.balance + parsedAmount : account.balance - parsedAmount;
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
    const transaction = await db.transaction.findUnique({ where: { id }, include: { account: true, toAccount: true } });
    if (transaction) {
      if (transaction.type === 'transfer' && transaction.toAccount) {
        // Reverse transfer: credit source, debit destination
        await db.account.update({ where: { id: transaction.accountId }, data: { balance: transaction.account.balance + transaction.amount } });
        await db.account.update({ where: { id: transaction.toAccountId }, data: { balance: transaction.toAccount.balance - transaction.amount } });
      } else {
        // Reverse normal transaction
        const newBalance = transaction.type === 'income' ? transaction.account.balance - transaction.amount : transaction.account.balance + transaction.amount;
        await db.account.update({ where: { id: transaction.accountId }, data: { balance: newBalance } });
      }
    }
    await db.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Transactions DELETE error:', error);
    return NextResponse.json({ error: 'Error al eliminar transacción' }, { status: 500 });
  }
}
