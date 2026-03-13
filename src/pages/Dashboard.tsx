import { AlertCircle, ArrowRight, SlidersHorizontal } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  custoMidia: "Investimento ÷ Faturamento × 100 (TACoS). Percentual da receita consumida com mídia — quanto menor, melhor",
  conversao: "Vendas ÷ Sessões × 100. Percentual de visitantes que compraram",
  custoSessao: "Investimento em tráfego ÷ Sessões. Quanto custa trazer cada visita — quanto menor, melhor",
};

type WidgetKey =
  | "dailyAlert"
  | "goal"
  | "primaryKpis"
  | "secondaryKpis"
  | "charts"
  | "cta";

type KPIKey =
  | "investimento"
  | "roas"
  | "custoMidia"
  | "sessoes"
  | "vendas"
  | "ticket"
  | "conversao"
  | "custoSessao";

interface DashboardPreferences {
  widgets: Record<WidgetKey, boolean>;
  kpis: Record<KPIKey, boolean>;
}

const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  widgets: {
    dailyAlert: true,
    goal: true,
    primaryKpis: true,
    secondaryKpis: true,
    charts: true,
    cta: true,
  },
  kpis: {
    investimento: true,
    roas: true,
    custoMidia: true,
    sessoes: true,
    vendas: true,
    ticket: true,
    conversao: true,
    custoSessao: true,
  },
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
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_DASHBOARD_PREFERENCES);

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

  useEffect(() => {
    if (!user?.id) return;
    const key = `dashboard_preferences:${user.id}`;
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<DashboardPreferences>;
      setPreferences({
        widgets: { ...DEFAULT_DASHBOARD_PREFERENCES.widgets, ...(parsed.widgets || {}) },
        kpis: { ...DEFAULT_DASHBOARD_PREFERENCES.kpis, ...(parsed.kpis || {}) },
      });
    } catch {
      setPreferences(DEFAULT_DASHBOARD_PREFERENCES);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const key = `dashboard_preferences:${user.id}`;
    localStorage.setItem(key, JSON.stringify(preferences));
  }, [preferences, user?.id]);

  const toggleWidget = (key: WidgetKey) => {
    setPreferences((prev) => ({
      ...prev,
      widgets: { ...prev.widgets, [key]: !prev.widgets[key] },
    }));
  };

  const toggleKPI = (key: KPIKey) => {
    setPreferences((prev) => ({
      ...prev,
      kpis: { ...prev.kpis, [key]: !prev.kpis[key] },
    }));
  };

  const resetDashboard = () => setPreferences(DEFAULT_DASHBOARD_PREFERENCES);

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
  const taxaConversao = sessoes > 0 ? (vendas / sessoes) * 100 : 0;
  const custoMidia = faturamento > 0 ? (investimento / faturamento) * 100 : 0;
  const custoSessao = sessoes > 0 ? investimento / sessoes : 0;

  const prevFat = prevFiltered.reduce((s, m) => s + m.receita_paga, 0);
  const prevInv = prevFiltered.reduce((s, m) => s + m.investimento, 0);
  const prevVendas = prevFiltered.reduce((s, m) => s + m.pedidos_pagos, 0);
  const prevSessoes = prevFiltered.reduce((s, m) => s + m.sessoes, 0);
  const prevRoas = prevInv > 0 ? prevFat / prevInv : 0;
  const prevTicket = prevVendas > 0 ? prevFat / prevVendas : 0;
  const prevConversao = prevSessoes > 0 ? (prevVendas / prevSessoes) * 100 : 0;
  const prevCustoMidia = prevFat > 0 ? (prevInv / prevFat) * 100 : 0;
  const prevCustoSessao = prevSessoes > 0 ? prevInv / prevSessoes : 0;

  const pctChange = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : undefined);
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

  const primaryKPIItems = [
    {
      key: "investimento" as const,
      node: (
        <KPICard
          title="Investimento em Mídia"
          value={investimento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          subtitle="Total do período"
          dominant
          change={pctChange(investimento, prevInv)}
          tooltip="Soma do investimento em tráfego pago no período selecionado"
          isEmpty={!hasData}
        />
      ),
    },
    {
      key: "roas" as const,
      node: (
        <KPICard
          title="ROAS Médio"
          value={roas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          subtitle="Receita / Investimento"
          change={pctChange(roas, prevRoas)}
          tooltip={KPI_TOOLTIPS.roas}
          isEmpty={!hasData}
        />
      ),
    },
    {
      key: "custoMidia" as const,
      node: (
        <KPICard
          title="Custo de Mídia"
          value={`${custoMidia.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`}
          subtitle="TACoS do período"
          change={pctChange(custoMidia, prevCustoMidia)}
          invertChange
          tooltip={KPI_TOOLTIPS.custoMidia}
          isEmpty={!hasData}
        />
      ),
    },
    {
      key: "sessoes" as const,
      node: (
        <KPICard
          title="Sessões"
          value={sessoes.toLocaleString("pt-BR")}
          change={pctChange(sessoes, prevSessoes)}
          tooltip={KPI_TOOLTIPS.sessoes}
          isEmpty={!hasData}
        />
      ),
    },
  ];

  const secondaryKPIItems = [
    {
      key: "vendas" as const,
      node: <KPICard secondary title="Vendas" value={vendas.toLocaleString("pt-BR")} change={pctChange(vendas, prevVendas)} tooltip={KPI_TOOLTIPS.vendas} isEmpty={!hasData} />,
    },
    {
      key: "ticket" as const,
      node: <KPICard secondary title="Ticket Médio" value={`R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} change={pctChange(ticketMedio, prevTicket)} tooltip={KPI_TOOLTIPS.ticket} isEmpty={!hasData} />,
    },
    {
      key: "conversao" as const,
      node: <KPICard secondary title="Taxa de Conversão" value={`${taxaConversao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`} change={pctChange(taxaConversao, prevConversao)} tooltip={KPI_TOOLTIPS.conversao} isEmpty={!hasData} />,
    },
    {
      key: "custoSessao" as const,
      node: <KPICard secondary title="Custo por Sessão" value={`R$ ${custoSessao.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} change={pctChange(custoSessao, prevCustoSessao)} invertChange tooltip={KPI_TOOLTIPS.custoSessao} isEmpty={!hasData} />,
    },
  ];

  const visiblePrimary = primaryKPIItems.filter((item) => preferences.kpis[item.key]);
  const visibleSecondary = secondaryKPIItems.filter((item) => preferences.kpis[item.key]);

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Personalizar visão
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Blocos visíveis</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={preferences.widgets.dailyAlert} onCheckedChange={() => toggleWidget("dailyAlert")}>Alerta diário</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.widgets.goal} onCheckedChange={() => toggleWidget("goal")}>Meta e projeção</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.widgets.primaryKpis} onCheckedChange={() => toggleWidget("primaryKpis")}>KPIs principais</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.widgets.secondaryKpis} onCheckedChange={() => toggleWidget("secondaryKpis")}>KPIs secundários</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.widgets.charts} onCheckedChange={() => toggleWidget("charts")}>Gráficos</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.widgets.cta} onCheckedChange={() => toggleWidget("cta")}>CTA final</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Métricas</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={preferences.kpis.investimento} onCheckedChange={() => toggleKPI("investimento")}>Investimento</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.kpis.roas} onCheckedChange={() => toggleKPI("roas")}>ROAS</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.kpis.custoMidia} onCheckedChange={() => toggleKPI("custoMidia")}>Custo de mídia</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.kpis.sessoes} onCheckedChange={() => toggleKPI("sessoes")}>Sessões</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.kpis.vendas} onCheckedChange={() => toggleKPI("vendas")}>Vendas</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.kpis.ticket} onCheckedChange={() => toggleKPI("ticket")}>Ticket médio</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.kpis.conversao} onCheckedChange={() => toggleKPI("conversao")}>Taxa de conversão</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={preferences.kpis.custoSessao} onCheckedChange={() => toggleKPI("custoSessao")}>Custo por sessão</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <Button variant="ghost" size="sm" onClick={resetDashboard} className="w-full justify-center text-xs h-7">Restaurar padrão</Button>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Daily Alert */}
      {preferences.widgets.dailyAlert && <DailyAlert todayRevenue={todayRevenue} avgRevenue7d={avg7d} />}

      {/* Revenue Goal + Projection */}
      {preferences.widgets.goal && (dataLoading ? <GoalSkeleton /> : (
        <RevenueHeroCard currentRevenue={faturamento} previousRevenue={prevFat} userId={user.id} onGoalLoaded={handleGoalLoaded} />
      ))}

      {/* KPIs Row 1: Primary */}
      {preferences.widgets.primaryKpis && (dataLoading ? <KPISkeletonGrid /> : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {visiblePrimary.map((item) => <div key={item.key}>{item.node}</div>)}
        </div>
      ))}

      {/* KPIs Row 2: Secondary (smaller) */}
      {preferences.widgets.secondaryKpis && (dataLoading ? <KPISkeletonGrid /> : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {visibleSecondary.map((item) => <div key={item.key}>{item.node}</div>)}
        </div>
      ))}

      {roas < 2 && roas > 0 && (
        <Alert variant="destructive" className="border-destructive/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Atenção: O ROAS está abaixo de 2.</AlertDescription>
        </Alert>
      )}

      {/* Charts */}
      {preferences.widgets.charts && (dataLoading ? <ChartSkeleton /> : !hasData ? <EmptyChartState /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DailyRevenueBarChart data={chartData} goal={revenueGoal} />
          <CumulativeRevenueChart data={chartData} previousData={prevChartData} goal={revenueGoal} />
        </div>
      ))}

      {/* CTA sutil */}
      {preferences.widgets.cta && (
        <div className="rounded-lg border border-primary/10 bg-primary/[0.02] px-4 py-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Gerencie seus dados no <span className="text-foreground font-medium">Acompanhamento Diário</span></p>
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/acompanhamento")} className="shrink-0 gap-1.5 h-7 text-xs text-muted-foreground hover:text-foreground">
            Ir para Acompanhamento
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
