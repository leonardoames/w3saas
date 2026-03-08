import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, RotateCcw, Save, History, Eye, Target, DollarSign, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ScenarioInputs,
  defaultInputs,
  calculateRevenue,
  formatCurrency,
} from "@/components/simulacao/ScenarioCard";
import { RevenueComparisonCard } from "@/components/simulacao/RevenueComparisonCard";
import { SaveScenarioDialog } from "@/components/simulacao/SaveScenarioDialog";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

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
    const yearlyDiffPercent = currentCalc.yearlyRevenue > 0 ? yearlyDiff / currentCalc.yearlyRevenue : 0;
    return { monthlyDiff, monthlyDiffPercent, yearlyDiff, yearlyDiffPercent };
  }, [currentCalc, newCalc]);

  const chartData = useMemo(() => {
    if (!currentCalc.isValid && !newCalc.isValid) return [];
    return Array.from({ length: 12 }, (_, i) => ({
      month: `Mês ${i + 1}`,
      atual: currentCalc.isValid ? currentCalc.monthlyRevenue * (i + 1) : undefined,
      novo: newCalc.isValid ? newCalc.monthlyRevenue * (i + 1) : undefined,
    }));
  }, [currentCalc, newCalc]);

  const copyFromCurrent = () => setNewScenario({ ...currentScenario });
  const resetNewScenario = () => setNewScenario(defaultInputs);

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

  const isCopyDisabled = !currentCalc.isValid;
  const hasAnyResult = currentCalc.isValid || newCalc.isValid;

  return (
    <div className="space-y-10">
      {/* ── HEADER ── */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Simule seu Faturamento
          </h1>
          <p className="text-muted-foreground mt-1.5 text-base">
            Preencha os campos abaixo e veja em tempo real quanto você pode faturar
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate("/app/simulacao/historico")}>
            <History className="h-4 w-4 mr-1.5" />
            Histórico
          </Button>
          <Button size="sm" onClick={() => setSaveDialogOpen(true)} disabled={!hasAnyResult}>
            <Save className="h-4 w-4 mr-1.5" />
            Salvar Cenário
          </Button>
        </div>
      </motion.div>

      {/* ── ZONA 1 — ENTRADAS ── */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xl">📊</span>
          <h2 className="text-lg font-semibold text-foreground">Preencha seus números</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-5 items-start">
          {/* Cenário Atual */}
          <ScenarioInputCard
            title="Cenário Atual"
            variant="neutral"
            inputs={currentScenario}
            onChange={(field, value) => handleInputChange(setCurrentScenario, currentScenario, field, value)}
          />

          {/* Copy Button (center divider) */}
          <div className="hidden lg:flex flex-col items-center justify-center gap-3 pt-16">
            <Button
              variant="outline"
              size="sm"
              onClick={copyFromCurrent}
              disabled={isCopyDisabled}
              className="flex flex-col items-center gap-1.5 h-auto py-3 px-4 border-dashed border-2 hover:border-primary hover:text-primary transition-colors"
              title={isCopyDisabled ? "Preencha o cenário atual primeiro" : "Copiar valores do cenário atual"}
            >
              <Copy className="h-4 w-4" />
              <span className="text-[11px] font-medium">Copiar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetNewScenario}
              className="flex flex-col items-center gap-1 h-auto py-2 px-3 text-muted-foreground hover:text-foreground"
              title="Limpar novo cenário"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="text-[10px]">Limpar</span>
            </Button>
          </div>

          {/* Mobile copy/reset buttons */}
          <div className="flex lg:hidden gap-2 justify-center -mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyFromCurrent}
              disabled={isCopyDisabled}
              className="text-xs border-dashed"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copiar do Atual
            </Button>
            <Button variant="ghost" size="sm" onClick={resetNewScenario} className="text-xs text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Limpar Novo
            </Button>
          </div>

          {/* Novo Cenário */}
          <ScenarioInputCard
            title="Novo Cenário"
            variant="primary"
            inputs={newScenario}
            onChange={(field, value) => handleInputChange(setNewScenario, newScenario, field, value)}
          />
        </div>
      </motion.div>

      {/* ── ZONA 2 — RESULTADOS ── */}
      {hasAnyResult && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">🎯</span>
            <h2 className="text-lg font-semibold text-foreground">Resultado Projetado</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Current result */}
            {currentCalc.isValid && (
              <ResultCard
                label="Cenário Atual"
                monthly={currentCalc.monthlyRevenue}
                yearly={currentCalc.yearlyRevenue}
                variant="neutral"
              />
            )}

            {/* New result */}
            {newCalc.isValid && (
              <ResultCard
                label="Novo Cenário"
                monthly={newCalc.monthlyRevenue}
                yearly={newCalc.yearlyRevenue}
                variant="primary"
              />
            )}
          </div>

          {/* Comparison delta */}
          {comparison && (
            <motion.div
              className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
            >
              <DeltaCard
                label="Diferença Mensal"
                diff={comparison.monthlyDiff}
                diffPercent={comparison.monthlyDiffPercent}
              />
              <DeltaCard
                label="Diferença em 12 Meses"
                diff={comparison.yearlyDiff}
                diffPercent={comparison.yearlyDiffPercent}
              />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* ── ZONA 3 — GRÁFICO ── */}
      {hasAnyResult && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">📈</span>
            <h2 className="text-lg font-semibold text-foreground">Evolução ao longo do tempo</h2>
          </div>
          <RevenueComparisonCard
            chartData={chartData}
            showCurrent={currentCalc.isValid}
            showNew={newCalc.isValid}
            comparison={null}
          />
        </motion.div>
      )}

      <SaveScenarioDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        currentScenario={currentScenario}
        newScenario={newScenario}
      />
    </div>
  );
}

