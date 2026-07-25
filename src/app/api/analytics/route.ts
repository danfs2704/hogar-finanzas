import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const householdId = searchParams.get('householdId');
    if (!householdId) return NextResponse.json({ error: 'householdId requerido' }, { status: 400 });

    const now = new Date();

    // Member spending
    const members = await db.householdMember.findMany({ where: { householdId }, include: { _count: { select: { transactions: true } } } });
    const memberSpending = await Promise.all(members.map(async (m) => {
      const [y, mon] = [now.getFullYear(), now.getMonth() + 1];
      const from = new Date(y, mon - 1, 1).toISOString();
      const to = new Date(y, mon, 1).toISOString();
      const expAgg = await db.transaction.aggregate({ where: { memberId: m.id, type: 'expense', householdId, date: { gte: from, lt: to } }, _sum: { amount: true } });
      const incAgg = await db.transaction.aggregate({ where: { memberId: m.id, type: 'income', householdId, date: { gte: from, lt: to } }, _sum: { amount: true } });
      return { memberId: m.id, memberName: m.name, isMinor: m.isMinor, totalExpense: expAgg._sum.amount || 0, totalIncome: incAgg._sum.amount || 0, transactions: m._count.transactions };
    }));

    // Category breakdown
    const transactions = await db.transaction.findMany({ where: { date: { gte: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), lt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString() }, householdId }, include: { category: true, subcategory: true } });
    const expenseTx = transactions.filter(t => t.type === 'expense');
    const totalExpense = expenseTx.reduce((s, t) => s + t.amount, 0);
    const catMap = new Map<string, { cat: typeof expenseTx[0]['category']; subs: { sub: typeof expenseTx[0]['subcategory']; total: number }[]; total: number }>();
    for (const t of expenseTx) {
      if (!catMap.has(t.categoryId)) catMap.set(t.categoryId, { cat: t.category, subs: [], total: 0 });
      const e = catMap.get(t.categoryId)!; e.total += t.amount;
      if (t.subcategory) { const ex = e.subs.find(s => s.sub?.id === t.subcategory!.id); if (ex) ex.total += t.amount; else e.subs.push({ sub: t.subcategory, total: t.amount }); }
    }
    const categoryBreakdown = Array.from(catMap.values()).map(v => ({
      categoryId: v.cat.id, categoryName: v.cat.name, categoryIcon: v.cat.icon, categoryColor: v.cat.color, total: v.total,
      percentage: totalExpense > 0 ? (v.total / totalExpense) * 100 : 0,
      subcategories: v.subs.map(s => ({ subcategoryId: s.sub!.id, subcategoryName: s.sub!.name, total: s.total, percentage: v.total > 0 ? (s.total / v.total) * 100 : 0 })),
    })).sort((a, b) => b.total - a.total);

    // Monthly trend
    const monthlyTrend: { month: string; income: number; expense: number; balance: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
      const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
      const mtx = await db.transaction.findMany({ where: { date: { gte: from, lt: to }, householdId } });
      monthlyTrend.push({ month: monthStr, income: mtx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), expense: mtx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), balance: 0 });
      monthlyTrend[monthlyTrend.length - 1].balance = monthlyTrend[monthlyTrend.length - 1].income - monthlyTrend[monthlyTrend.length - 1].expense;
    }

    // Account summary
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const accounts = await db.account.findMany({
      where: { householdId },
      include: { transactions: { where: { date: { gte: monthStart, lt: monthEnd } } } },
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
