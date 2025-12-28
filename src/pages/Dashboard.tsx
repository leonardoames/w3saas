import { TrendingUp, DollarSign, ShoppingCart, MousePointerClick, AlertCircle, CheckCircle2, Plus, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, parseISO, isWithinInterval, startOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";

import { KPICard } from "@/components/dashboard/KPICard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { MetricsTable } from "@/components/dashboard/MetricsTable";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { MetricModal } from "@/components/dashboard/MetricModal";

interface MetricData {
  data: string;
  faturamento: number;
  sessoes: number;
  investimento_trafego: number;
  vendas_quantidade: number;
  vendas_valor: number;
}

interface FormData {
  data: string;
  faturamento: string;
  sessoes: string;
  investimento_trafego: string;
  vendas_quantidade: string;
  vendas_valor: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allMetrics, setAllMetrics] = useState<MetricData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  
  const [bulkRows, setBulkRows] = useState<FormData[]>([
    { data: "", faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" }
  ]);
  
  const [formData, setFormData] = useState<FormData>({
    data: format(new Date(), "yyyy-MM-dd"),
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
    setAllMetrics(data || []);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      await supabase.from("metrics_diarias").upsert({
        user_id: user.id,
        data: formData.data,
        faturamento: parseFloat(formData.faturamento) || 0,
        sessoes: parseInt(formData.sessoes) || 0,
        investimento_trafego: parseFloat(formData.investimento_trafego) || 0,
        vendas_quantidade: parseInt(formData.vendas_quantidade) || 0,
        vendas_valor: parseFloat(formData.vendas_valor) || 0,
      }, { onConflict: "user_id,data" });

      toast({ title: "Sucesso!", description: "Métricas salvas." });
      setFormData({ data: format(new Date(), "yyyy-MM-dd"), faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" });
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
      faturamento: metric.faturamento.toString(),
      sessoes: metric.sessoes.toString(),
      investimento_trafego: metric.investimento_trafego.toString(),
      vendas_quantidade: metric.vendas_quantidade.toString(),
      vendas_valor: metric.vendas_valor.toString(),
    });
    setModalOpen(true);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      let updated = 0;
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < 6) continue;
        await supabase.from("metrics_diarias").upsert({
          user_id: user.id,
          data: values[0].trim(),
          faturamento: parseFloat(values[1]) || 0,
          sessoes: parseInt(values[2]) || 0,
          investimento_trafego: parseFloat(values[3]) || 0,
          vendas_quantidade: parseInt(values[4]) || 0,
          vendas_valor: parseFloat(values[5]) || 0,
        }, { onConflict: "user_id,data" });
        updated++;
      }
      toast({ title: "Importação concluída", description: `${updated} dias atualizados.` });
      loadMetrics();
    };
    reader.readAsText(file);
  };

  const handleBulkSave = async () => {
    if (!user) return;
    setSaving(true);
    let saved = 0;
    for (const row of bulkRows) {
      if (!row.data) continue;
      await supabase.from("metrics_diarias").upsert({
        user_id: user.id, data: row.data,
        faturamento: parseFloat(row.faturamento) || 0,
        sessoes: parseInt(row.sessoes) || 0,
        investimento_trafego: parseFloat(row.investimento_trafego) || 0,
        vendas_quantidade: parseInt(row.vendas_quantidade) || 0,
        vendas_valor: parseFloat(row.vendas_valor) || 0,
      }, { onConflict: "user_id,data" });
      saved++;
    }
    toast({ title: "Lote salvo", description: `${saved} dias salvos.` });
    setBulkRows([{ data: "", faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" }]);
    loadMetrics();
    setSaving(false);
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
          <p className="text-sm text-muted-foreground mt-1">Acompanhe seus resultados</p>
        </div>
        
        {/* KPIs - Notion style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Faturamento"
            value={faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            subtitle={`Últimos ${selectedPeriod === "7d" ? "7 dias" : selectedPeriod === "14d" ? "14 dias" : selectedPeriod === "30d" ? "30 dias" : selectedPeriod === "month" ? "mês" : "período"}`}
            icon={DollarSign}
          />
          <KPICard
            title="ROAS"
            value={roas.toFixed(2)}
            icon={TrendingUp}
          />
          <KPICard
            title="Vendas"
            value={vendasTotal.toLocaleString("pt-BR")}
            icon={ShoppingCart}
          />
          <KPICard
            title="Sessões"
            value={sessoesTotal.toLocaleString("pt-BR")}
            icon={MousePointerClick}
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
                    setFormData({ data: format(new Date(), "yyyy-MM-dd"), faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" }); 
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
            {/* CSV Upload */}
            <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm">
              <h3 className="text-sm font-medium text-foreground mb-4">Importar CSV de Métricas</h3>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <FileUp className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <p className="text-sm font-medium text-foreground mb-2">Clique para selecionar arquivo CSV</p>
                  <code className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded block mt-2">
                    data,faturamento,sessoes,investimento,vendas_quantidade,vendas_valor
                  </code>
                </Label>
                <Input 
                  id="csv-upload" 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCSVUpload} 
                  className="hidden" 
                />
              </div>
            </div>

            {/* Bulk Entry */}
            <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-medium text-foreground">Adicionar múltiplos dias manualmente</h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-medium">Data</TableHead>
                      <TableHead className="text-xs font-medium">Faturamento</TableHead>
                      <TableHead className="text-xs font-medium">Sessões</TableHead>
                      <TableHead className="text-xs font-medium">Investimento</TableHead>
                      <TableHead className="text-xs font-medium">Vendas</TableHead>
                      <TableHead className="text-xs font-medium">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input 
                            type="date" 
                            value={row.data} 
                            onChange={(e) => { 
                              const n = [...bulkRows]; 
                              n[i].data = e.target.value; 
                              setBulkRows(n); 
                            }} 
                            className="h-9 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0,00"
                            value={row.faturamento} 
                            onChange={(e) => { 
                              const n = [...bulkRows]; 
                              n[i].faturamento = e.target.value; 
                              setBulkRows(n); 
                            }} 
                            className="h-9 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            placeholder="0"
                            value={row.sessoes} 
                            onChange={(e) => { 
                              const n = [...bulkRows]; 
                              n[i].sessoes = e.target.value; 
                              setBulkRows(n); 
                            }} 
                            className="h-9 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0,00"
                            value={row.investimento_trafego} 
                            onChange={(e) => { 
                              const n = [...bulkRows]; 
                              n[i].investimento_trafego = e.target.value; 
                              setBulkRows(n); 
                            }} 
                            className="h-9 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            placeholder="0"
                            value={row.vendas_quantidade} 
                            onChange={(e) => { 
                              const n = [...bulkRows]; 
                              n[i].vendas_quantidade = e.target.value; 
                              setBulkRows(n); 
                            }} 
                            className="h-9 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0,00"
                            value={row.vendas_valor} 
                            onChange={(e) => { 
                              const n = [...bulkRows]; 
                              n[i].vendas_valor = e.target.value; 
                              setBulkRows(n); 
                            }} 
                            className="h-9 text-sm"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setBulkRows([...bulkRows, { data: "", faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" }])} 
                  variant="outline"
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar linha
                </Button>
                <Button onClick={handleBulkSave} disabled={saving} size="sm">
                  {saving ? "Salvando..." : "Salvar Lote"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal */}
        <MetricModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          formData={formData}
          onFormChange={setFormData}
          onSubmit={handleSubmit}
          saving={saving}
        />
      </div>
    </div>
  );
}
