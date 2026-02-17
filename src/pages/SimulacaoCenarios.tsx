import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, RotateCcw, Save, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ScenarioInputs,
  defaultInputs,
  calculateRevenue,
  formatCurrency,
  formatPercent,
} from "@/components/simulacao/ScenarioCard";
import { RevenueComparisonCard } from "@/components/simulacao/RevenueComparisonCard";
import { SaveScenarioDialog } from "@/components/simulacao/SaveScenarioDialog";
import { useNavigate, useLocation } from "react-router-dom";

export default function SimulacaoCenarios() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentScenario, setCurrentScenario] = useState<ScenarioInputs>(defaultInputs);
  const [newScenario, setNewScenario] = useState<ScenarioInputs>(defaultInputs);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Load from navigation state if coming from history
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Simulação de Cenários</h1>
          <p className="text-muted-foreground mt-2">
            Compare seu cenário atual com um novo cenário e visualize o impacto no faturamento ao longo do tempo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/app/simulacao/historico")}>
            <History className="h-4 w-4 mr-1" />
            Histórico
          </Button>
          <Button size="sm" onClick={() => setSaveDialogOpen(true)} disabled={!currentCalc.isValid && !newCalc.isValid}>
            <Save className="h-4 w-4 mr-1" />
            Salvar Cenário
          </Button>
        </div>
      </div>

      {/* Unified Scenarios Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-xl font-semibold">Cenários</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyFromCurrent}
                disabled={isCopyDisabled}
                className="text-xs"
                title={isCopyDisabled ? "Preencha o cenário atual primeiro" : "Copiar valores do cenário atual"}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar do Atual
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetNewScenario}
                className="text-xs"
                title="Limpar campos do novo cenário"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpar Novo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cenário Atual */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Cenário Atual</h3>
              <ScenarioColumn
                prefix="atual"
                inputs={currentScenario}
                onChange={(field, value) => handleInputChange(setCurrentScenario, currentScenario, field, value)}
                calc={currentCalc}
              />
            </div>

            {/* Novo Cenário */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Novo Cenário</h3>
              <ScenarioColumn
                prefix="novo"
                inputs={newScenario}
                onChange={(field, value) => handleInputChange(setNewScenario, newScenario, field, value)}
                calc={newCalc}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Chart + Comparison */}
      <RevenueComparisonCard
        chartData={chartData}
        showCurrent={currentCalc.isValid}
        showNew={newCalc.isValid}
        comparison={comparison}
      />

      <SaveScenarioDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        currentScenario={currentScenario}
        newScenario={newScenario}
      />
    </div>
  );
}

/* Inline sub-component for each scenario column */
function ScenarioColumn({
  prefix,
  inputs,
  onChange,
  calc,
}: {
  prefix: string;
  inputs: ScenarioInputs;
  onChange: (field: keyof ScenarioInputs, value: string) => void;
  calc: { monthlyRevenue: number; yearlyRevenue: number; isValid: boolean };
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-visits`} className="text-sm font-medium">Visitas Mensais</Label>
        <Input
          id={`${prefix}-visits`}
          type="number"
          min="0"
          placeholder="Ex: 10000"
          value={inputs.monthlyVisits}
          onChange={(e) => onChange("monthlyVisits", e.target.value)}
          className="bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-rate`} className="text-sm font-medium">Taxa de Conversão (%)</Label>
        <Input
          id={`${prefix}-rate`}
          type="number"
          min="0"
          max="100"
          step="0.1"
          placeholder="Ex: 2.5"
          value={inputs.conversionRate}
          onChange={(e) => onChange("conversionRate", e.target.value)}
          className="bg-background"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}-ticket`} className="text-sm font-medium">Ticket Médio (R$)</Label>
        <Input
          id={`${prefix}-ticket`}
          type="number"
          min="0"
          step="0.01"
          placeholder="Ex: 150.00"
          value={inputs.averageTicket}
          onChange={(e) => onChange("averageTicket", e.target.value)}
          className="bg-background"
        />
      </div>

      {/* Results */}
      <div className="space-y-3 pt-3 border-t border-border">
        {calc.isValid ? (
          <>
            <div className="rounded-lg bg-accent/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Faturamento Mensal</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(calc.monthlyRevenue)}</p>
            </div>
            <div className="rounded-lg bg-accent/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Faturamento em 12 Meses</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(calc.yearlyRevenue)}</p>
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-muted/20 p-3 text-center">
            <p className="text-sm text-muted-foreground">Preencha todos os campos para ver os resultados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
