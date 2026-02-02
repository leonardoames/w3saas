import { TrendingUp, DollarSign, ShoppingCart, MousePointerClick, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, parseISO, isWithinInterval, isValid } from "date-fns";
import { DateRange } from "react-day-picker";
import { normalizeDateToISO, parseExcelMetricsFile, parseLooseInt, parseLooseNumber } from "@/lib/metricsImport";
import { PlatformType } from "@/lib/platformConfig";

import { KPICard } from "@/components/dashboard/KPICard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { MetricsTable } from "@/components/dashboard/MetricsTable";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MetricModal } from "@/components/dashboard/MetricModal";
import { ImportCSVCard } from "@/components/dashboard/ImportCSVCard";
import { BulkEntryCard } from "@/components/dashboard/BulkEntryCard";
import { AIImportCard } from "@/components/dashboard/AIImportCard";
import { PlatformBreakdownModal } from "@/components/dashboard/PlatformBreakdownModal";

// --- Funções Auxiliares ---

// Função robusta para ler CSVs (Shopify, Shopee, etc)
const parseShopifyCSV = (text: string): any[] => {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";

  const clean = (val: string) => (val ? val.replace(/^"|"$/g, "").trim() : "");
  // Remove aspas extras e converte para minúsculo para facilitar a busca
  const headers = firstLine.split(delimiter).map((h) => clean(h).toLowerCase());

  // Mapeamento expandido para encontrar as colunas corretas
  const idx = {
    data: headers.findIndex((h) => h === "dia" || h === "day" || h === "date" || h === "data"),
    faturamento: headers.findIndex(
      (h) =>
        h.includes("total de vendas") ||
        h.includes("total sales") ||
        h === "faturamento" ||
        h.includes("gmv") ||
        h.includes("vendas (brl)"),
    ),
    vendas_qty: headers.findIndex(
      (h) => h.includes("pedidos") || h.includes("orders") || h === "vendas" || h.includes("orders placed"),
    ),
    // Mapeamento específico para Shopee (Visitantes) e Shopify (Sessões)
    sessoes: headers.findIndex(
      (h) =>
        h.includes("sessoes") ||
        h.includes("sessions") ||
        h.includes("visitantes") || // Shopee usa "Visitantes"
        h.includes("visits") ||
        h.includes("visitors") ||
        h.includes("page views"),
    ),
    investimento: headers.findIndex(
      (h) => h.includes("investimento") || h.includes("cost") || h.includes("ad spend") || h.includes("amount spent"),
    ),
  };

  return lines
    .slice(1)
    .map((line) => {
      let cols: string[];

      // Lógica de SPLIT mais robusta para CSVs com aspas (ex: "1.234,56")
      if (delimiter === ",") {
        // Divide por vírgula APENAS se não estiver dentro de aspas
        // Isso impede que "186,65" seja quebrado em duas colunas
        cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(clean);
      } else {
        cols = line.split(";").map(clean);
      }

      // Validação: Se não achou a coluna de data, pula a linha
      if (!cols[idx.data]) return null;

      let dateStr = cols[idx.data];

      // FILTRO SHOPEE: Ignorar linhas de resumo ou cabeçalhos repetidos
      // A Shopee coloca uma linha com intervalo "03/01/2026-01/02/2026" logo no início, ou repete "Data"
      if (dateStr.includes("-") && dateStr.length > 10) return null; // Intervalo de datas
      if (dateStr.toLowerCase().includes("data")) return null; // Cabeçalho repetido

      // Normalização da data (DD/MM/YYYY -> YYYY-MM-DD)
      if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = dateStr.split("/");
        dateStr = `${y}-${m}-${d}`;
      }

      // Parser Numérico Melhorado para PT-BR (1.000,00) e EN-US (1,000.00)
      const parseNum = (val: string) => {
        if (!val) return 0;
        let cleanVal = val;

        // Detecção simples: se tem vírgula no final (ex: ,00 ou ,50), assume formato BR
        if (val.includes(",") && !val.includes(".")) {
          // Formato puro BR: 100,50
          cleanVal = val.replace(",", ".");
        } else if (val.includes(".") && val.includes(",")) {
          // Misto (ex: 1.000,00 ou 1,000.00)
          const lastDot = val.lastIndexOf(".");
          const lastComma = val.lastIndexOf(",");

          if (lastComma > lastDot) {
            // Formato BR: 1.000,50 -> Remove pontos, troca vírgula por ponto
            cleanVal = val.replace(/\./g, "").replace(",", ".");
          } else {
            // Formato US: 1,000.50 -> Remove vírgulas
            cleanVal = val.replace(/,/g, "");
          }
        }

        return parseFloat(cleanVal) || 0;
      };

      // Parser específico para inteiros (Sessões/Pedidos/Visitantes)
      const parseIntSafe = (val: string) => {
        if (!val) return 0;
        // Remove tudo que não for número (ex: "1.234" vira "1234")
        const clean = val.replace(/\D/g, "");
        return parseInt(clean) || 0;
      };

      return {
        data: dateStr,
        faturamento: idx.faturamento >= 0 ? parseNum(cols[idx.faturamento]) : 0,
        vendas_quantidade: idx.vendas_qty >= 0 ? parseIntSafe(cols[idx.vendas_qty]) : 0,
        vendas_valor: idx.faturamento >= 0 ? parseNum(cols[idx.faturamento]) : 0,
        // Usa o parser seguro para sessões (mapeado de "Visitantes" na Shopee)
        sessoes: idx.sessoes >= 0 ? parseIntSafe(cols[idx.sessoes]) : 0,
        investimento_trafego: idx.investimento >= 0 ? parseNum(cols[idx.investimento]) : 0,
      };
    })
    .filter(Boolean);
};

