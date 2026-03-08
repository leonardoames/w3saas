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

export interface DRECalculated {
  faturamentoIntegracoes: number;
  receitasAvulsasTotal: number;
  receitaBruta: number;
  cmvValor: number;
  impostosValor: number;
  taxasValor: number;
  freteValor: number;
  investimentoTrafego: number;
  despesasFixasTotal: number;
  despesasAvulsasTotal: number;
  lucroOperacional: number;
  margemOperacional: number;
}

function calculateDRE(
  faturamentoIntegracoes: number,
  receitasAvulsasTotal: number,
  config: DREConfig | null,
  investimentoTrafego: number,
  despesasFixasTotal: number,
  despesasAvulsasTotal: number
): DRECalculated {
  const receitaBruta = faturamentoIntegracoes + receitasAvulsasTotal;
  const cmvPct = config?.cmv_pct || 0;
  const impostosPct = config?.impostos_pct || 0;
  const taxasPct = config?.taxas_plataforma_pct || 0;
  const fretePct = config?.frete_liquido_pct || 0;

  const cmvValor = (receitaBruta * cmvPct) / 100;
  const impostosValor = (receitaBruta * impostosPct) / 100;
  const taxasValor = (receitaBruta * taxasPct) / 100;
  const freteValor = (receitaBruta * fretePct) / 100;

  const totalDeducoes =
    cmvValor + impostosValor + taxasValor + freteValor + investimentoTrafego + despesasFixasTotal + despesasAvulsasTotal;
  const lucroOperacional = receitaBruta - totalDeducoes;
  const margemOperacional = receitaBruta > 0 ? (lucroOperacional / receitaBruta) * 100 : 0;

  return {
    faturamentoIntegracoes,
    receitasAvulsasTotal,
    receitaBruta,
    cmvValor,
    impostosValor,
    taxasValor,
    freteValor,
    investimentoTrafego,
    despesasFixasTotal,
    despesasAvulsasTotal,
    lucroOperacional,
    margemOperacional,
  };
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
      const { data, error } = await (supabase as any)
        .from("dre_config")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
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

  const integrationRevenueQuery = useQuery({
    queryKey: ["dre-integration-revenue", userId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics_diarias")
        .select("faturamento")
        .eq("user_id", userId!)
        .gte("data", monthStart)
        .lte("data", monthEnd);
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + (Number(r.faturamento) || 0), 0);
    },
    enabled: !!userId,
  });

  const investmentQuery = useQuery({
    queryKey: ["dre-investment", userId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_results")
        .select("investimento")
        .eq("user_id", userId!)
        .gte("data", monthStart)
        .lte("data", monthEnd);
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + (Number(r.investimento) || 0), 0);
    },
    enabled: !!userId,
  });

  // Previous month queries
  const prevIntegrationRevenueQuery = useQuery({
    queryKey: ["dre-integration-revenue", userId, prevMonthStart, prevMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metrics_diarias")
        .select("faturamento")
        .eq("user_id", userId!)
        .gte("data", prevMonthStart)
        .lte("data", prevMonthEnd);
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + (Number(r.faturamento) || 0), 0);
    },
    enabled: !!userId,
  });

  const prevInvestmentQuery = useQuery({
    queryKey: ["dre-investment", userId, prevMonthStart, prevMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_results")
        .select("investimento")
        .eq("user_id", userId!)
        .gte("data", prevMonthStart)
        .lte("data", prevMonthEnd);
      if (error) throw error;
      return (data || []).reduce((sum, r) => sum + (Number(r.investimento) || 0), 0);
    },
    enabled: !!userId,
  });

  const prevOnetimeExpensesQuery = useQuery({
    queryKey: ["dre-despesas-avulsas", userId, prevMesReferencia],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dre_despesas_avulsas")
        .select("valor")
        .eq("user_id", userId)
        .eq("mes_referencia", prevMesReferencia);
      if (error) throw error;
      return (data || []).reduce((sum: number, d: any) => sum + (Number(d.valor) || 0), 0);
    },
    enabled: !!userId,
  });

  const prevOnetimeRevenuesQuery = useQuery({
    queryKey: ["dre-receitas-avulsas-total", userId, prevMesReferencia],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dre_receitas_avulsas")
        .select("valor")
        .eq("user_id", userId)
        .eq("mes_referencia", prevMesReferencia);
      if (error) throw error;
      return (data || []).reduce((sum: number, r: any) => sum + (Number(r.valor) || 0), 0);
    },
    enabled: !!userId,
  });

  const config = configQuery.data || null;
  const fixedExpenses = fixedExpensesQuery.data || [];
  const onetimeExpenses = onetimeExpensesQuery.data || [];
  const onetimeRevenues = onetimeRevenuesQuery.data || [];
  const faturamentoIntegracoes = integrationRevenueQuery.data || 0;
  const investimentoTrafego = investmentQuery.data || 0;

  const despesasFixasTotal = fixedExpenses
    .filter((d) => d.is_active)
    .reduce((sum, d) => sum + Number(d.valor), 0);
  const despesasAvulsasTotal = onetimeExpenses.reduce((sum, d) => sum + Number(d.valor), 0);
  const receitasAvulsasTotal = onetimeRevenues.reduce((sum, r) => sum + Number(r.valor), 0);

  const currentDRE = calculateDRE(
    faturamentoIntegracoes,
    receitasAvulsasTotal,
    config,
    investimentoTrafego,
    despesasFixasTotal,
    despesasAvulsasTotal
  );

  const previousDRE = calculateDRE(
    prevIntegrationRevenueQuery.data || 0,
    prevOnetimeRevenuesQuery.data || 0,
    config,
    prevInvestmentQuery.data || 0,
    despesasFixasTotal,
    prevOnetimeExpensesQuery.data || 0
  );

  const isConfigured = !!config;
  const isLoading =
    configQuery.isLoading ||
    fixedExpensesQuery.isLoading ||
    integrationRevenueQuery.isLoading ||
    investmentQuery.isLoading;

  // Mutations
  const upsertConfig = useMutation({
    mutationFn: async (values: Partial<DREConfig>) => {
      const { data: existing } = await (supabase as any)
        .from("dre_config")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

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

  return {
    config,
    fixedExpenses,
    onetimeExpenses,
    onetimeRevenues,
    currentDRE,
    previousDRE,
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
  };
}
