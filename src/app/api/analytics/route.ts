import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Member spending analysis
    const members = await db.householdMember.findMany({
      include: { _count: { select: { transactions: true } } },
    });

    const memberSpending = await Promise.all(members.map(async (m) => {
      const [y, mon] = currentMonth.split('-').map(Number);
      const expenses = await db.transaction.aggregate({
        where: { memberId: m.id, type: 'expense', date: { gte: new Date(y, mon - 1, 1), lt: new Date(y, mon, 1) } },
        _sum: { amount: true },
      });
      const incomes = await db.transaction.aggregate({
        where: { memberId: m.id, type: 'income', date: { gte: new Date(y, mon - 1, 1), lt: new Date(y, mon, 1) } },
        _sum: { amount: true },
      });
      return {
        memberId: m.id,
        memberName: m.name,
        isMinor: m.isMinor,
        totalExpense: expenses._sum.amount || 0,
        totalIncome: incomes._sum.amount || 0,
        transactions: m._count.transactions,
      };
    }));

    // Category breakdown for current month
    const transactions = await db.transaction.findMany({
      where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), 1), lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) } },
      include: { category: true, subcategory: true },
    });

    const expenseTx = transactions.filter(t => t.type === 'expense');
    const totalExpense = expenseTx.reduce((s, t) => s + t.amount, 0);

    const catMap = new Map<string, { cat: typeof expenseTx[0]['category']; subs: { sub: typeof expenseTx[0]['subcategory']; total: number }[]; total: number }>();
    for (const t of expenseTx) {
      const key = t.categoryId;
      if (!catMap.has(key)) catMap.set(key, { cat: t.category, subs: [], total: 0 });
      const entry = catMap.get(key)!;
      entry.total += t.amount;
      if (t.subcategory) {
        const existing = entry.subs.find(s => s.sub?.id === t.subcategory!.id);
        if (existing) existing.total += t.amount;
        else entry.subs.push({ sub: t.subcategory, total: t.amount });
      }
    }

    const categoryBreakdown = Array.from(catMap.values()).map(v => ({
      categoryId: v.cat.id,
      categoryName: v.cat.name,
      categoryIcon: v.cat.icon,
      categoryColor: v.cat.color,
      total: v.total,
      percentage: totalExpense > 0 ? (v.total / totalExpense) * 100 : 0,
      subcategories: v.subs.map(s => ({
        subcategoryId: s.sub!.id,
        subcategoryName: s.sub!.name,
        total: s.total,
        percentage: v.total > 0 ? (s.total / v.total) * 100 : 0,
      })),
    })).sort((a, b) => b.total - a.total);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
      const monthTx = await db.transaction.findMany({
        where: { date: { gte: new Date(d.getFullYear(), d.getMonth(), 1), lt: new Date(d.getFullYear(), d.getMonth() + 1, 1) } },
      });
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      monthlyTrend.push({ month: monthStr, income, expense, balance: income - expense });
    }

    // Account summary
    const accounts = await db.account.findMany({
      include: {
        transactions: { where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), 1), lt: new Date(now.getFullYear(), now.getMonth() + 1, 1) } } },
      },
    });
    const accountSummary = accounts.map(a => {
      const income = a.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = a.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { accountId: a.id, accountName: a.name, currency: a.currency, balance: a.balance, income, expense };
    });

    return NextResponse.json({ memberSpending, categoryBreakdown, monthlyTrend, accountSummary });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