// Função para consolidar linhas duplicadas
const consolidateMetrics = (metrics: any[]) => {
  const map = new Map();

  metrics.forEach((m) => {
    const p = (m.platform || "outros").toLowerCase();
    const key = `${m.data}-${p}`;

    if (map.has(key)) {
      const existing = map.get(key);
      existing.faturamento += Number(m.faturamento) || 0;
      existing.sessoes += Number(m.sessoes) || 0;
      existing.investimento_trafego += Number(m.investimento_trafego) || 0;
      existing.vendas_quantidade += Number(m.vendas_quantidade) || 0;
      existing.vendas_valor += Number(m.vendas_valor) || 0;
    } else {
      map.set(key, {
        ...m,
        platform: p,
        faturamento: Number(m.faturamento) || 0,
        sessoes: Number(m.sessoes) || 0,
        investimento_trafego: Number(m.investimento_trafego) || 0,
        vendas_quantidade: Number(m.vendas_quantidade) || 0,
        vendas_valor: Number(m.vendas_valor) || 0,
      });
    }
  });

  return Array.from(map.values());
};

interface MetricData {
  data: string;
  platform: string;
  faturamento: number;
  sessoes: number;
  investimento_trafego: number;
  vendas_quantidade: number;
  vendas_valor: number;
}

interface FormData {
  data: string;
  platform: string;
  faturamento: string;
  sessoes: string;
  investimento_trafego: string;
  vendas_quantidade: string;
  vendas_valor: string;
}

type MetricType = "faturamento" | "roas" | "vendas" | "sessoes";

