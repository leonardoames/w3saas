import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, History, Save, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ScenarioInputs,
  defaultInputs,
  calculateRevenue,
  formatCurrency,
} from "@/components/simulacao/ScenarioCard";
import { SaveScenarioDialog } from "@/components/simulacao/SaveScenarioDialog";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

/* ── Formatting helpers ── */
function fmtThousands(v: string): string {
  const num = v.replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("pt-BR");
}

function parseThousands(formatted: string): string {
  return formatted.replace(/\./g, "").replace(/\s/g, "");
}

function fmtDecimal(v: string, decimals = 2): string {
  const clean = v.replace(/[^\d,]/g, "");
  return clean;
}

export default function SimulacaoCenarios() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentScenario, setCurrentScenario] = useState<ScenarioInputs>(defaultInputs);
  const [newScenario, setNewScenario] = useState<ScenarioInputs>(defaultInputs);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  useEffect(() => {
    const state = location.state as any;
    if (state?.currentScenario) setCurrentScenario(state.currentScenario);
    if (state?.newScenario) setNewScenario(state.newScenario);
  }, [location.state]);

  const currentCalc = useMemo(() => calculateRevenue(currentScenario), [currentScenario]);
  const newCalc = useMemo(() => calculateRevenue(newScenario), [newScenario]);

  const comparison = useMemo(() => {
    if (!currentCalc.isValid || !newCalc.isValid) return null;
    const monthlyDiff = newCalc.monthlyRevenue - currentCalc.monthlyRevenue;
    const monthlyDiffPercent = currentCalc.monthlyRevenue > 0 ? monthlyDiff / currentCalc.monthlyRevenue : 0;
    const yearlyDiff = newCalc.yearlyRevenue - currentCalc.yearlyRevenue;
    return { monthlyDiff, monthlyDiffPercent, yearlyDiff };
  }, [currentCalc, newCalc]);

  const chartData = useMemo(() => {
    if (!currentCalc.isValid && !newCalc.isValid) return [];
    return Array.from({ length: 12 }, (_, i) => ({
      month: `M${i + 1}`,
      atual: currentCalc.isValid ? currentCalc.monthlyRevenue * (i + 1) : undefined,
      novo: newCalc.isValid ? newCalc.monthlyRevenue * (i + 1) : undefined,
    }));
  }, [currentCalc, newCalc]);

  const copyFromCurrent = () => setNewScenario({ ...currentScenario });

  const handleInputChange = (
    setter: (v: ScenarioInputs) => void,
    current: ScenarioInputs,
    field: keyof ScenarioInputs,
    value: string
  ) => {
    const numValue = parseFloat(value);
    if (value !== "" && numValue < 0) return;
    if (field === "conversionRate" && numValue > 100) return;
    setter({ ...current, [field]: value });
  };

  const hasAnyResult = currentCalc.isValid || newCalc.isValid;

  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      {/* HEADER — compact */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Simule seu Faturamento</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Compare cenários e veja o impacto em tempo real</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/app/simulacao/historico")}>
            <History className="h-3.5 w-3.5 mr-1" />
            Histórico
          </Button>
          <Button size="sm" onClick={() => setSaveDialogOpen(true)} disabled={!hasAnyResult}>
            <Save className="h-3.5 w-3.5 mr-1" />
            Salvar
          </Button>
        </div>
      </div>

      {/* MAIN — 2 columns */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(320px,2fr)_3fr] gap-4 min-h-0 overflow-auto lg:overflow-hidden">
        {/* LEFT — Inputs */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
          <CompactInputSection
            title="Cenário Atual"
            variant="neutral"
            inputs={currentScenario}
            onChange={(field, value) => handleInputChange(setCurrentScenario, currentScenario, field, value)}
          />

          <Button
            variant="ghost"
            size="sm"
            onClick={copyFromCurrent}
            disabled={!currentCalc.isValid}
            className="self-center text-[11px] text-muted-foreground hover:text-primary gap-1.5 h-7 px-3"
          >
            <Copy className="h-3 w-3" />
            Copiar para Novo Cenário
          </Button>

          <CompactInputSection
            title="Novo Cenário"
            variant="primary"
            inputs={newScenario}
            onChange={(field, value) => handleInputChange(setNewScenario, newScenario, field, value)}
          />
        </div>

        {/* RIGHT — Results */}
        <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* North Star Metric */}
          <NorthStarMetric comparison={comparison} />

          {/* 2x2 Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <MetricTile
              label="Fat. Mensal Atual"
              value={currentCalc.isValid ? formatCurrency(currentCalc.monthlyRevenue) : "—"}
              active={currentCalc.isValid}
            />
            <MetricTile
              label="Fat. Mensal Novo"
              value={newCalc.isValid ? formatCurrency(newCalc.monthlyRevenue) : "—"}
              active={newCalc.isValid}
              highlight
            />
            <MetricTile
              label="Fat. Anual Atual"
              value={currentCalc.isValid ? formatCurrency(currentCalc.yearlyRevenue) : "—"}
              active={currentCalc.isValid}
            />
            <MetricTile
              label="Fat. Anual Novo"
              value={newCalc.isValid ? formatCurrency(newCalc.yearlyRevenue) : "—"}
              active={newCalc.isValid}
              highlight
            />
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="flex-1 min-h-[180px] rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Evolução em 12 meses
              </p>
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="simAtual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="simNovo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), undefined]}
                  />
                  {currentCalc.isValid && (
                    <Area
                      type="monotone"
                      dataKey="atual"
                      name="Atual"
                      stroke="hsl(var(--chart-4))"
                      fill="url(#simAtual)"
                      strokeWidth={1.5}
                    />
                  )}
                  {newCalc.isValid && (
                    <Area
                      type="monotone"
                      dataKey="novo"
                      name="Novo"
                      stroke="hsl(var(--primary))"
                      fill="url(#simNovo)"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <SaveScenarioDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        currentScenario={currentScenario}
        newScenario={newScenario}
      />
    </div>
  );
}

/* ─── Compact Input Section ─── */
function CompactInputSection({
  title,
  variant,
  inputs,
  onChange,
}: {
  title: string;
  variant: "neutral" | "primary";
  inputs: ScenarioInputs;
  onChange: (field: keyof ScenarioInputs, value: string) => void;
}) {
  const isPrimary = variant === "primary";

  return (
    <div className={`rounded-xl border p-3.5 ${isPrimary ? "border-primary/30 bg-primary/[0.02]" : "border-border bg-card"}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${isPrimary ? "text-primary" : "text-muted-foreground"}`}>
        {title}
      </p>
      <div className="space-y-2.5">
        <FormattedField
          label="Visitas Mensais"
          placeholder="10.000"
          value={inputs.monthlyVisits}
          onChange={(v) => onChange("monthlyVisits", v)}
          type="thousands"
        />
        <FormattedField
          label="Taxa de Conversão"
          placeholder="2,5"
          value={inputs.conversionRate}
          onChange={(v) => onChange("conversionRate", v)}
          type="percent"
        />
        <FormattedField
          label="Ticket Médio"
          placeholder="150,00"
          value={inputs.averageTicket}
          onChange={(v) => onChange("averageTicket", v)}
          type="currency"
        />
      </div>
    </div>
  );
}

/* ─── Formatted Field ─── */
function FormattedField({
  label,
  placeholder,
  value,
  onChange,
  type,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type: "thousands" | "percent" | "currency";
}) {
  const prefix = type === "currency" ? "R$" : undefined;
  const suffix = type === "percent" ? "%" : undefined;

  const handleChange = (raw: string) => {
    if (type === "thousands") {
      // Only digits
      const digits = raw.replace(/\D/g, "");
      onChange(digits);
    } else {
      // Allow digits, dot, comma
      const clean = raw.replace(/[^\d.,]/g, "").replace(",", ".");
      const numValue = parseFloat(clean);
      if (clean !== "" && numValue < 0) return;
      if (type === "percent" && numValue > 100) return;
      onChange(clean);
    }
  };

  const displayValue = useMemo(() => {
    if (!value) return "";
    if (type === "thousands") {
      const num = parseInt(value, 10);
      return isNaN(num) ? "" : num.toLocaleString("pt-BR");
    }
    if (type === "percent" || type === "currency") {
      return value.replace(".", ",");
    }
    return value;
  }, [value, type]);

  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <Input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          className={`h-10 text-sm bg-background ${prefix ? "pl-8" : ""} ${suffix ? "pr-7" : ""}`}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── North Star Metric ─── */
function NorthStarMetric({ comparison }: { comparison: { monthlyDiff: number; monthlyDiffPercent: number } | null }) {
  if (!comparison) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
          Potencial de Crescimento
        </p>
        <p className="text-muted-foreground/40 text-sm">Preencha ambos os cenários para comparar</p>
      </div>
    );
  }

  const isPositive = comparison.monthlyDiff >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const absCurrency = Math.abs(comparison.monthlyDiff).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
  const absPercent = Math.abs(comparison.monthlyDiffPercent * 100).toFixed(1);

  return (
    <div
      className={`rounded-xl border p-5 transition-colors ${
        isPositive
          ? "border-primary/25 bg-primary/[0.04]"
          : "border-destructive/25 bg-destructive/[0.04]"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
        Potencial de Crescimento
      </p>
      <div className="flex items-baseline gap-3">
        <p className={`text-[28px] font-bold leading-tight tabular-nums ${isPositive ? "text-foreground" : "text-destructive"}`} style={{ letterSpacing: "-0.02em" }}>
          {isPositive ? "+" : "-"}{absCurrency}
        </p>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
          isPositive ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
        }`}>
          <Icon className="h-3 w-3" />
          {isPositive ? "+" : "-"}{absPercent}%
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground/60 mt-1">diferença mensal entre cenários</p>
    </div>
  );
}

/* ─── Metric Tile ─── */
function MetricTile({
  label,
  value,
  active,
  highlight,
}: {
  label: string;
  value: string;
  active: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-3.5 transition-opacity ${!active ? "opacity-40" : ""}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60 mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums leading-tight ${highlight && active ? "text-primary" : "text-foreground"}`} style={{ letterSpacing: "-0.01em" }}>
        {value}
      </p>
    </div>
  );
}
