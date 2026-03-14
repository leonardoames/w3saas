import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export interface DREConfig {
  id: string;
  user_id: string;
  cmv_pct: number;
  impostos_pct: number;
  taxas_plataforma_pct: number;
  frete_liquido_pct: number;
}

export interface DespesaFixa {
  id: string;
  user_id: string;
  descricao: string;
  categoria: string;
  valor: number;
  is_active: boolean;
}

export interface DespesaAvulsa {
  id: string;
  user_id: string;
  mes_referencia: string;
  descricao: string;
  categoria: string;
  valor: number;
}

export interface ReceitaAvulsa {
  id: string;
  user_id: string;
  mes_referencia: string;
  descricao: string;
  categoria: string;
  valor: number;
}

export type AjusteCategoria =
  | "descontos"
  | "reembolsos"
  | "chargebacks"
  | "outras_receitas"
  | "outras_despesas_operacionais";

export interface DREAjusteMensal {
  id: string;
  user_id: string;
  mes_referencia: string;
  descricao: string;
  categoria: AjusteCategoria;
  valor: number;
}

interface UnifiedDaily {
  data: string;
  receita: number;
  investimento: number;
  pedidos: number;
  sessoes: number;
  fonteReceita: "metrics_diarias" | "daily_results";
  fonteInvestimento: "metrics_diarias" | "daily_results";
}

export interface DRECalculated {
  receitaIntegracoes: number;
  receitaManual: number;
  receitaBruta: number;
  descontosValor: number;
  reembolsosValor: number;
  chargebacksValor: number;
  deducoesReceita: number;
  receitaLiquida: number;
  cmvValor: number;
  impostosValor: number;
  taxasValor: number;
  freteValor: number;
  custosVariaveis: number;
  investimentoTrafego: number;
  despesasFixasTotal: number;
  despesasAvulsasTotal: number;
  outrasDespesasOperacionais: number;
  lucroBruto: number;
  lucroOperacional: number;
  lucroLiquido: number;
  margemLiquida: number;
  pedidosPagos: number;
  sessoes: number;
  ticketMedio: number;
  taxaConversao: number;
  cpa: number;
  roas: number;
  roi: number;
}

function sumByCategory(adjustments: DREAjusteMensal[], category: AjusteCategoria): number {
  return adjustments
    .filter((a) => a.categoria === category)
    .reduce((sum, a) => sum + (Number(a.valor) || 0), 0);
}

function buildUnifiedDaily(metricsRows: any[], dailyRows: any[]): UnifiedDaily[] {
  const byDate = new Map<string, UnifiedDaily>();

  for (const m of metricsRows || []) {
    const date = String(m.data).slice(0, 10);
    const curr = byDate.get(date) || {
      data: date,
      receita: 0,
      investimento: 0,
      pedidos: 0,
      sessoes: 0,
      fonteReceita: "metrics_diarias" as const,
      fonteInvestimento: "metrics_diarias" as const,
    };

    curr.receita += Number(m.faturamento) || 0;
    curr.investimento += Number(m.investimento_trafego) || 0;
    curr.pedidos += Number(m.vendas_quantidade) || 0;
    curr.sessoes += Number(m.sessoes) || 0;
    curr.fonteReceita = "metrics_diarias";
    curr.fonteInvestimento = "metrics_diarias";

    byDate.set(date, curr);
  }

  for (const d of dailyRows || []) {
    const date = String(d.data).slice(0, 10);
    const curr = byDate.get(date) || {
      data: date,
      receita: 0,
      investimento: 0,
      pedidos: 0,
      sessoes: 0,
      fonteReceita: "daily_results" as const,
      fonteInvestimento: "daily_results" as const,
    };

    const hasMetricsRevenue = curr.fonteReceita === "metrics_diarias" && curr.receita > 0;
    const hasMetricsInvestment = curr.fonteInvestimento === "metrics_diarias" && curr.investimento > 0;

    if (!hasMetricsRevenue) {
      curr.receita = Number(d.receita_paga) || 0;
      curr.pedidos = Number(d.pedidos_pagos) || curr.pedidos;
      curr.fonteReceita = "daily_results";
    }

    if (!hasMetricsInvestment) {
      curr.investimento = Number(d.investimento) || 0;
      curr.fonteInvestimento = "daily_results";
    }

    if (!curr.sessoes || curr.sessoes === 0) {
      curr.sessoes = Number(d.sessoes) || 0;
    }

    byDate.set(date, curr);
  }

  return Array.from(byDate.values());
}

