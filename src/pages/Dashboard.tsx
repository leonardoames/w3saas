import { TrendingUp, DollarSign, ShoppingCart, MousePointerClick, AlertCircle, CheckCircle2, Plus, Camera, Image as ImageIcon, Loader2, Receipt, Wallet, Percent, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, parseISO, isWithinInterval, isValid } from "date-fns";
import { DateRange } from "react-day-picker";
import { normalizeDateToISO, parseExcelMetricsFile, parseLooseInt, parseLooseNumber } from "@/lib/metricsImport";
import { PlatformType, PLATFORMS_LIST } from "@/lib/platformConfig";
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

// --- Funções Auxiliares (Parser CSV) ---
const parseGenericCSV = (text: string): any[] => {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  let headerIndex = -1;
  let delimiter = ",";
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].toLowerCase();
    const currentDelimiter = line.includes(";") ? ";" : ",";
    const hasDate = line.includes("data") || line.includes("date") || line.includes("dia") || line.includes("day");
    const hasMetric = line.includes("vendas") || line.includes("sales") || line.includes("gmv") || line.includes("impressões") || line.includes("visitas") || line.includes("cliques") || line.includes("status");
    if (hasDate && hasMetric) {
      headerIndex = i;
      delimiter = currentDelimiter;
      break;
    }
  }
  if (headerIndex === -1) headerIndex = 0;
  const headerLine = lines[headerIndex];
  const clean = (val: string) => val ? val.replace(/^"|"$/g, "").trim() : "";
  let headers: string[] = [];
  if (delimiter === ",") {
    headers = headerLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => clean(h).toLowerCase());
  } else {
    headers = headerLine.split(";").map(h => clean(h).toLowerCase());
  }
  const idx = {
    data: headers.findIndex(h => h === "dia" || h === "day" || h === "date" || h === "data"),
    faturamento: headers.findIndex(h => h === "gmv" || h.includes("total de vendas") || h.includes("total sales") || h === "faturamento" || h === "receita" || h.includes("vendas (brl)")),
    vendas_qty: headers.findIndex(h => h === "conversões" || h === "conversions" || h.includes("pedidos") || h.includes("orders") || h === "vendas" || h === "itens vendidos"),
    sessoes: headers.findIndex(h => h.includes("visitantes") || h.includes("visitors") || h.includes("sessoes") || h.includes("sessions")),
    cliques: headers.findIndex(h => h === "cliques" || h === "clicks" || h === "clics"),
    investimento: headers.findIndex(h => h === "despesas" || h.includes("investimento") || h.includes("custo") || h.includes("cost") || h.includes("ad spend") || h.includes("amount spent"))
  };
  if (idx.sessoes === -1 && idx.cliques !== -1) idx.sessoes = idx.cliques;
  if (idx.data === -1) return [];
  return lines.slice(headerIndex + 1).map(line => {
    let cols: string[];
    if (delimiter === ",") {
      cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(clean);
    } else {
      cols = line.split(";").map(clean);
    }
    if (!cols[idx.data]) return null;
    let dateStr = cols[idx.data];
    if (dateStr.includes("-") && dateStr.length > 10) return null;
    if (dateStr.toLowerCase().includes("total")) return null;
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [d, m, y] = dateStr.split("/");
      dateStr = `${y}-${m}-${d}`;
    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {} else {
      const parsed = Date.parse(dateStr);
      if (!isNaN(parsed)) dateStr = new Date(parsed).toISOString().split("T")[0];
    }
    const parseNum = (val: string) => {
      if (!val) return 0;
      let cleanVal = val.replace(/[^\d.,-]/g, "");
      if (cleanVal.includes(",") && !cleanVal.includes(".")) {
        cleanVal = cleanVal.replace(",", ".");
      } else if (cleanVal.includes(".") && cleanVal.includes(",")) {
        const lastDot = cleanVal.lastIndexOf(".");
        const lastComma = cleanVal.lastIndexOf(",");
        if (lastComma > lastDot) cleanVal = cleanVal.replace(/\./g, "").replace(",", ".");else cleanVal = cleanVal.replace(/,/g, "");
      }
      return parseFloat(cleanVal) || 0;
    };
    const parseIntSafe = (val: string) => {
      if (!val) return 0;
      const clean = val.replace(/\D/g, "");
      return parseInt(clean) || 0;
    };
    return {
      data: dateStr,
      faturamento: idx.faturamento >= 0 ? parseNum(cols[idx.faturamento]) : 0,
      vendas_quantidade: idx.vendas_qty >= 0 ? parseIntSafe(cols[idx.vendas_qty]) : 0,
      vendas_valor: idx.faturamento >= 0 ? parseNum(cols[idx.faturamento]) : 0,
      sessoes: idx.sessoes >= 0 ? parseIntSafe(cols[idx.sessoes]) : 0,
      investimento_trafego: idx.investimento >= 0 ? parseNum(cols[idx.investimento]) : 0
    };
  }).filter(row => row && row.data && (row.faturamento > 0 || row.sessoes > 0 || row.investimento_trafego > 0));
};

