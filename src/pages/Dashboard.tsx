import { AlertCircle, CheckCircle2, ArrowRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO, isWithinInterval, isValid } from "date-fns";
import { DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";
import { KPICard } from "@/components/dashboard/KPICard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { RevenueChart } from "@/components/dashboard/RevenueChart";

interface DailyRow {
  data: string;
  investimento: number;
  sessoes: number;
  pedidos_pagos: number;
  receita_paga: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState<DailyRow[]>([]);

  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 7), to: new Date() });
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    const last90 = subDays(new Date(), 90);
    const { data, error } = await supabase
      .from("daily_results" as any)
      .select("*")
      .eq("user_id", user.id)
      .gte("data", format(last90, "yyyy-MM-dd"))
      .order("data", { ascending: true });
    if (!error && data) {
      setAllData(
        (data as any[]).map((d) => ({
          data: d.data,
          investimento: Number(d.investimento) || 0,
          sessoes: Number(d.sessoes) || 0,
          pedidos_pagos: Number(d.pedidos_pagos) || 0,
          receita_paga: Number(d.receita_paga) || 0,
        }))
      );
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const handlePeriodChange = (period: string, start: Date, end: Date) => {
    setSelectedPeriod(period);
    setDateRange({ from: start, to: end });
  };

  const filtered = useMemo(
    () =>
      allData.filter((m) => {
        const date = parseISO(m.data);
        return isValid(date) && isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
      }),
    [allData, dateRange]
  );

  const prevFiltered = useMemo(() => {
    const len = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const prevEnd = subDays(dateRange.from, 1);
    const prevStart = subDays(prevEnd, len);
    return allData.filter((m) => {
      const date = parseISO(m.data);
      return isValid(date) && isWithinInterval(date, { start: prevStart, end: prevEnd });
    });
  }, [allData, dateRange]);

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
  const prevVendas = prevFiltered.reduce((s, m) => s + m.pedidos_pagos, 0);
  const prevSessoes = prevFiltered.reduce((s, m) => s + m.sessoes, 0);

  const pctChange = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : undefined);

  // Chart data
  const chartData = filtered.map((d) => ({
    data: d.data,
    faturamento: d.receita_paga,
    platform: "agregado",
    sessoes: d.sessoes,
    investimento_trafego: d.investimento,
    vendas_quantidade: d.pedidos_pagos,
    vendas_valor: d.receita_paga,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground animate-pulse">Carregando seus dados...</p>
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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão consolidada dos seus resultados</p>
        </div>

        {/* Period Filter */}
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Período de análise</h3>
            <PeriodFilter
              selectedPeriod={selectedPeriod}
              onPeriodChange={handlePeriodChange}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Faturamento"
            value={faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            subtitle="Total do período"
            dominant
            change={pctChange(faturamento, prevFat)}
          />
          <KPICard title="ROAS Médio" value={roas.toFixed(2)} subtitle="Receita / Investimento" />
          <KPICard title="Vendas" value={vendas.toLocaleString("pt-BR")} change={pctChange(vendas, prevVendas)} />
          <KPICard title="Sessões" value={sessoes.toLocaleString("pt-BR")} change={pctChange(sessoes, prevSessoes)} />
        </div>

        {roas < 2 && roas > 0 && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Atenção: O ROAS está abaixo de 2.</AlertDescription>
          </Alert>
        )}

        {/* Chart + Side Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 md:p-8 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-1">Evolução de Faturamento</h3>
            <p className="text-xs text-muted-foreground mb-4">Acompanhe a tendência no período selecionado</p>
            <RevenueChart data={chartData} previousTotal={prevFat} />
          </div>
          <div className="space-y-4">
            <MetricCard title="Ticket Médio" value={`R$ ${ticketMedio.toFixed(2)}`} />
            <MetricCard title="Custo por Venda" value={`R$ ${custoVenda.toFixed(2)}`} />
            <MetricCard title="Taxa de Conversão" value={`${taxaConversao.toFixed(2)}%`} />
          </div>
        </div>

        {/* CTA Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Gerencie seus dados no Acompanhamento Diário</p>
              <p className="text-sm text-muted-foreground mt-1">Adicione, edite ou importe seus resultados diários</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/app/acompanhamento")}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Ir para Acompanhamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