export default function Dashboard() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const [allMetrics, setAllMetrics] = useState<MetricData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [selectedMetricType, setSelectedMetricType] = useState<MetricType | null>(null);

  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const [bulkRows, setBulkRows] = useState<Omit<FormData, "platform">[]>([
    { data: "", faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" },
  ]);

  const [formData, setFormData] = useState<FormData>({
    data: format(new Date(), "yyyy-MM-dd"),
    platform: "outros",
    faturamento: "",
    sessoes: "",
    investimento_trafego: "",
    vendas_quantidade: "",
    vendas_valor: "",
  });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) loadMetrics();
  }, [user]);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const loadMetrics = useCallback(async () => {
    if (!user) return;

    const last90DaysDate = subDays(new Date(), 90);

    const { data, error } = await supabase
      .from("metrics_diarias")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", format(last90DaysDate, "yyyy-MM-dd"))
      .order("data", { ascending: true });

    if (error) {
      console.error("Erro ao carregar métricas:", error);
      return;
    }

    const normalizedData = (data || []).map((d) => ({
      ...d,
      platform: d.platform || "outros",
      faturamento: Number(d.faturamento) || 0,
      sessoes: Number(d.sessoes) || 0,
      investimento_trafego: Number(d.investimento_trafego) || 0,
      vendas_quantidade: Number(d.vendas_quantidade) || 0,
      vendas_valor: Number(d.vendas_valor) || 0,
    }));

    setAllMetrics(normalizedData);
  }, [user]);

  const handlePeriodChange = (period: string, startDate: Date, endDate: Date) => {
    setSelectedPeriod(period);
    setDateRange({ from: startDate, to: endDate });
  };

  const filteredMetrics = useMemo(() => {
    return allMetrics.filter((m) => {
      if (!m.data) return false;
      const date = parseISO(m.data);
      if (!isValid(date)) return false;
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [allMetrics, dateRange]);

  const aggregatedData = useMemo(() => {
    const grouped: Record<string, MetricData> = {};

    filteredMetrics.forEach((m) => {
      if (!grouped[m.data]) {
        grouped[m.data] = {
          ...m,
          faturamento: 0,
          sessoes: 0,
          investimento_trafego: 0,
          vendas_quantidade: 0,
          vendas_valor: 0,
          platform: "agregado",
        };
      }
      grouped[m.data].faturamento += m.faturamento;
      grouped[m.data].sessoes += m.sessoes;
      grouped[m.data].investimento_trafego += m.investimento_trafego;
      grouped[m.data].vendas_quantidade += m.vendas_quantidade;
      grouped[m.data].vendas_valor += m.vendas_valor;
    });

    return Object.values(grouped).sort((a, b) => a.data.localeCompare(b.data));
  }, [filteredMetrics]);

  const previousPeriodMetrics = useMemo(() => {
    const periodLength = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const prevEnd = subDays(dateRange.from, 1);
    const prevStart = subDays(prevEnd, periodLength);
    return allMetrics.filter((m) => {
      const date = parseISO(m.data);
      if (!isValid(date)) return false;
      return isWithinInterval(date, { start: prevStart, end: prevEnd });
    });
  }, [allMetrics, dateRange]);

  const faturamentoTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.faturamento), 0);
  const investimentoTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.investimento_trafego), 0);
  const vendasTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.vendas_quantidade), 0);
  const sessoesTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.sessoes), 0);

  const roasMedio = useMemo(() => {
    const platformTotals: Record<string, { faturamento: number; investimento: number }> = {};

    filteredMetrics.forEach((m) => {
      const p = m.platform || "outros";
      if (p === "shopify") return;

      if (!platformTotals[p]) platformTotals[p] = { faturamento: 0, investimento: 0 };
      platformTotals[p].faturamento += Number(m.faturamento) || 0;
      platformTotals[p].investimento += Number(m.investimento_trafego) || 0;
    });

    const roasValues = Object.values(platformTotals)
      .filter((t) => t.investimento > 0)
      .map((t) => t.faturamento / t.investimento);

    return roasValues.length > 0 ? roasValues.reduce((sum, r) => sum + r, 0) / roasValues.length : 0;
  }, [filteredMetrics]);

  const ticketMedio = vendasTotal > 0 ? faturamentoTotal / vendasTotal : 0;
  const custoMidiaPorVenda = vendasTotal > 0 ? investimentoTotal / vendasTotal : 0;
  const taxaConversao = sessoesTotal > 0 ? (vendasTotal / sessoesTotal) * 100 : 0;

  const vendasPrevious = previousPeriodMetrics.reduce((sum, m) => sum + Number(m.vendas_quantidade), 0);
  const faturamentoPrevious = previousPeriodMetrics.reduce((sum, m) => sum + Number(m.faturamento), 0);
  const ticketMedioPrevious = vendasPrevious > 0 ? faturamentoPrevious / vendasPrevious : 0;

  const handleKPIClick = (metricType: MetricType) => {
    setSelectedMetricType(metricType);
    setBreakdownModalOpen(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("metrics_diarias").upsert(
        {
          user_id: user.id,
          data: formData.data,
          platform: formData.platform || "outros",
          faturamento: parseFloat(formData.faturamento) || 0,
          sessoes: parseInt(formData.sessoes) || 0,
          investimento_trafego: parseFloat(formData.investimento_trafego) || 0,
          vendas_quantidade: parseInt(formData.vendas_quantidade) || 0,
          vendas_valor: parseFloat(formData.vendas_valor) || 0,
        },
        {
          onConflict: "user_id, data, platform",
        },
      );

      if (error) throw error;

      toast({ title: "Sucesso!", description: "Métricas salvas." });
      setFormData({
        data: format(new Date(), "yyyy-MM-dd"),
        platform: "outros",
        faturamento: "",
        sessoes: "",
        investimento_trafego: "",
        vendas_quantidade: "",
        vendas_valor: "",
      });
      setModalOpen(false);
      await loadMetrics();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (metric: MetricData) => {
    setFormData({
      data: metric.data,
      platform: metric.platform || "outros",
      faturamento: metric.faturamento.toString(),
      sessoes: metric.sessoes.toString(),
      investimento_trafego: metric.investimento_trafego.toString(),
      vendas_quantidade: metric.vendas_quantidade.toString(),
      vendas_valor: metric.vendas_valor.toString(),
    });
    setModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, platform: PlatformType) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const isExcel = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");
    const isCsv = file.name.toLowerCase().endsWith(".csv");

    if (!isExcel && !isCsv) {
      toast({ title: "Arquivo inválido", description: "Envie um CSV ou XLSX.", variant: "destructive" });
      e.target.value = "";
      return;
    }

    try {
      let rows: any[] = [];

      if (isCsv) {
        const text = await file.text();
        rows = parseShopifyCSV(text);
      } else if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        rows = parseExcelMetricsFile(arrayBuffer, file.name);
      }

      if (!rows.length) {
        toast({ title: "Atenção", description: "Não encontrei linhas válidas no arquivo.", variant: "destructive" });
        return;
      }

      const rawPayload = rows.map((r) => ({
        ...r,
        user_id: user.id,
        platform: platform,
      }));

      const consolidatedPayload = consolidateMetrics(rawPayload);

      const { error } = await supabase.from("metrics_diarias").upsert(consolidatedPayload, {
        onConflict: "user_id, data, platform",
      });

      if (error) throw error;

      toast({
        title: "Importação concluída",
        description: `${consolidatedPayload.length} dias processados.`,
      });

      await loadMetrics();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro na importação",
        description: error?.message || "Erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  // Importação IA
  const handleAIUpload = async (file: File, platform: PlatformType) => {
    if (!file || !user) return;

    setProcessingAI(true);
    toast({ title: "IA processando...", description: `Analisando arquivo para ${platform}...` });

    try {
      let fileContent = "";

      if (file.name.toLowerCase().endsWith(".csv")) {
        fileContent = await file.text();
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        fileContent = XLSX.utils.sheet_to_csv(firstSheet);
      }

      const { data, error } = await supabase.functions.invoke("parse-metrics-ai", {
        body: { fileContent, userId: user.id, platform },
      });

      if (error) throw error;

      if (!data?.metrics || data.metrics.length === 0) {
        throw new Error("A IA não conseguiu identificar dados válidos.");
      }

      const rawMetrics = data.metrics
        .map((m: any) => {
          const cleanDate = normalizeDateToISO(m.data) || m.data;

          return {
            user_id: user.id,
            data: cleanDate,
            platform: platform, // Força a plataforma selecionada
            faturamento: typeof m.faturamento === "number" ? m.faturamento : parseLooseNumber(m.faturamento),
            sessoes: typeof m.sessoes === "number" ? m.sessoes : parseLooseInt(m.sessoes),
            investimento_trafego:
              typeof m.investimento_trafego === "number"
                ? m.investimento_trafego
                : parseLooseNumber(m.investimento_trafego),
            vendas_quantidade:
              typeof m.vendas_quantidade === "number" ? m.vendas_quantidade : parseLooseInt(m.vendas_quantidade),
            vendas_valor: typeof m.vendas_valor === "number" ? m.vendas_valor : parseLooseNumber(m.vendas_valor),
          };
        })
        .filter((m: any) => m.data);

      const consolidatedMetrics = consolidateMetrics(rawMetrics);

      const { error: upsertError } = await supabase.from("metrics_diarias").upsert(consolidatedMetrics, {
        onConflict: "user_id, data, platform",
      });

      if (upsertError) throw upsertError;

      toast({
        title: "Sucesso!",
        description: `${consolidatedMetrics.length} registros atualizados em ${platform}.`,
      });

      await loadMetrics();
    } catch (error: any) {
      console.error("AI Import error:", error);
      toast({
        title: "Erro na IA",
        description: error.message || "Falha ao processar arquivo.",
        variant: "destructive",
      });
    } finally {
      setProcessingAI(false);
    }
  };

  const handleBulkSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = bulkRows
        .map((row) => {
          const iso = normalizeDateToISO(row.data);
          if (!iso) return null;
          return {
            user_id: user.id,
            data: iso,
            platform: "outros",
            faturamento: parseLooseNumber(row.faturamento),
            sessoes: parseLooseInt(row.sessoes),
            investimento_trafego: parseLooseNumber(row.investimento_trafego),
            vendas_quantidade: parseLooseInt(row.vendas_quantidade),
            vendas_valor: parseLooseNumber(row.vendas_valor),
          };
        })
        .filter(Boolean) as any[];

      if (!payload.length) {
        toast({ title: "Erro", description: "Verifique as datas inseridas.", variant: "destructive" });
        return;
      }

      await supabase.from("metrics_diarias").upsert(payload, {
        onConflict: "user_id, data, platform",
      });

      toast({ title: "Salvo", description: "Lote processado com sucesso." });
      setBulkRows([
        { data: "", faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" },
      ]);
      await loadMetrics();
    } catch (error: any) {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
          <p className="text-sm text-muted-foreground mt-1">Visão unificada de todas as plataformas</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Faturamento"
            value={faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            subtitle="Total do período selecionado"
            icon={DollarSign}
            onClick={() => handleKPIClick("faturamento")}
          />
          <KPICard
            title="ROAS Médio"
            value={roasMedio.toFixed(2)}
            subtitle="Média das plataformas de tráfego"
            icon={TrendingUp}
            onClick={() => handleKPIClick("roas")}
          />
          <KPICard
            title="Vendas"
            value={vendasTotal.toLocaleString("pt-BR")}
            icon={ShoppingCart}
            onClick={() => handleKPIClick("vendas")}
          />
          <KPICard
            title="Sessões"
            value={sessoesTotal.toLocaleString("pt-BR")}
            icon={MousePointerClick}
            onClick={() => handleKPIClick("sessoes")}
          />
        </div>

        {roasMedio < 2 && roasMedio > 0 && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Atenção: O ROAS médio das suas campanhas está abaixo de 2.</AlertDescription>
          </Alert>
        )}
        {ticketMedio > ticketMedioPrevious && ticketMedioPrevious > 0 && (
          <Alert className="border-success/50 bg-success/5 text-success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Parabéns! Seu ticket médio aumentou em relação ao período anterior.</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">Filtrar período de análise</h2>
          <PeriodFilter
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <MetricCard title="Ticket Médio" value={`R$ ${ticketMedio.toFixed(2)}`} />
          <MetricCard title="Custo por Venda" value={`R$ ${custoMidiaPorVenda.toFixed(2)}`} />
          <MetricCard title="Taxa de Conversão" value={`${taxaConversao.toFixed(2)}%`} />
        </div>

        <Tabs defaultValue="historico" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="historico" className="text-sm">
              Histórico e Gráficos
            </TabsTrigger>
            <TabsTrigger value="importacao" className="text-sm">
              Importar Dados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="historico" className="space-y-8">
            <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm">
              <h3 className="text-sm font-medium text-foreground mb-4">Evolução de Faturamento</h3>
              <RevenueChart data={aggregatedData} />
            </div>

            <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-sm font-medium text-foreground">
                  Detalhamento Diário ({filteredMetrics.length} registros)
                </h3>
                <Button
                  onClick={() => {
                    setFormData({
                      data: format(new Date(), "yyyy-MM-dd"),
                      platform: "outros",
                      faturamento: "",
                      sessoes: "",
                      investimento_trafego: "",
                      vendas_quantidade: "",
                      vendas_valor: "",
                    });
                    setModalOpen(true);
                  }}
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Manualmente
                </Button>
              </div>
              <MetricsTable metrics={filteredMetrics} onEdit={handleEdit} />
            </div>
          </TabsContent>

          <TabsContent value="importacao" className="space-y-6">
            <AIImportCard onUpload={handleAIUpload} processing={processingAI} />
            <ImportCSVCard onUpload={handleFileUpload} />
            <BulkEntryCard rows={bulkRows} onRowsChange={setBulkRows} onSave={handleBulkSave} saving={saving} />
          </TabsContent>
        </Tabs>

        <MetricModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          formData={formData}
          onFormChange={setFormData}
          onSubmit={handleSubmit}
          saving={saving}
        />

        <PlatformBreakdownModal
          open={breakdownModalOpen}
          onOpenChange={setBreakdownModalOpen}
          metricType={selectedMetricType}
          metrics={filteredMetrics}
        />
      </div>
    </div>
  );
}
