"use client";

import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useMovements } from "@/hooks/useMovements";
import { useAccounts } from "@/hooks/useAccounts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";

export default function DashboardPage() {
  const { movements, loading: movLoading } = useMovements();
  const { accounts, loading: accLoading } = useAccounts();

  const loading = movLoading || accLoading;

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-slate-200 rounded-lg" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-80 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthMovements = movements.filter((m) => {
    const d = new Date(m.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIn = thisMonthMovements
    .filter((m) => m.type === "entrada")
    .reduce((sum, m) => sum + m.amount, 0);

  const totalOut = thisMonthMovements
    .filter((m) => m.type === "saída")
    .reduce((sum, m) => sum + m.amount, 0);

  const balance = totalIn - totalOut;

  // Overdue Accounts
  const totalOverdue = accounts
    .filter((a) => a.status === "atrasado")
    .reduce((sum, a) => sum + a.amount, 0);

  // Generate chart data for last 6 months
  const monthsList = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const flowData = Array.from({ length: 6 }).map((_, index) => {
    const d = new Date();
    d.setMonth(now.getMonth() - (5 - index));
    const mIndex = d.getMonth();
    const yVal = d.getFullYear();

    const mMovements = movements.filter((m) => {
      const dateObj = new Date(m.date);
      return dateObj.getMonth() === mIndex && dateObj.getFullYear() === yVal;
    });

    const entries = mMovements
      .filter((m) => m.type === "entrada")
      .reduce((sum, m) => sum + m.amount, 0);

    const expenses = mMovements
      .filter((m) => m.type === "saída")
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      name: `${monthsList[mIndex]}/${String(yVal).slice(-2)}`,
      "Entradas": entries,
      "Saídas": expenses,
      "Saldo": entries - expenses,
    };
  });

  // Balance evolution (cumulative)
  let runningBalance = 0;
  const evolutionData = flowData.map((d) => {
    runningBalance += d.Saldo;
    return {
      name: d.name,
      "Saldo Acumulado": runningBalance,
    };
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Painel Financeiro</h2>
          <p className="text-sm text-slate-500">Resumo de fluxo de caixa e controle de Silvana Uniformes</p>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-slate-150 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Entradas do Mês
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalIn)}</div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-medium flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
                movimentações de {monthsList[currentMonth]}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-150 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Saídas do Mês
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalOut)}</div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <span className="text-red-600 font-medium flex items-center">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                </span>
                despesas de {monthsList[currentMonth]}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-150 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Saldo do Mês
              </CardTitle>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${balance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                <DollarSign className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatCurrency(balance)}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Líquido arrecadado neste período
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-150 shadow-sm bg-orange-50/20 border-orange-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-orange-700 uppercase tracking-wider">
                Contas Vencidas
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-655">{formatCurrency(totalOverdue)}</div>
              <p className="text-xs text-orange-600 font-medium mt-1">
                {totalOverdue > 0 ? "Ação imediata necessária" : "Nenhuma conta vencida"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Cash Flow */}
          <Card className="border-slate-150 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Fluxo de Caixa Mensal</CardTitle>
              <CardDescription>Comparativo de Entradas e Saídas (Últimos 6 meses)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                      formatter={(value) => [formatCurrency(Number(value))]}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Bar dataKey="Entradas" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="Saídas" fill="#EA580C" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Balance Evolution */}
          <Card className="border-slate-150 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-900">Evolução do Saldo</CardTitle>
              <CardDescription>Evolução acumulada de caixa no decorrer dos meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                      formatter={(value) => [formatCurrency(Number(value))]}
                    />
                    <Area type="monotone" dataKey="Saldo Acumulado" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorSaldo)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Activity List */}
        <Card className="border-slate-150 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Atividades Recentes</CardTitle>
            <CardDescription>Últimos registros de movimentações financeiras</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {movements.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Nenhuma movimentação registrada ainda. Comece adicionando suas entradas e saídas.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {movements.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.type === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                        {m.type === 'entrada' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{m.description}</p>
                        <p className="text-xs text-slate-500">{m.category} • {m.date.split("-").reverse().join("/")}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${m.type === 'entrada' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {m.type === 'entrada' ? '+' : '-'}{formatCurrency(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
