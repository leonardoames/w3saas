import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, ShoppingCart, MousePointerClick, AlertCircle, CheckCircle2, Plus, Pencil, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [metricsLast7Days, setMetricsLast7Days] = useState<MetricData[]>([]);
  const [metricsLast30Days, setMetricsLast30Days] = useState<MetricData[]>([]);
  const [metricsPrevious7Days, setMetricsPrevious7Days] = useState<MetricData[]>([]);
  const [metricsLast60Days, setMetricsLast60Days] = useState<MetricData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<MetricData | null>(null);
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
    if (user) {
      loadMetrics();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };

  const loadMetrics = async () => {
    if (!user) return;

    const today = new Date();
    const last7DaysDate = subDays(today, 7);
    const last30DaysDate = subDays(today, 30);
    const last60DaysDate = subDays(today, 60);
    const previous14DaysDate = subDays(today, 14);

    const { data: last7 } = await supabase.from("metrics_diarias").select("*").eq("user_id", user.id).gte("data", format(last7DaysDate, "yyyy-MM-dd")).order("data", { ascending: true });
    const { data: last30 } = await supabase.from("metrics_diarias").select("*").eq("user_id", user.id).gte("data", format(last30DaysDate, "yyyy-MM-dd")).order("data", { ascending: true });
    const { data: last60 } = await supabase.from("metrics_diarias").select("*").eq("user_id", user.id).gte("data", format(last60DaysDate, "yyyy-MM-dd")).order("data", { ascending: false });
    const { data: prev7 } = await supabase.from("metrics_diarias").select("*").eq("user_id", user.id).gte("data", format(previous14DaysDate, "yyyy-MM-dd")).lt("data", format(last7DaysDate, "yyyy-MM-dd")).order("data", { ascending: true });

    setMetricsLast7Days(last7 || []);
    setMetricsLast30Days(last30 || []);
    setMetricsLast60Days(last60 || []);
    setMetricsPrevious7Days(prev7 || []);
  };

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

  const faturamentoTotal = metricsLast7Days.reduce((sum, m) => sum + Number(m.faturamento), 0);
  const investimentoTotal = metricsLast7Days.reduce((sum, m) => sum + Number(m.investimento_trafego), 0);
  const vendasTotal = metricsLast7Days.reduce((sum, m) => sum + Number(m.vendas_quantidade), 0);
  const sessoesTotal = metricsLast7Days.reduce((sum, m) => sum + Number(m.sessoes), 0);
  const roas = investimentoTotal > 0 ? faturamentoTotal / investimentoTotal : 0;
  const ticketMedio = vendasTotal > 0 ? faturamentoTotal / vendasTotal : 0;
  const custoMidiaPorVenda = vendasTotal > 0 ? investimentoTotal / vendasTotal : 0;
  const taxaConversao = sessoesTotal > 0 ? (vendasTotal / sessoesTotal) * 100 : 0;
  const vendasPrevious = metricsPrevious7Days.reduce((sum, m) => sum + Number(m.vendas_quantidade), 0);
  const faturamentoPrevious = metricsPrevious7Days.reduce((sum, m) => sum + Number(m.faturamento), 0);
  const ticketMedioPrevious = vendasPrevious > 0 ? faturamentoPrevious / vendasPrevious : 0;

  const chartData = metricsLast30Days.map(m => ({
    data: format(parseISO(m.data), "dd/MM", { locale: ptBR }),
    faturamento: Number(m.faturamento),
  }));

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!user) return <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Você precisa estar logado.</AlertDescription></Alert>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div><h1 className="text-4xl font-bold">Dashboard</h1><p className="text-muted-foreground">Acompanhe seus resultados</p></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Faturamento</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div><p className="text-xs text-muted-foreground">Últimos 7 dias</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">ROAS</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{roas.toFixed(2)}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Vendas</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{vendasTotal}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Sessões</CardTitle><MousePointerClick className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{sessoesTotal}</div></CardContent></Card>
        </div>

        {roas < 2 && roas > 0 && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Atenção: ROAS abaixo de 2.</AlertDescription></Alert>}
        {ticketMedio > ticketMedioPrevious && ticketMedioPrevious > 0 && <Alert className="border-green-500 bg-green-50 text-green-900"><CheckCircle2 className="h-4 w-4 text-green-600" /><AlertDescription>Ticket médio aumentou!</AlertDescription></Alert>}

        <Tabs defaultValue="historico">
          <TabsList className="grid w-full max-w-md grid-cols-2"><TabsTrigger value="historico">Histórico</TabsTrigger><TabsTrigger value="importacao">Importação</TabsTrigger></TabsList>
          
          <TabsContent value="historico" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Últimos 60 dias</CardTitle>
                <Dialog open={modalOpen} onOpenChange={setModalOpen}><DialogTrigger asChild><Button onClick={() => { setFormData({ data: format(new Date(), "yyyy-MM-dd"), faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" }); setModalOpen(true); }}><Plus className="mr-2 h-4 w-4" />Adicionar Dia</Button></DialogTrigger>
                  <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Dados do Dia</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Data</Label><Input type="date" value={formData.data} onChange={(e) => setFormData({ ...formData, data: e.target.value })} required /></div>
                        <div><Label>Faturamento</Label><Input type="number" step="0.01" value={formData.faturamento} onChange={(e) => setFormData({ ...formData, faturamento: e.target.value })} required /></div>
                        <div><Label>Sessões</Label><Input type="number" value={formData.sessoes} onChange={(e) => setFormData({ ...formData, sessoes: e.target.value })} required /></div>
                        <div><Label>Investimento</Label><Input type="number" step="0.01" value={formData.investimento_trafego} onChange={(e) => setFormData({ ...formData, investimento_trafego: e.target.value })} required /></div>
                        <div><Label>Nº vendas</Label><Input type="number" value={formData.vendas_quantidade} onChange={(e) => setFormData({ ...formData, vendas_quantidade: e.target.value })} required /></div>
                        <div><Label>Valor vendas</Label><Input type="number" step="0.01" value={formData.vendas_valor} onChange={(e) => setFormData({ ...formData, vendas_valor: e.target.value })} required /></div>
                      </div>
                      <Button type="submit" disabled={saving} className="w-full">{saving ? "Salvando..." : "Salvar"}</Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Faturamento</TableHead><TableHead>Sessões</TableHead><TableHead>Investimento</TableHead><TableHead>Vendas</TableHead><TableHead>ROAS</TableHead><TableHead>Ticket</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                  <TableBody>{metricsLast60Days.map((m) => <TableRow key={m.data}><TableCell>{format(parseISO(m.data), "dd/MM/yyyy")}</TableCell><TableCell>R$ {m.faturamento.toFixed(2)}</TableCell><TableCell>{m.sessoes}</TableCell><TableCell>R$ {m.investimento_trafego.toFixed(2)}</TableCell><TableCell>{m.vendas_quantidade}</TableCell><TableCell>{(m.investimento_trafego > 0 ? m.faturamento / m.investimento_trafego : 0).toFixed(2)}</TableCell><TableCell>R$ {(m.vendas_quantidade > 0 ? m.faturamento / m.vendas_quantidade : 0).toFixed(2)}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={() => handleEdit(m)}><Pencil className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card><CardHeader><CardTitle>Métricas Calculadas</CardTitle></CardHeader><CardContent><div className="grid md:grid-cols-3 gap-6"><div><p className="text-sm text-muted-foreground">Ticket Médio</p><p className="text-2xl font-bold">R$ {ticketMedio.toFixed(2)}</p></div><div><p className="text-sm text-muted-foreground">Custo/Venda</p><p className="text-2xl font-bold">R$ {custoMidiaPorVenda.toFixed(2)}</p></div><div><p className="text-sm text-muted-foreground">Conversão</p><p className="text-2xl font-bold">{taxaConversao.toFixed(2)}%</p></div></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Faturamento (30 dias)</CardTitle></CardHeader><CardContent>{chartData.length > 0 ? <ResponsiveContainer width="100%" height={300}><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="data" /><YAxis /><Tooltip /><Line type="monotone" dataKey="faturamento" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart></ResponsiveContainer> : <p className="text-center py-8">Sem dados</p>}</CardContent></Card>
          </TabsContent>
          
          <TabsContent value="importacao" className="space-y-6">
            <Card><CardHeader><CardTitle>Importar CSV</CardTitle></CardHeader><CardContent><div className="border-2 border-dashed rounded-lg p-6 text-center"><FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" /><Label htmlFor="csv-upload" className="cursor-pointer"><p className="text-sm font-medium">Selecionar CSV</p><code className="text-xs bg-muted px-2 py-1 rounded block mt-2">data,faturamento,sessoes,investimento,vendas_quantidade,vendas_valor</code></Label><Input id="csv-upload" type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" /></div></CardContent></Card>
            <Card><CardHeader><CardTitle>Adicionar múltiplos dias</CardTitle></CardHeader><CardContent className="space-y-4"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Faturamento</TableHead><TableHead>Sessões</TableHead><TableHead>Investimento</TableHead><TableHead>Vendas</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader><TableBody>{bulkRows.map((row, i) => <TableRow key={i}><TableCell><Input type="date" value={row.data} onChange={(e) => { const n = [...bulkRows]; n[i].data = e.target.value; setBulkRows(n); }} /></TableCell><TableCell><Input type="number" step="0.01" value={row.faturamento} onChange={(e) => { const n = [...bulkRows]; n[i].faturamento = e.target.value; setBulkRows(n); }} /></TableCell><TableCell><Input type="number" value={row.sessoes} onChange={(e) => { const n = [...bulkRows]; n[i].sessoes = e.target.value; setBulkRows(n); }} /></TableCell><TableCell><Input type="number" step="0.01" value={row.investimento_trafego} onChange={(e) => { const n = [...bulkRows]; n[i].investimento_trafego = e.target.value; setBulkRows(n); }} /></TableCell><TableCell><Input type="number" value={row.vendas_quantidade} onChange={(e) => { const n = [...bulkRows]; n[i].vendas_quantidade = e.target.value; setBulkRows(n); }} /></TableCell><TableCell><Input type="number" step="0.01" value={row.vendas_valor} onChange={(e) => { const n = [...bulkRows]; n[i].vendas_valor = e.target.value; setBulkRows(n); }} /></TableCell></TableRow>)}</TableBody></Table><div className="flex gap-2"><Button onClick={() => setBulkRows([...bulkRows, { data: "", faturamento: "", sessoes: "", investimento_trafego: "", vendas_quantidade: "", vendas_valor: "" }])} variant="outline"><Plus className="mr-2 h-4 w-4" />Adicionar linha</Button><Button onClick={handleBulkSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Lote"}</Button></div></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}