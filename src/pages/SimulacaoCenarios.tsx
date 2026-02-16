import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Copy, RotateCcw } from "lucide-react";
import {
  ScenarioCard,
  ScenarioInputs,
  defaultInputs,
  calculateRevenue,
} from "@/components/simulacao/ScenarioCard";
import { ComparisonCard } from "@/components/simulacao/ComparisonCard";
import { RevenueChart } from "@/components/simulacao/RevenueChart";
import { GrowthProjectionChart } from "@/components/simulacao/GrowthProjectionChart";

export default function SimulacaoCenarios() {
  const [currentScenario, setCurrentScenario] = useState<ScenarioInputs>(defaultInputs);
  const [newScenario, setNewScenario] = useState<ScenarioInputs>(defaultInputs);

  const currentCalc = useMemo(
    () => calculateRevenue(currentScenario),
    [currentScenario]
  );
  const newCalc = useMemo(() => calculateRevenue(newScenario), [newScenario]);

  const comparison = useMemo(() => {
    if (!currentCalc.isValid || !newCalc.isValid) return null;

    const monthlyDiff = newCalc.monthlyRevenue - currentCalc.monthlyRevenue;
    const monthlyDiffPercent =
      currentCalc.monthlyRevenue > 0
        ? monthlyDiff / currentCalc.monthlyRevenue
        : 0;

    const yearlyDiff = newCalc.yearlyRevenue - currentCalc.yearlyRevenue;
    const yearlyDiffPercent =
      currentCalc.yearlyRevenue > 0
        ? yearlyDiff / currentCalc.yearlyRevenue
        : 0;

    return { monthlyDiff, monthlyDiffPercent, yearlyDiff, yearlyDiffPercent };
  }, [currentCalc, newCalc]);

  const chartData = useMemo(() => {
    if (!currentCalc.isValid && !newCalc.isValid) return [];

    return Array.from({ length: 12 }, (_, i) => ({
      month: `Mês ${i + 1}`,
      atual: currentCalc.isValid
        ? currentCalc.monthlyRevenue * (i + 1)
        : undefined,
      novo: newCalc.isValid ? newCalc.monthlyRevenue * (i + 1) : undefined,
    }));
  }, [currentCalc, newCalc]);

  const copyFromCurrent = () => {
    setNewScenario({ ...currentScenario });
  };

  const resetNewScenario = () => {
    setNewScenario(defaultInputs);
  };

  const isCopyDisabled = !currentCalc.isValid;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Simulação de Cenários
        </h1>
        <p className="text-muted-foreground mt-2">
          Compare seu cenário atual com um novo cenário e visualize o impacto no
          faturamento ao longo do tempo.
        </p>
      </div>

      {/* Scenario Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScenarioCard
          title="Cenário Atual"
          inputs={currentScenario}
          onChange={setCurrentScenario}
        />

        <ScenarioCard
          title="Novo Cenário"
          inputs={newScenario}
          onChange={setNewScenario}
          actions={
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
                title="Limpar todos os campos"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            </div>
          }
        />
      </div>

      {/* Comparison Section */}
      {comparison && <ComparisonCard comparison={comparison} />}

      {/* Chart */}
      <RevenueChart
        chartData={chartData}
        showCurrent={currentCalc.isValid}
        showNew={newCalc.isValid}
      />

      {/* Growth Projection */}
      <GrowthProjectionChart
        currentYearlyRevenue={currentCalc.isValid ? currentCalc.yearlyRevenue : null}
        newYearlyRevenue={newCalc.isValid ? newCalc.yearlyRevenue : null}
      />
    </div>
  );
}