function calculateDRE(
  unifiedDaily: UnifiedDaily[],
  receitasAvulsasTotal: number,
  despesasAvulsasTotal: number,
  despesasFixasTotal: number,
  adjustments: DREAjusteMensal[],
  config: DREConfig | null
): DRECalculated {
  const receitaIntegracoes = unifiedDaily.reduce((sum, d) => sum + d.receita, 0);
  const investimentoTrafego = unifiedDaily.reduce((sum, d) => sum + d.investimento, 0);
  const pedidosPagos = unifiedDaily.reduce((sum, d) => sum + d.pedidos, 0);
  const sessoes = unifiedDaily.reduce((sum, d) => sum + d.sessoes, 0);

  const outrasReceitas = sumByCategory(adjustments, "outras_receitas");
  const descontosValor = sumByCategory(adjustments, "descontos");
  const reembolsosValor = sumByCategory(adjustments, "reembolsos");
  const chargebacksValor = sumByCategory(adjustments, "chargebacks");
  const outrasDespesasOperacionais = sumByCategory(adjustments, "outras_despesas_operacionais");

  const receitaManual = receitasAvulsasTotal + outrasReceitas;
  const receitaBruta = receitaIntegracoes + receitaManual;

  const deducoesReceita = descontosValor + reembolsosValor + chargebacksValor;
  const receitaLiquida = Math.max(0, receitaBruta - deducoesReceita);

  const cmvPct = config?.cmv_pct || 0;
  const impostosPct = config?.impostos_pct || 0;
  const taxasPct = config?.taxas_plataforma_pct || 0;
  const fretePct = config?.frete_liquido_pct || 0;

  const cmvValor = (receitaLiquida * cmvPct) / 100;
  const impostosValor = (receitaLiquida * impostosPct) / 100;
  const taxasValor = (receitaLiquida * taxasPct) / 100;
  const freteValor = (receitaLiquida * fretePct) / 100;

  const custosVariaveis = cmvValor + impostosValor + taxasValor + freteValor;
  const lucroBruto = receitaLiquida - custosVariaveis;
  const lucroOperacional = lucroBruto - investimentoTrafego - despesasFixasTotal - despesasAvulsasTotal - outrasDespesasOperacionais;
  const lucroLiquido = lucroOperacional;

  const margemLiquida = receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0;
  const ticketMedio = pedidosPagos > 0 ? receitaLiquida / pedidosPagos : 0;
  const taxaConversao = sessoes > 0 ? (pedidosPagos / sessoes) * 100 : 0;
  const cpa = pedidosPagos > 0 ? investimentoTrafego / pedidosPagos : 0;
  const roas = investimentoTrafego > 0 ? receitaLiquida / investimentoTrafego : 0;
  const roi = investimentoTrafego > 0 ? (lucroLiquido / investimentoTrafego) * 100 : 0;

  return {
    receitaIntegracoes,
    receitaManual,
    receitaBruta,
    descontosValor,
    reembolsosValor,
    chargebacksValor,
    deducoesReceita,
    receitaLiquida,
    cmvValor,
    impostosValor,
    taxasValor,
    freteValor,
    custosVariaveis,
    investimentoTrafego,
    despesasFixasTotal,
    despesasAvulsasTotal,
    outrasDespesasOperacionais,
    lucroBruto,
    lucroOperacional,
    lucroLiquido,
    margemLiquida,
    pedidosPagos,
    sessoes,
    ticketMedio,
    taxaConversao,
    cpa,
    roas,
    roi,
  };
}

function buildDataQualityWarnings(unifiedDaily: UnifiedDaily[], config: DREConfig | null, current: DRECalculated): string[] {
  const warnings: string[] = [];

  if (!config) {
    warnings.push("Configuração de CMV/Impostos/Taxas/Frete não definida. O lucro pode estar superestimado.");
  }

  const allPctZero = (config?.cmv_pct || 0) + (config?.impostos_pct || 0) + (config?.taxas_plataforma_pct || 0) + (config?.frete_liquido_pct || 0) === 0;
  if (config && allPctZero) {
    warnings.push("Todos os percentuais variáveis estão zerados. Revise CMV, impostos, taxas e frete.");
  }

  const daysWithoutSessions = unifiedDaily.filter((d) => d.receita > 0 && (!d.sessoes || d.sessoes === 0)).length;
  if (daysWithoutSessions > 0) {
    warnings.push(`${daysWithoutSessions} dia(s) com receita, mas sem sessões registradas.`);
  }

  const daysWithoutInvestment = unifiedDaily.filter((d) => d.receita > 0 && (!d.investimento || d.investimento === 0)).length;
  if (daysWithoutInvestment > 0) {
    warnings.push(`${daysWithoutInvestment} dia(s) com receita, mas sem investimento informado.`);
  }

  if (current.receitaLiquida > 0 && current.lucroLiquido < 0) {
    warnings.push("A operação está com prejuízo líquido no período selecionado.");
  }

  return warnings;
}