// --- Componente Novo: Screenshot Import Card ---
const ScreenshotImportCard = ({
  onUpload,
  processing
}: {
  onUpload: (file: File, platform: PlatformType) => void;
  processing: boolean;
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>("shopee");
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, selectedPlatform);
    }
  };
  return <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-primary">
          <Camera className="h-5 w-5" />
          Importar Print (IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>De qual plataforma é o print?</Label>
          <Select value={selectedPlatform} onValueChange={v => setSelectedPlatform(v as PlatformType)}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS_LIST.map(p => <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-center">
          <input type="file" accept="image/*" className="hidden" id="screenshot-upload" onChange={handleFileChange} disabled={processing} />
          <label htmlFor="screenshot-upload" className="w-full">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2 border-dashed border-2 hover:bg-primary/10 transition-colors" disabled={processing} asChild>
              <span className="cursor-pointer">
                {processing ? <>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-muted-foreground">Lendo imagem com IA...</span>
                  </> : <>
                    <ImageIcon className="h-8 w-8 text-primary" />
                    <span className="text-muted-foreground">Clique para enviar Print / Foto</span>
                    <span className="text-xs text-muted-foreground/70">Suporta PNG, JPG, WebP</span>
                  </>}
              </span>
            </Button>
          </label>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          A IA tentará ler Faturamento, Gastos, Vendas e Sessões da imagem.
        </p>
      </CardContent>
    </Card>;
};

// --- Funções Auxiliares de Consolidação ---
const consolidateMetrics = (metrics: any[]) => {
  const map = new Map();
  metrics.forEach(m => {
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
        vendas_valor: Number(m.vendas_valor) || 0
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
  const {
    toast
  } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados de Processamento
  const [processingAI, setProcessingAI] = useState(false); // Para CSV
  const [processingScreenshot, setProcessingScreenshot] = useState(false); // Para Imagem

  const [allMetrics, setAllMetrics] = useState<MetricData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);
  const [selectedMetricType, setSelectedMetricType] = useState<MetricType | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [bulkRows, setBulkRows] = useState<Omit<FormData, "platform">[]>([{
    data: "",
    faturamento: "",
    sessoes: "",
    investimento_trafego: "",
    vendas_quantidade: "",
    vendas_valor: ""
  }]);
  const [formData, setFormData] = useState<FormData>({
    data: format(new Date(), "yyyy-MM-dd"),
    platform: "outros",
    faturamento: "",
    sessoes: "",
    investimento_trafego: "",
    vendas_quantidade: "",
    vendas_valor: ""
  });
  useEffect(() => {
    checkUser();
  }, []);
  useEffect(() => {
    if (user) loadMetrics();
  }, [user]);
  const checkUser = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };
  const loadMetrics = useCallback(async () => {
    if (!user) return;
    const last90DaysDate = subDays(new Date(), 90);
    const {
      data,
      error
    } = await supabase.from("metrics_diarias").select("*").eq("user_id", user.id).gte("data", format(last90DaysDate, "yyyy-MM-dd")).order("data", {
      ascending: true
    });
    if (error) {
      console.error("Erro ao carregar métricas:", error);
      return;
    }
    const normalizedData = (data || []).map(d => ({
      ...d,
      platform: d.platform || "outros",
      faturamento: Number(d.faturamento) || 0,
      sessoes: Number(d.sessoes) || 0,
      investimento_trafego: Number(d.investimento_trafego) || 0,
      vendas_quantidade: Number(d.vendas_quantidade) || 0,
      vendas_valor: Number(d.vendas_valor) || 0
    }));
    setAllMetrics(normalizedData);
  }, [user]);
  const handlePeriodChange = (period: string, startDate: Date, endDate: Date) => {
    setSelectedPeriod(period);
    setDateRange({
      from: startDate,
      to: endDate
    });
  };
  const filteredMetrics = useMemo(() => {
    return allMetrics.filter(m => {
      if (!m.data) return false;
      const date = parseISO(m.data);
      if (!isValid(date)) return false;
      return isWithinInterval(date, {
        start: dateRange.from,
        end: dateRange.to
      });
    });
  }, [allMetrics, dateRange]);
  const aggregatedData = useMemo(() => {
    const grouped: Record<string, MetricData> = {};
    filteredMetrics.forEach(m => {
      if (!grouped[m.data]) {
        grouped[m.data] = {
          ...m,
          faturamento: 0,
          sessoes: 0,
          investimento_trafego: 0,
          vendas_quantidade: 0,
          vendas_valor: 0,
          platform: "agregado"
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
    return allMetrics.filter(m => {
      const date = parseISO(m.data);
      if (!isValid(date)) return false;
      return isWithinInterval(date, {
        start: prevStart,
        end: prevEnd
      });
    });
  }, [allMetrics, dateRange]);
  const faturamentoTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.faturamento), 0);
  const investimentoTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.investimento_trafego), 0);
  const vendasTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.vendas_quantidade), 0);
  const sessoesTotal = filteredMetrics.reduce((sum, m) => sum + Number(m.sessoes), 0);
  const roasMedio = useMemo(() => {
    const platformTotals: Record<string, {
      faturamento: number;
      investimento: number;
    }> = {};
    filteredMetrics.forEach(m => {
      const p = m.platform || "outros";
      if (p === "shopify") return;
      if (!platformTotals[p]) platformTotals[p] = {
        faturamento: 0,
        investimento: 0
      };
      platformTotals[p].faturamento += Number(m.faturamento) || 0;
      platformTotals[p].investimento += Number(m.investimento_trafego) || 0;
    });
    const roasValues = Object.values(platformTotals).filter(t => t.investimento > 0).map(t => t.faturamento / t.investimento);
    return roasValues.length > 0 ? roasValues.reduce((sum, r) => sum + r, 0) / roasValues.length : 0;
  }, [filteredMetrics]);
  const ticketMedio = vendasTotal > 0 ? faturamentoTotal / vendasTotal : 0;
  const custoMidiaPorVenda = vendasTotal > 0 ? investimentoTotal / vendasTotal : 0;
  const taxaConversao = sessoesTotal > 0 ? vendasTotal / sessoesTotal * 100 : 0;
  const ticketMedioPrevious = previousPeriodMetrics.reduce((sum, m) => sum + Number(m.faturamento), 0) / (previousPeriodMetrics.reduce((sum, m) => sum + Number(m.vendas_quantidade), 0) || 1);
  const handleKPIClick = (metricType: MetricType) => {
    setSelectedMetricType(metricType);
    setBreakdownModalOpen(true);
  };
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from("metrics_diarias").upsert({
        user_id: user.id,
        data: formData.data,
        platform: formData.platform || "outros",
        faturamento: parseFloat(formData.faturamento) || 0,
        sessoes: parseInt(formData.sessoes) || 0,
        investimento_trafego: parseFloat(formData.investimento_trafego) || 0,
        vendas_quantidade: parseInt(formData.vendas_quantidade) || 0,
        vendas_valor: parseFloat(formData.vendas_valor) || 0
      }, {
        onConflict: "user_id, data, platform"
      });
      if (error) throw error;
      toast({
        title: "Sucesso!",
        description: "Métricas salvas."
      });
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
      await loadMetrics();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
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
      vendas_valor: metric.vendas_valor.toString()
    });
    setModalOpen(true);
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, platform: PlatformType) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const isExcel = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    if (!isExcel && !isCsv) {
      toast({
        title: "Arquivo inválido",
        description: "Envie um CSV ou XLSX.",
        variant: "destructive"
      });
      e.target.value = "";
      return;
    }
    try {
      let rows: any[] = [];
      if (isCsv) {
        const text = await file.text();
        rows = parseGenericCSV(text);
      } else if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        rows = parseExcelMetricsFile(arrayBuffer, file.name);
      }
      if (!rows.length) {
        toast({
          title: "Atenção",
          description: "Não encontrei linhas válidas. Verifique se o arquivo possui colunas de Data e Métricas.",
          variant: "destructive"
        });
        return;
      }
      const rawPayload = rows.map(r => ({
        ...r,
        user_id: user.id,
        platform: platform
      }));
      const consolidatedPayload = consolidateMetrics(rawPayload);
      const {
        error
      } = await supabase.from("metrics_diarias").upsert(consolidatedPayload, {
        onConflict: "user_id, data, platform"
      });
      if (error) throw error;
      toast({
        title: "Importação concluída",
        description: `${consolidatedPayload.length} dias processados com sucesso.`
      });
      await loadMetrics();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro na importação",
        description: error?.message || "Erro desconhecido.",
        variant: "destructive"
      });
    } finally {
      e.target.value = "";
    }
  };

  // Importação CSV via IA
  const handleAIUpload = async (file: File, platform: PlatformType) => {
    if (!file || !user) return;
    setProcessingAI(true);
    toast({
      title: "IA processando CSV...",
      description: `Analisando arquivo para ${platform}...`
    });
    try {
      let fileContent = "";
      if (file.name.toLowerCase().endsWith(".csv")) {
        fileContent = await file.text();
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(arrayBuffer, {
          type: "array"
        });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        fileContent = XLSX.utils.sheet_to_csv(firstSheet);
      }
      const {
        data,
        error
      } = await supabase.functions.invoke("parse-metrics-ai", {
        body: {
          fileContent,
          userId: user.id,
          platform
        }
      });
      if (error) throw error;
      if (!data?.metrics || data.metrics.length === 0) {
        throw new Error("A IA não conseguiu identificar dados válidos.");
      }
      const rawMetrics = data.metrics.map((m: any) => ({
        user_id: user.id,
        data: normalizeDateToISO(m.data) || m.data,
        platform: platform,
        faturamento: parseLooseNumber(m.faturamento),
        sessoes: parseLooseInt(m.sessoes),
        investimento_trafego: parseLooseNumber(m.investimento_trafego),
        vendas_quantidade: parseLooseInt(m.vendas_quantidade),
        vendas_valor: parseLooseNumber(m.vendas_valor)
      })).filter((m: any) => m.data);
      const consolidatedMetrics = consolidateMetrics(rawMetrics);
      const {
        error: upsertError
      } = await supabase.from("metrics_diarias").upsert(consolidatedMetrics, {
        onConflict: "user_id, data, platform"
      });
      if (upsertError) throw upsertError;
      toast({
        title: "Sucesso!",
        description: `${consolidatedMetrics.length} registros atualizados.`
      });
      await loadMetrics();
    } catch (error: any) {
      toast({
        title: "Erro na IA",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessingAI(false);
    }
  };

  // --- NOVA FUNÇÃO: Upload de Print/Screenshot ---
  const handleScreenshotUpload = async (file: File, platform: PlatformType) => {
    if (!file || !user) return;
    setProcessingScreenshot(true);
    toast({
      title: "Lendo imagem...",
      description: "Isso pode levar alguns segundos."
    });
    try {
      // 1. Converter imagem para Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const base64Image = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      // 2. Chamar a Edge Function "scan-screenshot"
      const {
        data,
        error
      } = await supabase.functions.invoke("scan-screenshot", {
        body: {
          image: base64Image,
          platform,
          userId: user.id
        }
      });
      if (error) throw error;
      if (!data?.metrics || data.metrics.length === 0) {
        throw new Error("A IA não encontrou dados na imagem.");
      }

      // 3. Processar e salvar
      const rawMetrics = data.metrics.map((m: any) => ({
        user_id: user.id,
        data: normalizeDateToISO(m.data) || m.data,
        platform: platform,
        faturamento: Number(m.faturamento) || 0,
        sessoes: Number(m.sessoes) || 0,
        investimento_trafego: Number(m.investimento_trafego) || 0,
        vendas_quantidade: Number(m.vendas_quantidade) || 0,
        vendas_valor: Number(m.faturamento) || 0 // Assume GMV como Vendas Valor
      })).filter((m: any) => m.data);
      const consolidatedMetrics = consolidateMetrics(rawMetrics);
      const {
        error: upsertError
      } = await supabase.from("metrics_diarias").upsert(consolidatedMetrics, {
        onConflict: "user_id, data, platform"
      });
      if (upsertError) throw upsertError;
      toast({
        title: "Print Processado!",
        description: `${consolidatedMetrics.length} dados extraídos.`
      });
      await loadMetrics();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro no Print",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessingScreenshot(false);
    }
  };
  const handleBulkSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = bulkRows.map(row => {
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
          vendas_valor: parseLooseNumber(row.vendas_valor)
        };
      }).filter(Boolean) as any[];
      if (!payload.length) {
        toast({
          title: "Erro",
          description: "Verifique as datas inseridas.",
          variant: "destructive"
        });
        return;
      }
      await supabase.from("metrics_diarias").upsert(payload, {
        onConflict: "user_id, data, platform"
      });
      toast({
        title: "Salvo",
        description: "Lote processado com sucesso."
      });
      setBulkRows([{
        data: "",
        faturamento: "",
        sessoes: "",
        investimento_trafego: "",
        vendas_quantidade: "",
        vendas_valor: ""
      }]);
      await loadMetrics();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground animate-pulse">Carregando seus dados...</p>
      </div>;
  }
  if (!user) {
    return <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Você precisa estar logado.</AlertDescription>
      </Alert>;
  }
  return <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8">
        {/* --- TAG DE AVISO SHOPEE --- */}
        <Alert className="border-blue-200 shadow-sm items-center justify-center flex flex-row text-secondary-foreground bg-primary">
          <Code className="h-4 w-4 text-primary mx-[240px]" />
          <AlertDescription className="ml-2 font-medium">Conexão do Dashboard com a Shopee em Desenvolvimento </AlertDescription>
        </Alert>

        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão unificada de todas as plataformas</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Faturamento" value={faturamentoTotal.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })} subtitle="Total do período selecionado" icon={DollarSign} onClick={() => handleKPIClick("faturamento")} />
          <KPICard title="ROAS Médio" value={roasMedio.toFixed(2)} subtitle="Média das plataformas de tráfego" icon={TrendingUp} onClick={() => handleKPIClick("roas")} />
          <KPICard title="Vendas" value={vendasTotal.toLocaleString("pt-BR")} icon={ShoppingCart} onClick={() => handleKPIClick("vendas")} />
          <KPICard title="Sessões" value={sessoesTotal.toLocaleString("pt-BR")} icon={MousePointerClick} onClick={() => handleKPIClick("sessoes")} />
        </div>

        {roasMedio < 2 && roasMedio > 0 && <Alert variant="destructive" className="border-destructive/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Atenção: O ROAS médio das suas campanhas está abaixo de 2.</AlertDescription>
          </Alert>}
        {ticketMedio > ticketMedioPrevious && ticketMedioPrevious > 0 && <Alert className="border-success/50 bg-success/5 text-success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>Parabéns! Seu ticket médio aumentou em relação ao período anterior.</AlertDescription>
          </Alert>}

        {/* Layout reorganizado: Gráfico à esquerda, Métricas + Filtros à direita */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico - ocupa 2/3 da largura no desktop */}
          <div className="lg:col-span-2 bg-card border border-border/50 rounded-lg p-5 md:p-6 shadow-sm">
            <h3 className="text-sm font-medium text-foreground mb-4">Evolução de Faturamento</h3>
            <RevenueChart data={aggregatedData} />
          </div>

          {/* Coluna lateral - Filtros + Métricas secundárias */}
          <div className="space-y-4">
            {/* Filtros de período */}
            <div className="bg-card border border-border/50 rounded-lg p-4 shadow-sm">
              <h3 className="text-xs font-medium text-muted-foreground/70 mb-3">Período de análise</h3>
              <PeriodFilter selectedPeriod={selectedPeriod} onPeriodChange={handlePeriodChange} customRange={customRange} onCustomRangeChange={setCustomRange} />
            </div>

            {/* Métricas secundárias empilhadas */}
            <div className="grid grid-cols-1 gap-4">
              <MetricCard title="Ticket Médio" value={`R$ ${ticketMedio.toFixed(2)}`} icon={Receipt} />
              <MetricCard title="Custo por Venda" value={`R$ ${custoMidiaPorVenda.toFixed(2)}`} icon={Wallet} />
              <MetricCard title="Taxa de Conversão" value={`${taxaConversao.toFixed(2)}%`} icon={Percent} />
            </div>
          </div>
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
            <div className="bg-card border border-border/50 rounded-lg p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-sm font-medium text-foreground">
                  Detalhamento Diário ({filteredMetrics.length} registros)
                </h3>
                <Button onClick={() => {
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
              }} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Manualmente
                </Button>
              </div>
              <MetricsTable metrics={filteredMetrics} onEdit={handleEdit} />
            </div>
          </TabsContent>

          <TabsContent value="importacao" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Novo Card de Screenshot */}
              <ScreenshotImportCard onUpload={handleScreenshotUpload} processing={processingScreenshot} />
              <AIImportCard onUpload={handleAIUpload} processing={processingAI} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <ImportCSVCard onUpload={handleFileUpload} />
              <BulkEntryCard rows={bulkRows} onRowsChange={setBulkRows} onSave={handleBulkSave} saving={saving} />
            </div>
          </TabsContent>
        </Tabs>

        <MetricModal open={modalOpen} onOpenChange={setModalOpen} formData={formData} onFormChange={setFormData} onSubmit={handleSubmit} saving={saving} />

        <PlatformBreakdownModal open={breakdownModalOpen} onOpenChange={setBreakdownModalOpen} metricType={selectedMetricType} metrics={filteredMetrics} />
      </div>
    </div>;
}