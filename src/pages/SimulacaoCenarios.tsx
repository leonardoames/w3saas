import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Copy, History, Save, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
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

const STORAGE_KEY = "simulacao_cenarios_state";

function loadPersistedState(): { current: ScenarioInputs; new_: ScenarioInputs } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { current: parsed.current, new_: parsed.new_ };
  } catch {
    return null;
  }
}

function persistState(current: ScenarioInputs, new_: ScenarioInputs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ current, new_ }));
}

export default function SimulacaoCenarios() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentScenario, setCurrentScenario] = useState<ScenarioInputs>(() => {
    const state = (location.state as any);
    if (state?.currentScenario) return state.currentScenario;
    return loadPersistedState()?.current || defaultInputs;
  });

  const [newScenario, setNewScenario] = useState<ScenarioInputs>(() => {
    const state = (location.state as any);
    if (state?.newScenario) return state.newScenario;
    return loadPersistedState()?.new_ || defaultInputs;
  });

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Persist on every change
  useEffect(() => {
    persistState(currentScenario, newScenario);
  }, [currentScenario, newScenario]);

  // Handle navigation state override
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

  // Effort anchor: what changed between scenarios
  const changedFields = useMemo(() => {
    if (!currentCalc.isValid || !newCalc.isValid) return [];
    const changes: string[] = [];
    const cv = parseFloat(currentScenario.monthlyVisits) || 0;
    const nv = parseFloat(newScenario.monthlyVisits) || 0;
    if (cv !== nv) {
      changes.push(`visitas de ${cv.toLocaleString("pt-BR")} → ${nv.toLocaleString("pt-BR")}`);
    }
    const cr = parseFloat(currentScenario.conversionRate) || 0;
    const nr = parseFloat(newScenario.conversionRate) || 0;
    if (cr !== nr) {
      changes.push(`conversão de ${cr.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}% → ${nr.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%`);
    }
    const ct = parseFloat(currentScenario.averageTicket) || 0;
    const nt = parseFloat(newScenario.averageTicket) || 0;
    if (ct !== nt) {
      changes.push(`ticket de R$${ct.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} → R$${nt.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`);
    }
    return changes;
  }, [currentScenario, newScenario, currentCalc.isValid, newCalc.isValid]);

  const formulaText = useMemo(() => {
    if (!newCalc.isValid) return null;
    const v = parseFloat(newScenario.monthlyVisits) || 0;
    const r = parseFloat(newScenario.conversionRate) || 0;
    const t = parseFloat(newScenario.averageTicket) || 0;
    return `${v.toLocaleString("pt-BR")} visitas × ${r.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}% conversão × R$ ${t.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} ticket`;
  }, [newScenario, newCalc.isValid]);

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
      {/* HEADER */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="page-title text-xl">Simule seu Faturamento</h1>
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
          <NorthStarMetric comparison={comparison} formulaText={formulaText} changedFields={changedFields} />

          {/* Monthly metrics row with arrow */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <MetricTile
              label="Fat. Mensal Atual"
              value={currentCalc.isValid ? formatCurrency(currentCalc.monthlyRevenue) : "—"}
              active={currentCalc.isValid}
              size="large"
            />
            <div className="flex items-center justify-center">
              {currentCalc.isValid && newCalc.isValid ? (
                <ArrowRight className={`h-5 w-5 ${comparison && comparison.monthlyDiff >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`} />
              ) : (
                <ArrowRight className="h-5 w-5 text-muted-foreground/30" />
              )}
            </div>
            <MetricTile
              label="Fat. Mensal Novo"
              value={newCalc.isValid ? formatCurrency(newCalc.monthlyRevenue) : "—"}
              active={newCalc.isValid}
              highlight
              size="large"
            />
          </div>

          {/* Yearly metrics row (smaller) with arrow */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <MetricTile
              label="Fat. Anual Atual"
              value={currentCalc.isValid ? formatCurrency(currentCalc.yearlyRevenue) : "—"}
              active={currentCalc.isValid}
              size="small"
            />
            <div className="flex items-center justify-center">
              {currentCalc.isValid && newCalc.isValid ? (
                <ArrowRight className={`h-4 w-4 ${comparison && comparison.monthlyDiff >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`} />
              ) : (
                <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
              )}
            </div>
            <MetricTile
              label="Fat. Anual Novo"
              value={newCalc.isValid ? formatCurrency(newCalc.yearlyRevenue) : "—"}
              active={newCalc.isValid}
              highlight
              size="small"
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
    <div
      className={`rounded-xl border p-3.5 ${
        isPrimary
          ? "border-orange-400/40 bg-orange-500/[0.03]"
          : "border-muted-foreground/20 bg-card"
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-wider mb-3 ${
          isPrimary ? "text-orange-500" : "text-muted-foreground/60"
        }`}
      >
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
      const digits = raw.replace(/\D/g, "");
      onChange(digits);
    } else {
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
function NorthStarMetric({
  comparison,
  formulaText,
  changedFields,
}: {
  comparison: { monthlyDiff: number; monthlyDiffPercent: number } | null;
  formulaText: string | null;
  changedFields: string[];
}) {
  if (!comparison) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
          Receita Adicional por Mês
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
          ? "border-orange-400/25 bg-orange-500/[0.04]"
          : "border-destructive/25 bg-destructive/[0.04]"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
        Receita Adicional por Mês
      </p>
      <div className="flex items-baseline gap-3">
        <p
          className={`text-[28px] font-bold leading-tight tabular-nums ${isPositive ? "text-foreground" : "text-destructive"}`}
          style={{ letterSpacing: "-0.02em" }}
        >
          {isPositive ? "+" : "-"}{absCurrency}
        </p>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isPositive ? "text-[hsl(var(--success))] bg-[hsl(var(--success))]/10" : "text-destructive bg-destructive/10"
          }`}
        >
          <Icon className="h-3 w-3" />
          {isPositive ? "+" : "-"}{absPercent}%
        </span>
      </div>

      {/* Formula transparency */}
      {formulaText && (
        <p className="text-xs text-muted-foreground/50 mt-1.5">{formulaText}</p>
      )}

      {/* Effort anchor */}
      {changedFields.length > 0 && (
        <p className="text-xs text-orange-500 mt-1">
          Mudando apenas: {changedFields.join(" e ")}
        </p>
      )}

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
  size = "large",
}: {
  label: string;
  value: string;
  active: boolean;
  highlight?: boolean;
  size?: "large" | "small";
}) {
  const isSmall = size === "small";

  return (
    <div
      className={`rounded-xl border border-border bg-card transition-opacity ${
        !active ? "opacity-40" : ""
      } ${isSmall ? "p-2.5" : "p-3.5"}`}
    >
      <p
        className={`font-medium uppercase tracking-wider text-muted-foreground/60 mb-1 ${
          isSmall ? "text-[10px]" : "text-[11px]"
        }`}
      >
        {label}
      </p>
      <p
        className={`font-bold tabular-nums leading-tight ${
          highlight && active ? "text-primary" : "text-foreground"
        } ${isSmall ? "text-sm" : "text-lg"}`}
        style={{ letterSpacing: "-0.01em" }}
      >
        {value}
      </p>
    </div>
  );
}