/* ─── Scenario Input Card ─── */
function ScenarioInputCard({
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
    <Card className={`overflow-hidden ${isPrimary ? "border-primary/30" : ""}`}>
      <div
        className={`px-5 py-3.5 border-b ${
          isPrimary
            ? "bg-primary/5 border-primary/20"
            : "bg-muted/50 border-border"
        }`}
      >
        <h3 className={`text-sm font-semibold ${isPrimary ? "text-primary" : "text-muted-foreground"}`}>
          {title}
        </h3>
      </div>
      <CardContent className="p-5 space-y-5">
        <InputField
          icon={<Eye className="h-4 w-4" />}
          label="Visitas Mensais"
          placeholder="Ex: 10.000"
          value={inputs.monthlyVisits}
          onChange={(v) => onChange("monthlyVisits", v)}
          isPrimary={isPrimary}
        />
        <InputField
          icon={<Target className="h-4 w-4" />}
          label="Taxa de Conversão (%)"
          placeholder="Ex: 2.5"
          value={inputs.conversionRate}
          onChange={(v) => onChange("conversionRate", v)}
          step="0.1"
          max="100"
          isPrimary={isPrimary}
        />
        <InputField
          icon={<DollarSign className="h-4 w-4" />}
          label="Ticket Médio (R$)"
          placeholder="Ex: 150,00"
          value={inputs.averageTicket}
          onChange={(v) => onChange("averageTicket", v)}
          step="0.01"
          isPrimary={isPrimary}
        />
      </CardContent>
    </Card>
  );
}

/* ─── Input Field ─── */
function InputField({
  icon,
  label,
  placeholder,
  value,
  onChange,
  step,
  max,
  isPrimary,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
  max?: string;
  isPrimary: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <span className={isPrimary ? "text-primary" : "text-muted-foreground"}>{icon}</span>
        {label}
      </Label>
      <Input
        type="number"
        min="0"
        max={max}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-12 text-base bg-background ${isPrimary ? "focus-visible:ring-primary focus-visible:border-primary" : ""}`}
      />
    </div>
  );
}

/* ─── Result Card ─── */
function ResultCard({
  label,
  monthly,
  yearly,
  variant,
}: {
  label: string;
  monthly: number;
  yearly: number;
  variant: "neutral" | "primary";
}) {
  const isPrimary = variant === "primary";

  return (
    <Card
      className={`overflow-hidden ${
        isPrimary ? "border-primary/30 bg-primary/[0.03]" : ""
      }`}
    >
      <CardContent className="p-5 space-y-4">
        <p className={`text-xs font-semibold uppercase tracking-wider ${isPrimary ? "text-primary" : "text-muted-foreground"}`}>
          {label}
        </p>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Faturamento Mensal</p>
          <p className="text-[32px] font-bold text-foreground leading-tight tabular-nums" style={{ letterSpacing: "-0.02em" }}>
            {formatCurrency(monthly)}
          </p>
        </div>
        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Faturamento em 12 Meses</p>
          <p className="text-xl font-bold text-foreground tabular-nums" style={{ letterSpacing: "-0.02em" }}>
            {formatCurrency(yearly)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Delta Card ─── */
function DeltaCard({
  label,
  diff,
  diffPercent,
}: {
  label: string;
  diff: number;
  diffPercent: number;
}) {
  const isPositive = diff >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  const absCurrency = Math.abs(diff).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
  const absPercent = Math.abs(diffPercent).toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
  });

  return (
    <div
      className={`rounded-xl p-5 flex items-center gap-4 ${
        isPositive
          ? "bg-success/10 border border-success/25"
          : "bg-destructive/10 border border-destructive/25"
      }`}
    >
      <div className={`shrink-0 rounded-full p-2.5 ${isPositive ? "bg-success/15" : "bg-destructive/15"}`}>
        <Icon className={`h-5 w-5 ${isPositive ? "text-success" : "text-destructive"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className={`text-xl font-bold ${isPositive ? "text-success" : "text-destructive"}`}>
          {isPositive ? "+" : "-"}{absCurrency}
        </p>
        <p className={`text-sm font-medium ${isPositive ? "text-success" : "text-destructive"}`}>
          {isPositive ? "+" : "-"}{absPercent}
        </p>
      </div>
    </div>
  );
}
