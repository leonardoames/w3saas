import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { Settings, ArrowUpRight, ArrowDownRight, Minus, Trophy, TrendingUp, Plug, GitCompare } from "lucide-react";
import PeriodComparisonSection from "@/components/analise-canal/PeriodComparisonSection";
import { format, subDays, parseISO, isWithinInterval, startOfDay, endOfDay, differenceInCalendarDays, startOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { useNavigate } from "react-router-dom";

import shopeeLogo from "@/assets/platforms/shopee.png";
import nuvemshopLogo from "@/assets/platforms/nuvemshop.png";
import mercadoLivreLogo from "@/assets/platforms/mercado-livre.png";
import shopifyLogo from "@/assets/platforms/shopify.png";

const CHANNEL_LOGOS: Record<string, string> = {
  shopee: shopeeLogo,
  mercado_livre: mercadoLivreLogo,
  site: nuvemshopLogo,
};

const CHANNEL_NAMES: Record<string, string> = {
  shopee: "Shopee",
  mercado_livre: "Mercado Livre",
  site: "Site (Nuvemshop / Shopify)",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
};

// Map integration platform to channel_key
const PLATFORM_TO_CHANNEL: Record<string, string> = {
  shopee: "shopee",
  shopee_ads: "shopee", // ads data feeds into shopee channel investment
  mercado_livre: "mercado_livre",
  nuvemshop: "site",
  shopify: "site",
};

// Platforms that are ERPs/not sales channels (excluded)
const EXCLUDED_PLATFORMS = ["olist_tiny", "tray", "loja_integrada", "bagy"];

interface ChannelSetting {
  id: string;
  channel_key: string;
  min_roas: number | null;
}

interface ChannelData {
  channelKey: string;
  name: string;
  logo?: string;
  faturamento: number;
  investimento: number;
  vendas: number;
  hasInvestmentData: boolean;
  prevFaturamento: number;
  prevInvestimento: number;
  prevVendas: number;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatNumber = (v: number) => v.toLocaleString("pt-BR");

export default function AnalisePorCanal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connectedChannels, setConnectedChannels] = useState<string[]>([]);
  const [channelSettings, setChannelSettings] = useState<ChannelSetting[]>([]);
  const [metricsData, setMetricsData] = useState<any[]>([]);

  // Period filter state
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 7)),
    to: endOfDay(new Date()),
  });
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [minRoasInput, setMinRoasInput] = useState("");
  const [saving, setSaving] = useState(false);

  const handlePeriodChange = useCallback((period: string, from: Date, to: Date) => {
    setSelectedPeriod(period);
    setDateRange({ from: startOfDay(from), to: endOfDay(to) });
  }, []);

  // Load integrations & settings
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      const [intRes, settingsRes, metricsRes] = await Promise.all([
        supabase
          .from("user_integrations_safe")
          .select("platform, sync_status")
          .eq("user_id", user.id),
        supabase
          .from("channel_settings" as any)
          .select("*")
          .eq("user_id", user.id),
        supabase
          .from("metrics_diarias")
          .select("*")
          .eq("user_id", user.id)
          .gte("data", format(subDays(new Date(), 180), "yyyy-MM-dd"))
          .order("data", { ascending: true }),
      ]);

      // Determine connected channels
      const integrations = (intRes.data || []) as any[];
      const channelSet = new Set<string>();
      for (const int of integrations) {
        const platform = int.platform as string;
        if (EXCLUDED_PLATFORMS.includes(platform)) continue;
        const ch = PLATFORM_TO_CHANNEL[platform];
        if (ch) channelSet.add(ch);
      }
      setConnectedChannels(Array.from(channelSet));
      setChannelSettings((settingsRes.data || []) as any);
      setMetricsData(metricsRes.data || []);
      setLoading(false);
    };
    load();
  }, [user]);

  // Map platform strings in metrics_diarias to channel keys
  const mapPlatformToChannel = (platform: string | null): string | null => {
    if (!platform) return null;
    const p = platform.toLowerCase();
    if (p === "shopee" || p === "shopee_ads") return "shopee";
    if (p === "mercado_livre") return "mercado_livre";
    if (p === "nuvemshop" || p === "shopify") return "site";
    if (p === "google_ads") return "google_ads";
    if (p === "meta_ads") return "meta_ads";
    return null;
  };

  // Compute channel data for current and previous period
  const channelsData = useMemo(() => {
    const periodDays = differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
    const prevFrom = startOfDay(subDays(dateRange.from, periodDays));
    const prevTo = endOfDay(subDays(dateRange.from, 1));

    const result: ChannelData[] = [];

    for (const ch of connectedChannels) {
      let fat = 0, inv = 0, vendas = 0;
      let prevFat = 0, prevInv = 0, prevVendas = 0;
      let hasInv = false;

      for (const m of metricsData) {
        const dateStr = String(m.data).substring(0, 10);
        const d = parseISO(dateStr);
        const channel = mapPlatformToChannel(m.platform);
        if (channel !== ch) continue;

        if (isWithinInterval(d, { start: dateRange.from, end: dateRange.to })) {
          fat += Number(m.faturamento || 0);
          inv += Number(m.investimento_trafego || 0);
          vendas += Number(m.vendas_quantidade || 0);
          if (Number(m.investimento_trafego || 0) > 0) hasInv = true;
        }
        if (isWithinInterval(d, { start: prevFrom, end: prevTo })) {
          prevFat += Number(m.faturamento || 0);
          prevInv += Number(m.investimento_trafego || 0);
          prevVendas += Number(m.vendas_quantidade || 0);
        }
      }

      result.push({
        channelKey: ch,
        name: CHANNEL_NAMES[ch] || ch,
        logo: CHANNEL_LOGOS[ch],
        faturamento: fat,
        investimento: inv,
        vendas,
        hasInvestmentData: hasInv,
        prevFaturamento: prevFat,
        prevInvestimento: prevInv,
        prevVendas: prevVendas,
      });
    }

    return result.sort((a, b) => b.faturamento - a.faturamento);
  }, [connectedChannels, metricsData, dateRange]);

  const getSettingForChannel = (ch: string) =>
    channelSettings.find((s) => s.channel_key === ch);

  const openSettings = (ch: string) => {
    setEditingChannel(ch);
    const s = getSettingForChannel(ch);
    setMinRoasInput(s?.min_roas != null ? String(s.min_roas) : "");
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    if (!user || !editingChannel) return;
    setSaving(true);
    const minRoas = minRoasInput ? parseFloat(minRoasInput) : null;

    const { error } = await supabase
      .from("channel_settings" as any)
      .upsert(
        {
          user_id: user.id,
          channel_key: editingChannel,
          min_roas: minRoas,
        } as any,
        { onConflict: "user_id,channel_key" }
      );

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      // Refresh settings
      const { data } = await supabase
        .from("channel_settings" as any)
        .select("*")
        .eq("user_id", user.id);
      setChannelSettings((data || []) as any);
      toast({ title: "Configuração salva" });
      setSettingsOpen(false);
    }
    setSaving(false);
  };

  const variationPct = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Empty state
  if (!loading && connectedChannels.length === 0) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Análise por Canal</h1>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Plug className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Conecte suas integrações para ver a análise por canal
            </p>
            <Button onClick={() => navigate("/app/integracoes")} className="gap-2">
              <Plug className="h-4 w-4" />
              Ir para Integrações
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gridCols =
    connectedChannels.length > 3
      ? "lg:grid-cols-3 md:grid-cols-2"
      : "lg:grid-cols-2 md:grid-cols-2";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Análise por Canal</h1>
        <PeriodFilter
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse h-72" />
          ))}
        </div>
      ) : (
        <>
          {/* Channel Cards */}
          <div className={`grid grid-cols-1 ${gridCols} gap-4`}>
            {channelsData.map((ch) => (
              <ChannelCard
                key={ch.channelKey}
                data={ch}
                setting={getSettingForChannel(ch.channelKey)}
                onOpenSettings={() => openSettings(ch.channelKey)}
                variationPct={variationPct}
              />
            ))}
          </div>

          {/* Comparison Table */}
          {channelsData.length > 1 && (
            <ComparisonTable
              channels={channelsData}
              settings={channelSettings}
            />
          )}
        </>
      )}

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configurar {editingChannel ? CHANNEL_NAMES[editingChannel] || editingChannel : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>ROAS Mínimo</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 10"
                    value={minRoasInput}
                    onChange={(e) => setMinRoasInput(e.target.value)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  O ROAS mínimo abaixo do qual você considera o canal não rentável
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Channel Card ─── */
function ChannelCard({
  data,
  setting,
  onOpenSettings,
  variationPct,
}: {
  data: ChannelData;
  setting?: ChannelSetting;
  onOpenSettings: () => void;
  variationPct: (c: number, p: number) => number;
}) {
  const roas = data.investimento > 0 ? data.faturamento / data.investimento : null;
  const minRoas = setting?.min_roas ?? null;
  const ticket = data.vendas > 0 ? data.faturamento / data.vendas : 0;
  const cpa = data.vendas > 0 && data.investimento > 0 ? data.investimento / data.vendas : 0;

  const fatVar = variationPct(data.faturamento, data.prevFaturamento);
  const vendasVar = variationPct(data.vendas, data.prevVendas);

  const roasAboveMin = roas != null && minRoas != null && roas >= minRoas;
  const roasBelowMin = roas != null && minRoas != null && roas < minRoas;

  const statusBadge = () => {
    if (minRoas == null)
      return <Badge variant="secondary" className="text-xs">ROAS não configurado</Badge>;
    if (roasAboveMin)
      return <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30 text-xs">Acima do mínimo</Badge>;
    return <Badge variant="destructive" className="text-xs">Abaixo do mínimo</Badge>;
  };

  const roasColor = () => {
    if (roas == null) return "text-muted-foreground";
    if (minRoas == null) return "text-muted-foreground";
    return roasAboveMin ? "text-primary" : "text-destructive";
  };

  const noData = data.faturamento === 0 && data.vendas === 0 && data.investimento === 0;

  return (
    <Card className="border-[hsla(24,94%,53%,0.12)] rounded-xl overflow-hidden">
      {/* Header */}
      <CardHeader className="flex flex-row items-center gap-3 border-b border-border/30 py-3 px-5">
        {data.logo && (
          <img src={data.logo} alt={data.name} className="h-7 w-7 rounded object-contain" />
        )}
        <span className="font-semibold text-sm flex-1">{data.name}</span>
        {statusBadge()}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
        </button>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {noData ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Sem dados neste período
          </p>
        ) : (
          <>
            {/* Main metrics 2x2 */}
            <div className="grid grid-cols-2 gap-4">
              <MetricCell label="Faturamento" value={formatCurrency(data.faturamento)} />
              <MetricCell
                label="Investimento"
                value={data.hasInvestmentData ? formatCurrency(data.investimento) : "—"}
              />
              <MetricCell label="ROAS" value={roas != null ? roas.toFixed(2) : "—"} valueClass={roasColor()} />
              <MetricCell label="Vendas" value={formatNumber(data.vendas)} />
            </div>

            {/* Secondary metrics */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>TM: {ticket > 0 ? formatCurrency(ticket) : "—"}</span>
              <span>CPA: {cpa > 0 ? formatCurrency(cpa) : "—"}</span>
              <VariationBadge label="Fat" pct={fatVar} />
              <VariationBadge label="Vendas" pct={vendasVar} />
            </div>

            {/* ROAS bar */}
            <RoasBar roas={roas} minRoas={minRoas} />

            {/* Scale insight */}
            {roas != null && minRoas != null && roas > minRoas && (
              <div className="bg-primary/[0.08] border-l-[3px] border-primary rounded-r-md px-3.5 py-2.5 text-xs text-foreground/80">
                Seu ROAS atual ({roas.toFixed(1)}) está {(roas / minRoas).toFixed(1)}× acima do seu mínimo.
                Você pode escalar o investimento com segurança.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCell({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-[22px] font-bold leading-tight ${valueClass || ""}`}>{value}</p>
    </div>
  );
}

function VariationBadge({ label, pct }: { label: string; pct: number }) {
  if (pct === 0) return null;
  const isUp = pct > 0;
  return (
    <span className={`flex items-center gap-0.5 ${isUp ? "text-emerald-400" : "text-destructive"}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {label} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

function RoasBar({ roas, minRoas }: { roas: number | null; minRoas: number | null }) {
  if (minRoas == null) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Configure um ROAS mínimo para ver sua margem de segurança
      </p>
    );
  }

  const maxVal = Math.max(roas || 0, minRoas) * 1.3;
  const roasWidth = roas != null ? Math.min((roas / maxVal) * 100, 100) : 0;
  const minWidth = Math.min((minRoas / maxVal) * 100, 100);
  const isAbove = roas != null && roas >= minRoas;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Mín: {minRoas.toFixed(2)}</span>
        <span>Atual: {roas != null ? roas.toFixed(2) : "—"}</span>
      </div>
      <div className="relative h-2 rounded-full bg-secondary/30 overflow-hidden">
        {/* Min marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-muted-foreground/40 z-10"
          style={{ left: `${minWidth}%` }}
        />
        {/* ROAS bar */}
        <div
          className={`h-full rounded-full transition-all ${isAbove ? "bg-primary" : "bg-destructive"}`}
          style={{ width: `${roasWidth}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Comparison Table ─── */
function ComparisonTable({
  channels,
  settings,
}: {
  channels: ChannelData[];
  settings: ChannelSetting[];
}) {
  const bestRoas = channels.reduce(
    (best, ch) => {
      const r = ch.investimento > 0 ? ch.faturamento / ch.investimento : 0;
      return r > best.val ? { key: ch.channelKey, val: r } : best;
    },
    { key: "", val: 0 }
  );
  const bestFat = channels.reduce(
    (best, ch) => (ch.faturamento > best.val ? { key: ch.channelKey, val: ch.faturamento } : best),
    { key: "", val: 0 }
  );

  const totalFat = channels.reduce((s, c) => s + c.faturamento, 0);
  const totalInv = channels.reduce((s, c) => s + c.investimento, 0);
  const totalVendas = channels.reduce((s, c) => s + c.vendas, 0);
  const totalRoas = totalInv > 0 ? totalFat / totalInv : 0;

  return (
    <Card className="border-[hsla(24,94%,53%,0.12)] rounded-xl overflow-hidden">
      <CardHeader className="py-3 px-5 border-b border-border/30">
        <span className="font-semibold text-sm">Comparativo entre Canais</span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Canal</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Investimento</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">ROAS Mín</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right pr-5">Ticket Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((ch) => {
                const roas = ch.investimento > 0 ? ch.faturamento / ch.investimento : null;
                const setting = settings.find((s) => s.channel_key === ch.channelKey);
                const minRoas = setting?.min_roas ?? null;
                const ticket = ch.vendas > 0 ? ch.faturamento / ch.vendas : 0;
                const above = roas != null && minRoas != null && roas >= minRoas;
                const below = roas != null && minRoas != null && roas < minRoas;

                return (
                  <TableRow key={ch.channelKey}>
                    <TableCell className="pl-5 font-medium flex items-center gap-2">
                      {ch.logo && <img src={ch.logo} className="h-5 w-5 rounded object-contain" />}
                      {ch.name}
                      {ch.channelKey === bestRoas.key && bestRoas.val > 0 && (
                        <Badge className="bg-primary/20 text-primary text-[10px] ml-1">Melhor ROAS</Badge>
                      )}
                      {ch.channelKey === bestFat.key && bestFat.val > 0 && ch.channelKey !== bestRoas.key && (
                        <Badge variant="secondary" className="text-[10px] ml-1">Maior Volume</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(ch.faturamento)}</TableCell>
                    <TableCell className="text-right">
                      {ch.hasInvestmentData ? formatCurrency(ch.investimento) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${above ? "text-primary" : below ? "text-destructive" : ""}`}>
                      {roas != null ? roas.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {minRoas != null ? minRoas.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell>
                      {minRoas == null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : above ? (
                        <span className="text-xs text-emerald-400">OK</span>
                      ) : (
                        <span className="text-xs text-destructive">Baixo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(ch.vendas)}</TableCell>
                    <TableCell className="text-right pr-5">
                      {ticket > 0 ? formatCurrency(ticket) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Totals row */}
              <TableRow className="font-semibold border-t-2 border-border">
                <TableCell className="pl-5">Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totalFat)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalInv)}</TableCell>
                <TableCell className="text-right">{totalRoas > 0 ? totalRoas.toFixed(2) : "—"}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell className="text-right">{formatNumber(totalVendas)}</TableCell>
                <TableCell className="text-right pr-5">
                  {totalVendas > 0 ? formatCurrency(totalFat / totalVendas) : "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
