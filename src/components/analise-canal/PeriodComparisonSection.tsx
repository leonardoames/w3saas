import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { X, ArrowRight, ArrowUpRight, ArrowDownRight, Minus, Info } from "lucide-react";
import { subDays, startOfDay, endOfDay, parseISO, isWithinInterval, startOfMonth, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CHANNEL_NAMES: Record<string, string> = {
  shopee: "Shopee",
  mercado_livre: "Mercado Livre",
  site: "Site (Nuvemshop / Shopify)",
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
};

interface PeriodComparisonProps {
  connectedChannels: string[];
  channelLogos: Record<string, string>;
  metricsData: any[];
  mapPlatformToChannel: (platform: string | null) => string | null;
  currentPeriodFrom: Date;
  currentPeriodTo: Date;
  onClose: () => void;
}

type PeriodPreset = "today" | "7d" | "14d" | "30d" | "month" | "custom";

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "30d", label: "30D" },
  { value: "month", label: "Mês" },
  { value: "custom", label: "Custom" },
];

function getDateRange(preset: PeriodPreset, customRange?: DateRange): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "14d":
      return { from: startOfDay(subDays(now, 13)), to: endOfDay(now) };
    case "30d":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "month":
      return { from: startOfDay(startOfMonth(now)), to: endOfDay(now) };
    case "custom":
      if (customRange?.from) {
        return {
          from: startOfDay(customRange.from),
          to: endOfDay(customRange.to || customRange.from),
        };
      }
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
  }
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatNumber = (v: number) => v.toLocaleString("pt-BR");

interface ChannelMetrics {
  faturamento: number;
  investimento: number;
  vendas: number;
  hasData: boolean;
}

function computeMetrics(
  metricsData: any[],
  mapFn: (p: string | null) => string | null,
  channels: string[],
  from: Date,
  to: Date
): Record<string, ChannelMetrics> {
  const result: Record<string, ChannelMetrics> = {};
  for (const ch of channels) {
    result[ch] = { faturamento: 0, investimento: 0, vendas: 0, hasData: false };
  }

  for (const m of metricsData) {
    const dateStr = String(m.data).substring(0, 10);
    const d = parseISO(dateStr);
    const channel = mapFn(m.platform);
    if (!channel || !result[channel]) continue;

    if (isWithinInterval(d, { start: from, end: to })) {
      result[channel].faturamento += Number(m.faturamento || 0);
      result[channel].investimento += Number(m.investimento_trafego || 0);
      result[channel].vendas += Number(m.vendas_quantidade || 0);
      result[channel].hasData = true;
    }
  }
  return result;
}

