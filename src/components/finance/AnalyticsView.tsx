'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DynamicIcon } from '@/lib/icons';
import { useAppStore } from '@/store/useAppStore';
import type { AnalyticsData } from '@/types';

export default function AnalyticsView() {
  const { refreshKey } = useAppStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics').then(r => r.ok ? r.json() : null).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [refreshKey]);

  const fmtARS = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

  if (loading) return <div className="flex items-center justify-center py-20"><DynamicIcon name="Loader2" className="w-8 h-8 animate-spin text-slate-400" /></div>;
  if (!data) return <div className="text-center py-20 text-slate-400">No hay datos para analizar</div>;

  const totalMemberExpense = data.memberSpending.reduce((s, m) => s + m.totalExpense, 0);
  const totalMemberIncome = data.memberSpending.reduce((s, m) => s + m.totalIncome, 0);
  const maxMemberExpense = Math.max(...data.memberSpending.map(m => m.totalExpense), 1);
  const totalCatExpense = data.categoryBreakdown.reduce((s, c) => s + c.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Análisis</h2>
        <p className="text-slate-500 text-sm">Visualice cómo gasta cada integrante del hogar</p>
      </div>

      {/* Member Spending Analysis */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DynamicIcon name="Users" className="w-5 h-5 text-emerald-600" />
            Gastos por Integrante (mes actual)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.memberSpending.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>Agregue miembros del hogar para ver el análisis</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-rose-50">
                  <p className="text-xs text-rose-600 font-medium">Gasto Total Hogar</p>
                  <p className="text-xl font-bold text-rose-700 mt-1">{fmtARS(totalMemberExpense)}</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50">
                  <p className="text-xs text-emerald-600 font-medium">Ingreso Total</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">{fmtARS(totalMemberIncome)}</p>
                </div>
                <div className={`p-4 rounded-xl ${totalMemberIncome - totalMemberExpense >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
                  <p className={`text-xs font-medium ${totalMemberIncome - totalMemberExpense >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>Balance</p>
                  <p className={`text-xl font-bold mt-1 ${totalMemberIncome - totalMemberExpense >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>{fmtARS(totalMemberIncome - totalMemberExpense)}</p>
                </div>
              </div>

              {/* Per member bars */}
              <div className="space-y-4">
                {data.memberSpending.map(m => (
                  <div key={m.memberId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${m.isMinor ? 'bg-amber-400' : 'bg-slate-600'}`}>
                          {m.memberName.charAt(0)}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-800">{m.memberName}</span>
                          {m.isMinor && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Menor</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-rose-600">{fmtARS(m.totalExpense)}</p>
                        <p className="text-xs text-slate-400">{totalMemberExpense > 0 ? ((m.totalExpense / totalMemberExpense) * 100).toFixed(1) : 0}% del total</p>
                      </div>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all" style={{ width: `${(m.totalExpense / maxMemberExpense) * 100}%` }} />
                    </div>
                    {m.totalIncome > 0 && (
                      <p className="text-xs text-emerald-600 mt-1">Ingresos: {fmtARS(m.totalIncome)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DynamicIcon name="PieChart" className="w-5 h-5 text-emerald-600" />
            Desglose por Categoría (mes actual)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.categoryBreakdown.length === 0 ? (
            <div className="text-center py-8 text-slate-400"><p>Sin gastos este mes</p></div>
          ) : (
            <div className="space-y-5">
              {data.categoryBreakdown.map(cat => (
                <div key={cat.categoryId}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DynamicIcon name={cat.categoryIcon} className="w-4 h-4" style={{ color: cat.categoryColor }} />
                      <span className="text-sm font-medium text-slate-800">{cat.categoryName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-800">{fmtARS(cat.total)}</span>
                      <span className="text-xs text-slate-400 ml-2">{cat.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.categoryColor }} />
                  </div>
                  {cat.subcategories.length > 0 && (
                    <div className="ml-4 space-y-1.5">
                      {cat.subcategories.map(sub => (
                        <div key={sub.subcategoryId} className="flex items-center gap-2">
                          <DynamicIcon name={cat.categoryIcon} className="w-3 h-3 text-slate-400" />
                          <span className="text-xs text-slate-500 flex-1">{sub.subcategoryName}</span>
                          <span className="text-xs text-slate-600 font-medium">{fmtARS(sub.total)}</span>
                          <span className="text-xs text-slate-400 w-12 text-right">{sub.percentage.toFixed(1)}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(sub.percentage, 100)}%`, backgroundColor: cat.categoryColor, opacity: 0.6 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DynamicIcon name="BarChart3" className="w-5 h-5 text-emerald-600" />
            Tendencia de los Últimos 6 Meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.monthlyTrend.map((m, i) => {
              const maxVal = Math.max(...data.monthlyTrend.map(x => Math.max(x.income, x.expense)), 1);
              return (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-600 w-20 capitalize shrink-0">{m.month}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-emerald-500 w-8">Ingreso</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${(m.income / maxVal) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-600 w-24 text-right">{fmtARS(m.income)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-500 w-8">Gasto</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-rose-400 transition-all" style={{ width: `${(m.expense / maxVal) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-600 w-24 text-right">{fmtARS(m.expense)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Account Summary */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DynamicIcon name="Wallet" className="w-5 h-5 text-emerald-600" />
            Resumen de Cuentas (mes actual)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.accountSummary.map(acc => (
              <div key={acc.accountId} className="p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">{acc.accountName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${acc.currency === 'USD' ? 'bg-teal-100 text-teal-700' : 'bg-emerald-100 text-emerald-700'}`}>{acc.currency}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Saldo actual</span>
                    <span className="font-semibold text-slate-800">{acc.currency === 'USD' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(acc.balance) : fmtARS(acc.balance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-500">Ingresos</span>
                    <span className="text-emerald-600">+{acc.currency === 'USD' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(acc.income) : fmtARS(acc.income)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-rose-500">Gastos</span>
                    <span className="text-rose-600">-{acc.currency === 'USD' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(acc.expense) : fmtARS(acc.expense)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
