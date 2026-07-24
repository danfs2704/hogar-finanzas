'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicIcon } from '@/lib/icons';
import { useAppStore } from '@/store/useAppStore';
import type { Account, Transaction, AnalyticsData } from '@/types';
import { BarChart3, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function DashboardView() {
  const { triggerRefresh, refreshKey } = useAppStore();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/accounts').then(r => r.ok ? r.json() : []),
      fetch('/api/transactions?limit=8').then(r => r.ok ? r.json() : []),
      fetch('/api/analytics').then(r => r.ok ? r.json() : null),
    ]).then(([acc, tx, an]) => {
      if (!cancelled) { setAccounts(acc); setRecentTx(tx); setAnalytics(an); setLoading(false); }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const totalARS = accounts.filter(a => a.currency === 'ARS').reduce((s, a) => s + a.balance, 0);
  const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0);
  const currentMonth = analytics?.monthlyTrend?.[analytics.monthlyTrend.length - 1];

  const fmtARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
  const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500 text-sm">Resumen financiero de su hogar</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-emerald-700">Total Pesos (ARS)</span>
              <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
                <DynamicIcon name="Banknote" className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-800">{fmtARS(totalARS)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-teal-100/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-teal-700">Total Dólares (USD)</span>
              <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center">
                <DynamicIcon name="DollarSign" className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-teal-800">{fmtUSD(totalUSD)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-blue-700">Ingresos del Mes</span>
              <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-800">{fmtARS(currentMonth?.income || 0)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-rose-700">Gastos del Mes</span>
              <div className="w-9 h-9 rounded-lg bg-rose-500 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-800">{fmtARS(currentMonth?.expense || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent transactions */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Transacciones Recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-center text-slate-400">Cargando...</div>
            ) : recentTx.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No hay transacciones registradas</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentTx.map(tx => (
                  <div key={tx.id} className="px-6 py-3 flex items-center gap-3 hover:bg-slate-50/50">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${tx.category?.color}15` }}>
                      <DynamicIcon name={tx.category?.icon || 'CircleDot'} className="w-4 h-4" style={{ color: tx.category?.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{tx.description}</p>
                      <p className="text-xs text-slate-400">{tx.category?.name}{tx.subcategory ? ` · ${tx.subcategory.name}` : ''} · {new Date(tx.date).toLocaleDateString('es-AR')}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'income' ? '+' : '-'}{tx.account?.currency === 'USD' ? fmtUSD(tx.amount) : fmtARS(tx.amount)}
                      </p>
                      <p className="text-xs text-slate-400">{tx.member?.name || tx.pet?.name || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top categories */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Top Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !analytics ? (
              <div className="text-center text-slate-400 py-6">Cargando...</div>
            ) : analytics.categoryBreakdown.length === 0 ? (
              <div className="text-center text-slate-400 py-6">Sin datos este mes</div>
            ) : (
              <div className="space-y-4">
                {analytics.categoryBreakdown.slice(0, 6).map(cat => (
                  <div key={cat.categoryId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <DynamicIcon name={cat.categoryIcon} className="w-4 h-4" style={{ color: cat.categoryColor }} />
                        <span className="text-sm font-medium text-slate-700">{cat.categoryName}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-800">{fmtARS(cat.total)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.categoryColor }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{cat.percentage.toFixed(1)}% del gasto total</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      {analytics?.monthlyTrend && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tendencia Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {analytics.monthlyTrend.map((m, i) => (
                <div key={i} className="text-center p-3 rounded-xl bg-slate-50">
                  <p className="text-xs text-slate-500 mb-2 capitalize">{m.month}</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                      <span className="text-xs font-medium text-emerald-600">{fmtARS(m.income)}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <ArrowDownRight className="w-3 h-3 text-rose-500" />
                      <span className="text-xs font-medium text-rose-600">{fmtARS(m.expense)}</span>
                    </div>
                    <p className={`text-xs font-bold mt-1 ${m.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.balance >= 0 ? '+' : ''}{fmtARS(m.balance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