function variationPct(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function PeriodSelector({
  label,
  selected,
  onSelect,
  customRange,
  onCustomRangeChange,
}: {
  label: string;
  selected: PeriodPreset;
  onSelect: (p: PeriodPreset) => void;
  customRange?: DateRange;
  onCustomRangeChange: (r: DateRange | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <div className="flex items-center gap-1 flex-wrap">
        {PERIOD_OPTIONS.map((opt) =>
          opt.value === "custom" ? (
            <Popover key={opt.value}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant={selected === "custom" ? "default" : "outline"}
                  className="h-7 text-xs px-2"
                  onClick={() => onSelect("custom")}
                >
                  {selected === "custom" && customRange?.from
                    ? `${format(customRange.from, "dd/MM")}–${format(customRange.to || customRange.from, "dd/MM")}`
                    : "Custom"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={(r) => {
                    onCustomRangeChange(r);
                    onSelect("custom");
                  }}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <Button
              key={opt.value}
              size="sm"
              variant={selected === opt.value ? "default" : "outline"}
              className="h-7 text-xs px-2"
              onClick={() => onSelect(opt.value)}
            >
              {opt.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}

function VariationCell({
  pct,
  invertColor = false,
}: {
  pct: number;
  invertColor?: boolean;
}) {
  if (pct === 0) {
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  const isUp = pct > 0;
  const isGood = invertColor ? !isUp : isUp;

  return (
    <span className={`flex items-center gap-0.5 font-medium ${isGood ? "text-emerald-400" : "text-destructive"}`}>
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function ComparisonMetricsTable({
  metricsA,
  metricsB,
  labelA,
  labelB,
}: {
  metricsA: ChannelMetrics;
  metricsB: ChannelMetrics;
  labelA: string;
  labelB: string;
}) {
  const roasA = metricsA.investimento > 0 ? metricsA.faturamento / metricsA.investimento : 0;
  const roasB = metricsB.investimento > 0 ? metricsB.faturamento / metricsB.investimento : 0;
  const ticketA = metricsA.vendas > 0 ? metricsA.faturamento / metricsA.vendas : 0;
  const ticketB = metricsB.vendas > 0 ? metricsB.faturamento / metricsB.vendas : 0;
  const cpaA = metricsA.vendas > 0 && metricsA.investimento > 0 ? metricsA.investimento / metricsA.vendas : 0;
  const cpaB = metricsB.vendas > 0 && metricsB.investimento > 0 ? metricsB.investimento / metricsB.vendas : 0;

  const rows = [
    { label: "Faturamento", a: formatCurrency(metricsA.faturamento), b: formatCurrency(metricsB.faturamento), pct: variationPct(metricsB.faturamento, metricsA.faturamento), invert: false },
    { label: "Investimento", a: formatCurrency(metricsA.investimento), b: formatCurrency(metricsB.investimento), pct: variationPct(metricsB.investimento, metricsA.investimento), invert: true },
    { label: "ROAS", a: roasA > 0 ? roasA.toFixed(2) : "—", b: roasB > 0 ? roasB.toFixed(2) : "—", pct: variationPct(roasB, roasA), invert: false },
    { label: "Vendas", a: formatNumber(metricsA.vendas), b: formatNumber(metricsB.vendas), pct: variationPct(metricsB.vendas, metricsA.vendas), invert: false },
    { label: "Ticket Médio", a: ticketA > 0 ? formatCurrency(ticketA) : "—", b: ticketB > 0 ? formatCurrency(ticketB) : "—", pct: variationPct(ticketB, ticketA), invert: false },
    { label: "CPA", a: cpaA > 0 ? formatCurrency(cpaA) : "—", b: cpaB > 0 ? formatCurrency(cpaB) : "—", pct: variationPct(cpaB, cpaA), invert: true },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">Métrica</TableHead>
          <TableHead className="text-right">{labelA}</TableHead>
          <TableHead className="text-right">{labelB}</TableHead>
          <TableHead className="text-right pr-4">Variação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="pl-4 font-medium text-sm">{row.label}</TableCell>
            <TableCell className="text-right text-sm">{row.a}</TableCell>
            <TableCell className="text-right text-sm">{row.b}</TableCell>
            <TableCell className="text-right pr-4 text-sm">
              <VariationCell pct={row.pct} invertColor={row.invert} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function getInsight(channelName: string, metricsA: ChannelMetrics, metricsB: ChannelMetrics): string {
  if (!metricsA.hasData || !metricsB.hasData) {
    return "Sem dados suficientes para comparar este canal.";
  }

  const roasA = metricsA.investimento > 0 ? metricsA.faturamento / metricsA.investimento : 0;
  const roasB = metricsB.investimento > 0 ? metricsB.faturamento / metricsB.investimento : 0;
  const fatGrew = metricsB.faturamento > metricsA.faturamento;

  if (roasB > roasA && roasA > 0) {
    return `Seu dinheiro está rendendo mais no ${channelName}. Continue investindo.`;
  }
  if (roasB < roasA && roasA > 0 && fatGrew) {
    return `Você vendeu mais, mas com menos eficiência. Seu investimento cresceu mais que o retorno.`;
  }
  if (roasB < roasA && roasA > 0) {
    return `O retorno no ${channelName} caiu neste período. Vale revisar suas campanhas.`;
  }
  return `Seu dinheiro está rendendo mais no ${channelName}. Continue investindo.`;
}

function getPeriodLabel(preset: PeriodPreset, customRange?: DateRange): string {
  switch (preset) {
    case "today": return "Hoje";
    case "7d": return "Últimos 7D";
    case "14d": return "Últimos 14D";
    case "30d": return "Últimos 30D";
    case "month": return "Mês atual";
    case "custom":
      if (customRange?.from) {
        return `${format(customRange.from, "dd/MM")}–${format(customRange.to || customRange.from, "dd/MM")}`;
      }
      return "Custom";
  }
}

export default function PeriodComparisonSection({
  connectedChannels,
  channelLogos,
  metricsData,
  mapPlatformToChannel,
  currentPeriodFrom,
  currentPeriodTo,
  onClose,
}: PeriodComparisonProps) {
  const [periodA, setPeriodA] = useState<PeriodPreset>("30d");
  const [periodB, setPeriodB] = useState<PeriodPreset>("7d");
  const [customA, setCustomA] = useState<DateRange | undefined>();
  const [customB, setCustomB] = useState<DateRange | undefined>();
  const [compared, setCompared] = useState(false);

  const rangeA = useMemo(() => getDateRange(periodA, customA), [periodA, customA]);
  const rangeB = useMemo(() => getDateRange(periodB, customB), [periodB, customB]);

  const labelA = getPeriodLabel(periodA, customA);
  const labelB = getPeriodLabel(periodB, customB);

  const channelMetricsA = useMemo(
    () => (compared ? computeMetrics(metricsData, mapPlatformToChannel, connectedChannels, rangeA.from, rangeA.to) : {}),
    [compared, metricsData, mapPlatformToChannel, connectedChannels, rangeA]
  );
  const channelMetricsB = useMemo(
    () => (compared ? computeMetrics(metricsData, mapPlatformToChannel, connectedChannels, rangeB.from, rangeB.to) : {}),
    [compared, metricsData, mapPlatformToChannel, connectedChannels, rangeB]
  );

  const channelsWithData = useMemo(() => {
    if (!compared) return [];
    return connectedChannels.filter(
      (ch) => channelMetricsA[ch]?.hasData || channelMetricsB[ch]?.hasData
    );
  }, [compared, connectedChannels, channelMetricsA, channelMetricsB]);

  // Consolidated totals
  const totalA = useMemo<ChannelMetrics>(() => {
    const t: ChannelMetrics = { faturamento: 0, investimento: 0, vendas: 0, hasData: false };
    for (const ch of channelsWithData) {
      const m = channelMetricsA[ch];
      if (m) { t.faturamento += m.faturamento; t.investimento += m.investimento; t.vendas += m.vendas; if (m.hasData) t.hasData = true; }
    }
    return t;
  }, [channelsWithData, channelMetricsA]);

  const totalB = useMemo<ChannelMetrics>(() => {
    const t: ChannelMetrics = { faturamento: 0, investimento: 0, vendas: 0, hasData: false };
    for (const ch of channelsWithData) {
      const m = channelMetricsB[ch];
      if (m) { t.faturamento += m.faturamento; t.investimento += m.investimento; t.vendas += m.vendas; if (m.hasData) t.hasData = true; }
    }
    return t;
  }, [channelsWithData, channelMetricsB]);

  const lucroA = totalA.faturamento - totalA.investimento;
  const lucroB = totalB.faturamento - totalB.investimento;
  const margemA = totalA.faturamento > 0 ? (lucroA / totalA.faturamento) * 100 : 0;
  const margemB = totalB.faturamento > 0 ? (lucroB / totalB.faturamento) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-[hsla(24,94%,53%,0.12)] rounded-xl overflow-hidden">
        <CardHeader className="py-4 px-5 flex flex-row items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-base">Como você evoluiu entre períodos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compare dois períodos lado a lado para entender seu crescimento
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </CardHeader>

        <CardContent className="px-5 pb-5 pt-0">
          {/* Period selectors */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <PeriodSelector label="Período de comparação" selected={periodA} onSelect={setPeriodA} customRange={customA} onCustomRangeChange={setCustomA} />
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block mt-6" />
            <PeriodSelector label="Período atual" selected={periodB} onSelect={setPeriodB} customRange={customB} onCustomRangeChange={setCustomB} />
            <Button onClick={() => setCompared(true)} className="h-8 px-4 text-sm bg-primary hover:bg-primary/90 text-primary-foreground">
              Comparar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {compared && channelsWithData.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Não encontramos dados para comparar nestes períodos. Tente selecionar períodos diferentes ou cadastre dados no Acompanhamento Diário.
          </CardContent>
        </Card>
      )}

      {compared && channelsWithData.length > 0 && (
        <>
          {/* Per-channel cards */}
          {channelsWithData.map((ch) => {
            const mA = channelMetricsA[ch] || { faturamento: 0, investimento: 0, vendas: 0, hasData: false };
            const mB = channelMetricsB[ch] || { faturamento: 0, investimento: 0, vendas: 0, hasData: false };
            const name = CHANNEL_NAMES[ch] || ch;

            return (
              <Card key={ch} className="border-[hsla(24,94%,53%,0.12)] rounded-xl overflow-hidden">
                <CardHeader className="py-3 px-5 border-b border-border/30 flex flex-row items-center gap-2">
                  {channelLogos[ch] && <img src={channelLogos[ch]} alt={name} className="h-5 w-5 rounded object-contain" />}
                  <span className="font-semibold text-sm">{name}</span>
                </CardHeader>
                <CardContent className="p-0">
                  <ComparisonMetricsTable metricsA={mA} metricsB={mB} labelA={labelA} labelB={labelB} />
                  <div className="px-5 pb-4 pt-2">
                    <p className="text-[13px] italic text-foreground/70">
                      {getInsight(name, mA, mB)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Consolidated card */}
          <Card className="border-[hsla(24,94%,53%,0.12)] rounded-xl overflow-hidden">
            <CardHeader className="py-3 px-5 border-b border-border/30">
              <span className="font-semibold text-sm">Visão consolidada — todos os canais</span>
            </CardHeader>
            <CardContent className="p-0">
              <ComparisonMetricsTable metricsA={totalA} metricsB={totalB} labelA={labelA} labelB={labelB} />
              {/* Lucro row */}
              <div className="border-t border-border/30 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">Lucro Estimado</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Faturamento menos o investimento em tráfego. Não inclui outros custos.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(lucroA)}</p>
                      <p className="text-[11px] text-muted-foreground">{margemA.toFixed(1)}% margem</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(lucroB)}</p>
                      <p className="text-[11px] text-muted-foreground">{margemB.toFixed(1)}% margem</p>
                    </div>
                    <div className="text-right w-16">
                      <VariationCell pct={variationPct(lucroB, lucroA)} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
