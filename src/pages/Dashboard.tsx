import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, ShoppingCart, MousePointerClick, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    const previous14DaysDate = subDays(today, 14);

    // Últimos 7 dias
    const { data: last7, error: error7 } = await supabase
      .from("metrics_diarias")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", format(last7DaysDate, "yyyy-MM-dd"))
      .order("data", { ascending: true });

    if (!error7) setMetricsLast7Days(last7 || []);

    // Últimos 30 dias para o gráfico
    const { data: last30, error: error30 } = await supabase
      .from("metrics_diarias")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", format(last30DaysDate, "yyyy-MM-dd"))
      .order("data", { ascending: true });

    if (!error30) setMetricsLast30Days(last30 || []);

    // 7 dias anteriores (para comparação)
    const { data: prev7, error: errorPrev } = await supabase
      .from("metrics_diarias")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", format(previous14DaysDate, "yyyy-MM-dd"))
      .lt("data", format(last7DaysDate, "yyyy-MM-dd"))
      .order("data", { ascending: true });

    if (!errorPrev) setMetricsPrevious7Days(prev7 || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const dataToSave = {
        user_id: user.id,
        data: formData.data,
        faturamento: parseFloat(formData.faturamento) || 0,
        sessoes: parseInt(formData.sessoes) || 0,
        investimento_trafego: parseFloat(formData.investimento_trafego) || 0,
        vendas_quantidade: parseInt(formData.vendas_quantidade) || 0,
        vendas_valor: parseFloat(formData.vendas_valor) || 0,
      };

      const { error } = await supabase
        .from("metrics_diarias")
        .upsert(dataToSave, { onConflict: "user_id,data" });

      if (error) throw error;

      toast({
        title: "Dados salvos!",
        description: "As métricas foram atualizadas com sucesso.",
      });

      // Limpar formulário
      setFormData({
        data: format(new Date(), "yyyy-MM-dd"),
        faturamento: "",
        sessoes: "",
        investimento_trafego: "",
        vendas_quantidade: "",
        vendas_valor: "",
      });

      // Recarregar métricas
      loadMetrics();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Cálculos de KPIs
  const faturamentoTotal = metricsLast7Days.reduce((sum, m) => sum + Number(m.faturamento), 0);
  const investimentoTotal = metricsLast7Days.reduce((sum, m) => sum + Number(m.investimento_trafego), 0);
  const vendasTotal = metricsLast7Days.reduce((sum, m) => sum + Number(m.vendas_quantidade), 0);
  const sessoesTotal = metricsLast7Days.reduce((sum, m) => sum + Number(m.sessoes), 0);
  
  const roas = investimentoTotal > 0 ? faturamentoTotal / investimentoTotal : 0;
  const ticketMedio = vendasTotal > 0 ? faturamentoTotal / vendasTotal : 0;
  const custoMidiaPorVenda = vendasTotal > 0 ? investimentoTotal / vendasTotal : 0;

  // Cálculos período anterior para comparação
  const faturamentoPrevious = metricsPrevious7Days.reduce((sum, m) => sum + Number(m.faturamento), 0);
  const vendasPrevious = metricsPrevious7Days.reduce((sum, m) => sum + Number(m.vendas_quantidade), 0);
  const ticketMedioPrevious = vendasPrevious > 0 ? faturamentoPrevious / vendasPrevious : 0;
  
  const percentChange = faturamentoPrevious > 0 
    ? ((faturamentoTotal - faturamentoPrevious) / faturamentoPrevious) * 100 
    : 0;

  // Dados para o gráfico
  const chartData = metricsLast30Days.map(m => ({
    data: format(parseISO(m.data), "dd/MM", { locale: ptBR }),
    faturamento: Number(m.faturamento),
  }));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você precisa estar logado para acessar o Dashboard. Por favor, faça login para continuar.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard de Resultados</h1>
        <p className="mt-2 text-muted-foreground">
          Acompanhe as principais métricas do seu e-commerce
        </p>
      </div>

      {/* KPIs Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-xs text-muted-foreground">
              {percentChange >= 0 ? "+" : ""}{percentChange.toFixed(1)}% em relação à semana passada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROAS</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roas.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Retorno sobre investimento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendasTotal}</div>
            <p className="text-xs text-muted-foreground">Total de pedidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessoesTotal}</div>
            <p className="text-xs text-muted-foreground">Visitantes no site</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {roas < 2 && roas > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Atenção: seu ROAS dos últimos 7 dias está abaixo de 2. Reveja suas campanhas e margens.
          </AlertDescription>
        </Alert>
      )}

      {ticketMedio > ticketMedioPrevious && ticketMedioPrevious > 0 && (
        <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription>
            Bom sinal: seu ticket médio aumentou em relação à semana anterior 
            (de {ticketMedioPrevious.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} 
            para {ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).
          </AlertDescription>
        </Alert>
      )}

      {/* Área para inserir dados */}
      <Card>
        <CardHeader>
          <CardTitle>Inserir Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faturamento">Faturamento (R$)</Label>
                <Input
                  id="faturamento"
                  type="number"
                  step="0.01"
                  value={formData.faturamento}
                  onChange={(e) => setFormData({ ...formData, faturamento: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessoes">Sessões no site</Label>
                <Input
                  id="sessoes"
                  type="number"
                  value={formData.sessoes}
                  onChange={(e) => setFormData({ ...formData, sessoes: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="investimento_trafego">Investimento em tráfego (R$)</Label>
                <Input
                  id="investimento_trafego"
                  type="number"
                  step="0.01"
                  value={formData.investimento_trafego}
                  onChange={(e) => setFormData({ ...formData, investimento_trafego: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendas_quantidade">Número de vendas</Label>
                <Input
                  id="vendas_quantidade"
                  type="number"
                  value={formData.vendas_quantidade}
                  onChange={(e) => setFormData({ ...formData, vendas_quantidade: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendas_valor">Valor total das vendas (R$)</Label>
                <Input
                  id="vendas_valor"
                  type="number"
                  step="0.01"
                  value={formData.vendas_valor}
                  onChange={(e) => setFormData({ ...formData, vendas_valor: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar Dados"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Métricas calculadas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo de Mídia por Venda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {custoMidiaPorVenda.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessoesTotal > 0 ? ((vendasTotal / sessoesTotal) * 100).toFixed(2) : "0.00"}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle>Faturamento por Dia (Últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => 
                    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                  }
                />
                <Line 
                  type="monotone" 
                  dataKey="faturamento" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Nenhum dado disponível. Insira suas métricas diárias acima para ver o gráfico.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
