import { TrendingUp, DollarSign, ShoppingCart, MousePointerClick, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { DateRange } from "react-day-picker";
import { normalizeDateToISO, parseCsvMetricsFile, parseExcelMetricsFile, parseLooseInt, parseLooseNumber } from "@/lib/metricsImport";
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

type MetricType = 'faturamento' | 'roas' | 'vendas' | 'sessoes';

export default function Dashboard() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const [allMetrics, setAllMetrics] = useState<MetricData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Modal de breakdown por plataforma
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [selectedMetricType, setSelectedMetricType] = useState<MetricType | null>(null);
  
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  
  const [bulkRows, setBulkRows] = useState<Omit<FormData, 'platform'>[]>([
    { data: "", faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" }
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
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const loadMetrics = async () => {
    if (!user) return;
    const last60DaysDate = subDays(new Date(), 60);
    const { data } = await supabase
      .from("metrics_diarias")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", format(last60DaysDate, "yyyy-MM-dd"))
      .order("data", { ascending: true });
    
    // Normalizar dados para incluir platform
    const normalizedData = (data || []).map(d => ({
      ...d,
      platform: d.platform || 'outros'
    }));
    
    setAllMetrics(normalizedData);
  };

  const handlePeriodChange = (period: string, startDate: Date, endDate: Date) => {
    setSelectedPeriod(period);
    setDateRange({ from: startDate, to: endDate });
  };

  const filteredMetrics = useMemo(() => {
    return allMetrics.filter(m => {
      const date = parseISO(m.data);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [allMetrics, dateRange]);

  const previousPeriodMetrics = useMemo(() => {
    const periodLength = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const prevEnd = subDays(dateRange.from, 1);
    const prevStart = subDays(prevEnd, periodLength);
    return allMetrics.filter(m => {
      const date = parseISO(m.data);
      return isWithinInterval(date, { start: prevStart, end: prevEnd });
    });
  }, [allMetrics, dateRange]);

  // Calculated KPIs
  const faturamentoTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.faturamento), 0);
  const investimentoTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.investimento_trafego), 0);
  const vendasTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.vendas_quantidade), 0);
  const sessoesTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.sessoes), 0);
  const roas = investimentoTotal > 0 ? faturamentoTotal / investimentoTotal : 0;
  
  // Calculated Metrics
  const ticketMedio = vendasTotal > 0 ? faturamentoTotal / vendasTotal : 0;
  const custoMidiaPorVenda = vendasTotal > 0 ? investimentoTotal / vendasTotal : 0;
  const taxaConversao = sessoesTotal > 0 ? (vendasTotal / sessoesTotal) * 100 : 0;
  
  // Previous period for alerts
  const vendasPrevious = previousPeriodMetrics.reduce((sum, m) => sum + Number(m.vendas_quantidade), 0);
  const faturamentoPrevious = previousPeriodMetrics.reduce((sum, m) => sum + Number(m.faturamento), 0);
  const ticketMedioPrevious = vendasPrevious > 0 ? faturamentoPrevious / vendasPrevious : 0;

  // Handler para clique nos KPIs
  const handleKPIClick = (metricType: MetricType) => {
    setSelectedMetricType(metricType);
    setBreakdownModalOpen(true);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      // Tenta upsert - se falhar por constraint, faz insert normal
      const { error } = await supabase.from("metrics_diarias").upsert({
        user_id: user.id,
        data: formData.data,
        platform: formData.platform || 'outros',
        faturamento: parseFloat(formData.faturamento) || 0,
        sessoes: parseInt(formData.sessoes) || 0,
        investimento_trafego: parseFloat(formData.investimento_trafego) || 0,
        vendas_quantidade: parseInt(formData.vendas_quantidade) || 0,
        vendas_valor: parseFloat(formData.vendas_valor) || 0,
      });

      if (error) throw error;

      toast({ title: "Sucesso!", description: "Métricas salvas." });
      setFormData({ 
        data: format(new Date(), "yyyy-MM-dd"), 
        platform: "outros",
        faturamento: "", 
        sessoes: "", 
        investimento_trafego: "", 
        vendas_quantidade: "", 
        vendas_valor: "" 
      });
      setModalOpen(false);
      loadMetrics();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (metric: MetricData) => {
    setFormData({
      data: metric.data,
      platform: metric.platform || 'outros',
      faturamento: metric.faturamento.toString(),
      sessoes: metric.sessoes.toString(),
      investimento_trafego: metric.investimento_trafego.toString(),
      vendas_quantidade: metric.vendas_quantidade.toString(),
      vendas_valor: metric.vendas_valor.toString(),
    });
    setModalOpen(true);
  };

  // Importação manual CSV/XLSX (mantida como fallback)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        rows = parseExcelMetricsFile(arrayBuffer);
      } else {
        const text = await file.text();
        rows = parseCsvMetricsFile(text);
      }

      if (!rows.length) {
        toast({ title: "Nada para importar", description: "Não encontrei linhas válidas no arquivo.", variant: "destructive" });
        e.target.value = "";
        return;
      }

      await supabase
        .from("metrics_diarias")
        .upsert(
          rows.map((r) => ({ ...r, user_id: user.id, platform: 'outros' })),
        );

      toast({
        title: "Importação concluída",
        description: `${rows.length} dias importados/atualizados.`,
      });

      loadMetrics();
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error?.message || "Não foi possível ler/importar o arquivo.",
        variant: "destructive",
      });
    } finally {
      e.target.value = "";
    }
  };

  // Importação com IA
  const handleAIUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setProcessingAI(true);
    toast({ title: "Analisando arquivo...", description: "A IA está identificando a plataforma e extraindo dados." });

    try {
      // Ler arquivo como texto
      let fileContent = "";
      
      if (file.name.toLowerCase().endsWith(".csv")) {
        fileContent = await file.text();
      } else {
        // Para Excel, converter para CSV-like text
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        fileContent = XLSX.utils.sheet_to_csv(firstSheet);
      }

      // Chamar edge function
      const { data, error } = await supabase.functions.invoke('parse-metrics-ai', {
        body: { fileContent, userId: user.id }
      });

      if (error) throw error;

      if (!data?.metrics || data.metrics.length === 0) {
        throw new Error('A IA não conseguiu extrair métricas do arquivo.');
      }

      // Salvar métricas
      const metricsToSave = data.metrics.map((m: any) => ({
        user_id: user.id,
        data: m.data,
        platform: m.platform || data.detectedPlatform || 'outros',
        faturamento: m.faturamento || 0,
        sessoes: m.sessoes || 0,
        investimento_trafego: m.investimento_trafego || 0,
        vendas_quantidade: m.vendas_quantidade || 0,
        vendas_valor: m.vendas_valor || 0,
      }));

      await supabase.from("metrics_diarias").upsert(metricsToSave);

      toast({ 
        title: "Importação IA concluída!", 
        description: `${data.metrics.length} registros da plataforma "${data.detectedPlatform}" importados.` 
      });
      
      loadMetrics();
    } catch (error: any) {
      console.error('AI Import error:', error);
      toast({ 
        title: "Erro na IA", 
        description: error.message || "Falha ao processar arquivo.", 
        variant: "destructive" 
      });
    } finally {
      setProcessingAI(false);
      e.target.value = "";
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
            platform: 'outros',
            faturamento: parseLooseNumber(row.faturamento),
            sessoes: parseLooseInt(row.sessoes),
            investimento_trafego: parseLooseNumber(row.investimento_trafego),
            vendas_quantidade: parseLooseInt(row.vendas_quantidade),
            vendas_valor: parseLooseNumber(row.vendas_valor),
          };
        })
        .filter(Boolean) as any[];

      if (!payload.length) {
        toast({ title: "Nada para salvar", description: "Preencha uma data válida (ex: 30/01/2026).", variant: "destructive" });
        return;
      }

      await supabase.from("metrics_diarias").upsert(payload);
      toast({ title: "Lote salvo", description: `${payload.length} dias salvos.` });
      setBulkRows([{ data: "", faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" }]);
      loadMetrics();
    } catch (error: any) {
      toast({ title: "Erro", description: error?.message || "Não foi possível salvar o lote.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
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
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão unificada de todas as plataformas</p>
        </div>
        
        {/* KPIs - Clicáveis para drill-down */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Faturamento"
            value={faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            subtitle={`Últimos ${selectedPeriod === "7d" ? "7 dias" : selectedPeriod === "14d" ? "14 dias" : selectedPeriod === "30d" ? "30 dias" : selectedPeriod === "month" ? "mês" : "período"}`}
            icon={DollarSign}
            onClick={() => handleKPIClick('faturamento')}
          />
          <KPICard
            title="ROAS"
            value={roas.toFixed(2)}
            icon={TrendingUp}
            onClick={() => handleKPIClick('roas')}
          />
          <KPICard
            title="Vendas"
            value={vendasTotal.toLocaleString("pt-BR")}
            icon={ShoppingCart}
            onClick={() => handleKPIClick('vendas')}
          />
          <KPICard
            title="Sessões"
            value={sessoesTotal.toLocaleString("pt-BR")}
            icon={MousePointerClick}
            onClick={() => handleKPIClick('sessoes')}
          />
        </div>

        {/* Alerts */}
        {roas < 2 && roas > 0 && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Atenção: ROAS abaixo de 2.</AlertDescription>
          </Alert>
        )}
        {ticketMedio > ticketMedioPrevious && ticketMedioPrevious > 0 && (
          <Alert className="border-success/50 bg-success/5 text-success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Ticket médio aumentou!</AlertDescription>
          </Alert>
        )}

        {/* Period Filters */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-sm font-medium text-muted-foreground">Filtrar período</h2>
          <PeriodFilter
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
          />
        </div>

        {/* Calculated Metrics - Compact */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCard title="Ticket Médio" value={`R$ ${ticketMedio.toFixed(2)}`} />
          <MetricCard title="Custo por Venda" value={`R$ ${custoMidiaPorVenda.toFixed(2)}`} />
          <MetricCard title="Taxa de Conversão" value={`${taxaConversao.toFixed(2)}%`} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="historico" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="historico" className="text-sm">Histórico</TabsTrigger>
            <TabsTrigger value="importacao" className="text-sm">Importação</TabsTrigger>
          </TabsList>
          
          <TabsContent value="historico" className="space-y-8">
            {/* Chart */}
            <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm">
              <h3 className="text-sm font-medium text-foreground mb-4">Faturamento por Dia</h3>
              <RevenueChart data={filteredMetrics} />
            </div>

            {/* History Table */}
            <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-sm font-medium text-foreground">Últimos 60 dias</h3>
                <Button 
                  onClick={() => { 
                    setFormData({ 
                      data: format(new Date(), "yyyy-MM-dd"), 
                      platform: "outros",
                      faturamento: "", 
                      sessoes: "", 
                      investimento_trafego: "", 
                      vendas_quantidade: "", 
                      vendas_valor: "" 
                    }); 
                    setModalOpen(true); 
                  }}
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Dia
                </Button>
              </div>
              <MetricsTable metrics={allMetrics} onEdit={handleEdit} />
            </div>
          </TabsContent>
          
          <TabsContent value="importacao" className="space-y-6">
            {/* AI Import - Principal */}
            <AIImportCard onUpload={handleAIUpload} processing={processingAI} />
            
            {/* Fallback: CSV/XLSX manual */}
            <ImportCSVCard onUpload={handleFileUpload} />
            
            {/* Manual bulk entry */}
            <BulkEntryCard
              rows={bulkRows}
              onRowsChange={setBulkRows}
              onSave={handleBulkSave}
              saving={saving}
            />
          </TabsContent>
        </Tabs>

        {/* Modal de entrada manual */}
        <MetricModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          formData={formData}
          onFormChange={setFormData}
          onSubmit={handleSubmit}
          saving={saving}
        />

        {/* Modal de breakdown por plataforma */}
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