export function useDRE(selectedMonth: Date, targetUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = targetUserId || user?.id;

  const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
  const mesReferencia = format(startOfMonth(selectedMonth), "yyyy-MM-dd");

  const prevMonth = subMonths(selectedMonth, 1);
  const prevMonthStart = format(startOfMonth(prevMonth), "yyyy-MM-dd");
  const prevMonthEnd = format(endOfMonth(prevMonth), "yyyy-MM-dd");
  const prevMesReferencia = format(startOfMonth(prevMonth), "yyyy-MM-dd");

  const configQuery = useQuery({
    queryKey: ["dre-config", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("dre_config").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data as DREConfig | null;
    },
    enabled: !!userId,
  });

  const fixedExpensesQuery = useQuery({
    queryKey: ["dre-despesas-fixas", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dre_despesas_fixas")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as DespesaFixa[];
    },
    enabled: !!userId,
  });

  const onetimeExpensesQuery = useQuery({
    queryKey: ["dre-despesas-avulsas", userId, mesReferencia],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dre_despesas_avulsas")
        .select("*")
        .eq("user_id", userId)
        .eq("mes_referencia", mesReferencia)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as DespesaAvulsa[];
    },
    enabled: !!userId,
  });

  const onetimeRevenuesQuery = useQuery({
    queryKey: ["dre-receitas-avulsas", userId, mesReferencia],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dre_receitas_avulsas")
        .select("*")
        .eq("user_id", userId)
        .eq("mes_referencia", mesReferencia)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ReceitaAvulsa[];
    },
    enabled: !!userId,
  });

  const adjustmentsQuery = useQuery({
    queryKey: ["dre-ajustes", userId, mesReferencia],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dre_ajustes_mensais")
        .select("*")
        .eq("user_id", userId)
        .eq("mes_referencia", mesReferencia)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as DREAjusteMensal[];
    },
    enabled: !!userId,
  });

  const currentMetricsQuery = useQuery({
    queryKey: ["dre-current-metrics", userId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics_diarias")
        .select("data,faturamento,investimento_trafego,sessoes,vendas_quantidade")
        .eq("user_id", userId!)
        .gte("data", monthStart)
        .lte("data", monthEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const currentDailyQuery = useQuery({
    queryKey: ["dre-current-daily", userId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_results")
        .select("data,receita_paga,investimento,sessoes,pedidos_pagos")
        .eq("user_id", userId!)
        .gte("data", monthStart)
        .lte("data", monthEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const prevMetricsQuery = useQuery({
    queryKey: ["dre-prev-metrics", userId, prevMonthStart, prevMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics_diarias")
        .select("data,faturamento,investimento_trafego,sessoes,vendas_quantidade")
        .eq("user_id", userId!)
        .gte("data", prevMonthStart)
        .lte("data", prevMonthEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const prevDailyQuery = useQuery({
    queryKey: ["dre-prev-daily", userId, prevMonthStart, prevMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_results")
        .select("data,receita_paga,investimento,sessoes,pedidos_pagos")
        .eq("user_id", userId!)
        .gte("data", prevMonthStart)
        .lte("data", prevMonthEnd);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const prevOnetimeExpensesQuery = useQuery({
    queryKey: ["dre-prev-despesas-avulsas", userId, prevMesReferencia],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dre_despesas_avulsas")
        .select("*")
        .eq("user_id", userId)
        .eq("mes_referencia", prevMesReferencia);
      if (error) throw error;
      return (data || []) as DespesaAvulsa[];
    },
    enabled: !!userId,
  });

  const prevOnetimeRevenuesQuery = useQuery({
    queryKey: ["dre-prev-receitas-avulsas", userId, prevMesReferencia],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dre_receitas_avulsas")
        .select("*")
        .eq("user_id", userId)
        .eq("mes_referencia", prevMesReferencia);
      if (error) throw error;
      return (data || []) as ReceitaAvulsa[];
    },
    enabled: !!userId,
  });

  const prevAdjustmentsQuery = useQuery({
    queryKey: ["dre-prev-ajustes", userId, prevMesReferencia],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dre_ajustes_mensais")
        .select("*")
        .eq("user_id", userId)
        .eq("mes_referencia", prevMesReferencia);
      if (error) throw error;
      return (data || []) as DREAjusteMensal[];
    },
    enabled: !!userId,
  });

  const config = configQuery.data || null;
  const fixedExpenses = fixedExpensesQuery.data || [];
  const onetimeExpenses = onetimeExpensesQuery.data || [];
  const onetimeRevenues = onetimeRevenuesQuery.data || [];
  const adjustments = adjustmentsQuery.data || [];

  const despesasFixasTotal = fixedExpenses.filter((d) => d.is_active).reduce((sum, d) => sum + Number(d.valor), 0);
  const despesasAvulsasTotal = onetimeExpenses.reduce((sum, d) => sum + Number(d.valor), 0);
  const receitasAvulsasTotal = onetimeRevenues.reduce((sum, r) => sum + Number(r.valor), 0);

  const currentUnifiedDaily = buildUnifiedDaily(currentMetricsQuery.data || [], currentDailyQuery.data || []);
  const previousUnifiedDaily = buildUnifiedDaily(prevMetricsQuery.data || [], prevDailyQuery.data || []);

  const currentDRE = calculateDRE(
    currentUnifiedDaily,
    receitasAvulsasTotal,
    despesasAvulsasTotal,
    despesasFixasTotal,
    adjustments,
    config
  );

  const previousDRE = calculateDRE(
    previousUnifiedDaily,
    (prevOnetimeRevenuesQuery.data || []).reduce((sum, r) => sum + Number(r.valor), 0),
    (prevOnetimeExpensesQuery.data || []).reduce((sum, d) => sum + Number(d.valor), 0),
    despesasFixasTotal,
    prevAdjustmentsQuery.data || [],
    config
  );

  const dataQualityWarnings = buildDataQualityWarnings(currentUnifiedDaily, config, currentDRE);

  const isConfigured = !!config;
  const isLoading =
    configQuery.isLoading ||
    fixedExpensesQuery.isLoading ||
    currentMetricsQuery.isLoading ||
    currentDailyQuery.isLoading;

  const upsertConfig = useMutation({
    mutationFn: async (values: Partial<DREConfig>) => {
      const { data: existing } = await (supabase as any).from("dre_config").select("id").eq("user_id", userId).maybeSingle();

      if (existing) {
        const { error } = await (supabase as any).from("dre_config").update(values).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("dre_config").insert({ user_id: userId, ...values });
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dre-config"] }),
  });

  const addFixedExpense = useMutation({
    mutationFn: async (values: { descricao: string; categoria: string; valor: number }) => {
      const { error } = await (supabase as any).from("dre_despesas_fixas").insert({ user_id: userId, ...values });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dre-despesas-fixas"] }),
  });

  const updateFixedExpense = useMutation({
    mutationFn: async ({ id, ...values }: Partial<DespesaFixa> & { id: string }) => {
      const { error } = await (supabase as any).from("dre_despesas_fixas").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dre-despesas-fixas"] }),
  });

  const deleteFixedExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("dre_despesas_fixas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dre-despesas-fixas"] }),
  });

  const addOnetimeExpense = useMutation({
    mutationFn: async (values: { descricao: string; categoria: string; valor: number }) => {
      const { error } = await (supabase as any)
        .from("dre_despesas_avulsas")
        .insert({ user_id: userId, mes_referencia: mesReferencia, ...values });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dre-despesas-avulsas"] }),
  });

  const deleteOnetimeExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("dre_despesas_avulsas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dre-despesas-avulsas"] }),
  });

  const addOnetimeRevenue = useMutation({
    mutationFn: async (values: { descricao: string; categoria: string; valor: number }) => {
      const { error } = await (supabase as any)
        .from("dre_receitas_avulsas")
        .insert({ user_id: userId, mes_referencia: mesReferencia, ...values });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dre-receitas-avulsas"] }),
  });

  const deleteOnetimeRevenue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("dre_receitas_avulsas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dre-receitas-avulsas"] }),
  });

  const addAdjustment = useMutation({
    mutationFn: async (values: { descricao: string; categoria: AjusteCategoria; valor: number }) => {
      const { error } = await (supabase as any)
        .from("dre_ajustes_mensais")
        .insert({ user_id: userId, mes_referencia: mesReferencia, ...values });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dre-ajustes"] }),
  });

  const deleteAdjustment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("dre_ajustes_mensais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dre-ajustes"] }),
  });

  return {
    config,
    fixedExpenses,
    onetimeExpenses,
    onetimeRevenues,
    adjustments,
    currentDRE,
    previousDRE,
    dataQualityWarnings,
    isConfigured,
    isLoading,
    upsertConfig,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    addOnetimeExpense,
    deleteOnetimeExpense,
    addOnetimeRevenue,
    deleteOnetimeRevenue,
    addAdjustment,
    deleteAdjustment,
  };
}
