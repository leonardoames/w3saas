import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, isWithinInterval, isValid, startOfDay, endOfDay, differenceInCalendarDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";
import { KPICard } from "@/components/dashboard/KPICard";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { DailyRevenueBarChart } from "@/components/dashboard/DailyRevenueBarChart";
import { CumulativeRevenueChart } from "@/components/dashboard/CumulativeRevenueChart";
import { RevenueHeroCard } from "@/components/dashboard/RevenueHeroCard";
import { PlatformSelect } from "@/components/dashboard/PlatformSelect";
import { PlatformType } from "@/lib/platformConfig";
import { DailyAlert } from "@/components/dashboard/DailyAlert";
import { BreakEvenCard } from "@/components/dashboard/BreakEvenCard";

import { KPISkeletonGrid, ChartSkeleton, GoalSkeleton } from "@/components/dashboard/DashboardSkeletons";
import { EmptyChartState } from "@/components/dashboard/EmptyChartState";

interface DailyRow {
  data: string;
  investimento: number;
  sessoes: number;
  pedidos_pagos: number;
  receita_paga: number;
}

const KPI_TOOLTIPS = {
  faturamento: "Soma de todas as vendas no período selecionado",
  roas: "Faturamento ÷ Investimento em tráfego. Quanto você recebe para cada R$1 investido",
  vendas: "Total de pedidos registrados no período",
  sessoes: "Total de visitas à sua loja no período",
  ticket: "Faturamento ÷ número de vendas. Valor médio de cada pedido",
  custo: "Investimento em tráfego ÷ número de vendas. Quanto custa gerar cada venda",
  conversao: "Vendas ÷ Sessões × 100. Percentual de visitantes que compraram",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [allData, setAllData] = useState<DailyRow[]>([]);
  const [allMetricsRaw, setAllMetricsRaw] = useState<any[]>([]);
  const [revenueGoal, setRevenueGoal] = useState<number | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [dateRange, setDateRange] = useState({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) });
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>("todos");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    const last90 = subDays(new Date(), 90);
    const last90Str = format(last90, "yyyy-MM-dd");

    const [dailyRes, metricsRes] = await Promise.all([
      supabase
        .from("daily_results" as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("data", last90Str)
        .order("data", { ascending: true }),
      supabase
        .from("metrics_diarias")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", last90Str)
        .order("data", { ascending: true }),
    ]);

    const dailyData = (!dailyRes.error && dailyRes.data) ? dailyRes.data as any[] : [];
    const metricsData = (!metricsRes.error && metricsRes.data) ? metricsRes.data as any[] : [];
    
    setAllMetricsRaw(metricsData);

    const dateMap: Record<string, DailyRow> = {};
    for (const d of dailyData) {
      if (!d.data) continue;
      const key = d.data.substring(0, 10);
      if (!dateMap[key]) dateMap[key] = { data: key, investimento: 0, sessoes: 0, pedidos_pagos: 0, receita_paga: 0 };
      dateMap[key].investimento += Number(d.investimento) || 0;
      dateMap[key].sessoes += Number(d.sessoes) || 0;
      dateMap[key].pedidos_pagos += Number(d.pedidos_pagos) || 0;
      dateMap[key].receita_paga += Number(d.receita_paga) || 0;
    }
    for (const d of metricsData) {
      if (!d.data) continue;
      const key = d.data.substring(0, 10);
      if (!dateMap[key]) dateMap[key] = { data: key, investimento: 0, sessoes: 0, pedidos_pagos: 0, receita_paga: 0 };
      dateMap[key].investimento += Number(d.investimento_trafego) || 0;
      dateMap[key].sessoes += Number(d.sessoes) || 0;
      dateMap[key].pedidos_pagos += Number(d.vendas_quantidade) || 0;
      dateMap[key].receita_paga += Number(d.faturamento) || 0;
    }

    const merged = Object.values(dateMap).sort((a, b) => a.data.localeCompare(b.data));
    setAllData(merged);
    setDataLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const handlePeriodChange = (period: string, start: Date, end: Date) => {
    setSelectedPeriod(period);
    setDateRange({ from: startOfDay(start), to: endOfDay(end) });
  };

  const handleGoalLoaded = useCallback((goal: number | null) => {
    setRevenueGoal(goal);
  }, []);

  const effectiveData = useMemo(() => {
    if (selectedPlatform === "todos") return allData;
    const dateMap: Record<string, DailyRow> = {};
    for (const d of allMetricsRaw) {
      if (d.platform !== selectedPlatform) continue;
      if (!d.data) continue;
      const key = d.data.substring(0, 10);
      if (!dateMap[key]) dateMap[key] = { data: key, investimento: 0, sessoes: 0, pedidos_pagos: 0, receita_paga: 0 };
      dateMap[key].investimento += Number(d.investimento_trafego) || 0;
      dateMap[key].sessoes += Number(d.sessoes) || 0;
      dateMap[key].pedidos_pagos += Number(d.vendas_quantidade) || 0;
      dateMap[key].receita_paga += Number(d.faturamento) || 0;
    }
    return Object.values(dateMap).sort((a, b) => a.data.localeCompare(b.data));
  }, [allData, allMetricsRaw, selectedPlatform]);

  const filtered = useMemo(() => {
    const rangeStart = startOfDay(dateRange.from);
    const rangeEnd = endOfDay(dateRange.to);
    return effectiveData.filter((m) => {
      if (!m.data) return false;
      const date = parseISO(m.data.substring(0, 10));
      return isValid(date) && isWithinInterval(date, { start: rangeStart, end: rangeEnd });
    });
  }, [effectiveData, dateRange]);

  const prevFiltered = useMemo(() => {
    const daysCount = differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
    const prevEnd = subDays(startOfDay(dateRange.from), 1);
    const prevStart = subDays(prevEnd, daysCount - 1);
    return effectiveData.filter((m) => {
      if (!m.data) return false;
      const date = parseISO(m.data.substring(0, 10));
      return isValid(date) && isWithinInterval(date, { start: startOfDay(prevStart), end: endOfDay(prevEnd) });
    });
  }, [effectiveData, dateRange]);

  // KPIs
  const faturamento = filtered.reduce((s, m) => s + m.receita_paga, 0);
  const investimento = filtered.reduce((s, m) => s + m.investimento, 0);
  const vendas = filtered.reduce((s, m) => s + m.pedidos_pagos, 0);
  const sessoes = filtered.reduce((s, m) => s + m.sessoes, 0);
  const roas = investimento > 0 ? faturamento / investimento : 0;
  const ticketMedio = vendas > 0 ? faturamento / vendas : 0;
  const custoVenda = vendas > 0 ? investimento / vendas : 0;
  const taxaConversao = sessoes > 0 ? (vendas / sessoes) * 100 : 0;

  const prevFat = prevFiltered.reduce((s, m) => s + m.receita_paga, 0);
  const prevInv = prevFiltered.reduce((s, m) => s + m.investimento, 0);
  const prevVendas = prevFiltered.reduce((s, m) => s + m.pedidos_pagos, 0);
  const prevSessoes = prevFiltered.reduce((s, m) => s + m.sessoes, 0);
  const prevRoas = prevInv > 0 ? prevFat / prevInv : 0;
  const prevTicket = prevVendas > 0 ? prevFat / prevVendas : 0;
  const prevCusto = prevVendas > 0 ? prevInv / prevVendas : 0;
  const prevConversao = prevSessoes > 0 ? (prevVendas / prevSessoes) * 100 : 0;

  const pctChange = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : undefined);
  const daysInPeriod = differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
  const hasData = filtered.length > 0;

  // Daily alert
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayData = effectiveData.find(d => d.data === todayStr);
  const todayRevenue = todayData?.receita_paga ?? 0;
  const last7 = effectiveData.filter(d => {
    const date = parseISO(d.data);
    const sevenAgo = subDays(new Date(), 7);
    return isValid(date) && date >= startOfDay(sevenAgo) && d.data !== todayStr;
  });
  const avg7d = last7.length > 0 ? last7.reduce((s, d) => s + d.receita_paga, 0) / last7.length : 0;

  const chartData = filtered.map((d) => ({
    data: d.data,
    faturamento: d.receita_paga,
  }));

  const prevChartData = prevFiltered.map((d) => ({
    data: d.data,
    faturamento: d.receita_paga,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Você precisa estar logado.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão consolidada dos seus resultados</p>
      </div>

      {/* Period Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <PlatformSelect 
            value={selectedPlatform} 
            onValueChange={setSelectedPlatform} 
            className="w-[180px] h-8 text-xs"
          />
          <PeriodFilter
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
        </div>
      </div>

      {/* Daily Alert */}
      <DailyAlert todayRevenue={todayRevenue} avgRevenue7d={avg7d} />

      {/* Revenue Goal + Projection */}
      {dataLoading ? <GoalSkeleton /> : (
        <RevenueHeroCard currentRevenue={faturamento} userId={user.id} onGoalLoaded={handleGoalLoaded} />
      )}

      {/* KPIs Row 1: Primary */}
      {dataLoading ? <KPISkeletonGrid /> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard
              title="Faturamento"
              value={faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              subtitle="Total do período"
              dominant
              change={pctChange(faturamento, prevFat)}
              tooltip={KPI_TOOLTIPS.faturamento}
              isEmpty={!hasData}
            />
            <KPICard title="ROAS Médio" value={roas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} subtitle="Receita / Investimento" change={pctChange(roas, prevRoas)} tooltip={KPI_TOOLTIPS.roas} isEmpty={!hasData} />
            <KPICard title="Vendas" value={vendas.toLocaleString("pt-BR")} change={pctChange(vendas, prevVendas)} tooltip={KPI_TOOLTIPS.vendas} isEmpty={!hasData} />
            <KPICard title="Sessões" value={sessoes.toLocaleString("pt-BR")} change={pctChange(sessoes, prevSessoes)} tooltip={KPI_TOOLTIPS.sessoes} isEmpty={!hasData} />
          </div>

          {/* KPIs Row 2: Secondary (smaller) */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard secondary title="Ticket Médio" value={`R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} change={pctChange(ticketMedio, prevTicket)} tooltip={KPI_TOOLTIPS.ticket} isEmpty={!hasData} />
            <KPICard secondary title="Custo por Venda" value={`R$ ${custoVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} change={pctChange(custoVenda, prevCusto)} invertChange tooltip={KPI_TOOLTIPS.custo} isEmpty={!hasData} />
            <KPICard secondary title="Taxa de Conversão" value={`${taxaConversao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`} change={pctChange(taxaConversao, prevConversao)} tooltip={KPI_TOOLTIPS.conversao} isEmpty={!hasData} />
            <BreakEvenCard investimento={investimento} faturamento={faturamento} days={daysInPeriod} />
          </div>
        </>
      )}

      {roas < 2 && roas > 0 && (
        <Alert variant="destructive" className="border-destructive/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Atenção: O ROAS está abaixo de 2.</AlertDescription>
        </Alert>
      )}

      {/* Charts */}
      {dataLoading ? <ChartSkeleton /> : !hasData ? <EmptyChartState /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DailyRevenueBarChart data={chartData} />
          <CumulativeRevenueChart data={chartData} previousData={prevChartData} goal={revenueGoal} />
        </div>
      )}

      {/* CTA sutil */}
      <div className="rounded-lg border border-primary/10 bg-primary/[0.02] px-4 py-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Gerencie seus dados no <span className="text-foreground font-medium">Acompanhamento Diário</span></p>
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/acompanhamento")} className="shrink-0 gap-1.5 h-7 text-xs text-muted-foreground hover:text-foreground">
          Ir para Acompanhamento
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
