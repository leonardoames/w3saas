import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, RotateCcw } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ScenarioInputs {
  monthlyVisits: string;
  conversionRate: string;
  averageTicket: string;
}

const defaultInputs: ScenarioInputs = {
  monthlyVisits: "",
  conversionRate: "",
  averageTicket: "",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatPercent(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
  });
}

function calculateRevenue(inputs: ScenarioInputs) {
  const visits = parseFloat(inputs.monthlyVisits) || 0;
  const rate = parseFloat(inputs.conversionRate) || 0;
  const ticket = parseFloat(inputs.averageTicket) || 0;

  const monthlyRevenue = visits * (rate / 100) * ticket;
  const yearlyRevenue = monthlyRevenue * 12;

  return { monthlyRevenue, yearlyRevenue, isValid: visits > 0 && rate > 0 && ticket > 0 };
}

interface ScenarioCardProps {
  title: string;
  inputs: ScenarioInputs;
  onChange: (inputs: ScenarioInputs) => void;
  actions?: React.ReactNode;
}

function ScenarioCard({ title, inputs, onChange, actions }: ScenarioCardProps) {
  const { monthlyRevenue, yearlyRevenue, isValid } = useMemo(
    () => calculateRevenue(inputs),
    [inputs]
  );

  return (
    <Card className="flex-1">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${title}-visits`} className="text-sm font-medium">
              Visitas Mensais
            </Label>
            <Input
              id={`${title}-visits`}
              type="number"
              placeholder="Ex: 10000"
              value={inputs.monthlyVisits}
              onChange={(e) =>
                onChange({ ...inputs, monthlyVisits: e.target.value })
              }
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${title}-rate`} className="text-sm font-medium">
              Taxa de Conversão (%)
            </Label>
            <Input
              id={`${title}-rate`}
              type="number"
              step="0.1"
              placeholder="Ex: 2.5"
              value={inputs.conversionRate}
              onChange={(e) =>
                onChange({ ...inputs, conversionRate: e.target.value })
              }
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${title}-ticket`} className="text-sm font-medium">
              Ticket Médio (R$)
            </Label>
            <Input
              id={`${title}-ticket`}
              type="number"
              step="0.01"
              placeholder="Ex: 150.00"
              value={inputs.averageTicket}
              onChange={(e) =>
                onChange({ ...inputs, averageTicket: e.target.value })
              }
              className="bg-background"
            />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3 pt-4 border-t border-border">
          {isValid ? (
            <>
              <div className="rounded-lg bg-accent/50 p-4">
                <p className="text-sm text-muted-foreground mb-1">
                  Faturamento Mensal
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(monthlyRevenue)}
                </p>
              </div>
              <div className="rounded-lg bg-accent/50 p-4">
                <p className="text-sm text-muted-foreground mb-1">
                  Faturamento Acumulado em 12 Meses
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(yearlyRevenue)}
                </p>
              </div>
            </>
          ) : (
            <div className="rounded-lg bg-muted/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Preencha todos os campos acima para visualizar os resultados.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SimulacaoCenarios() {
  const [currentScenario, setCurrentScenario] =
    useState<ScenarioInputs>(defaultInputs);
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
    setNewScenario({ ...currentScenario });
  };

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                className="text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar do Atual
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetNewScenario}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Resetar
              </Button>
            </div>
          }
        />
      </div>

      {/* Comparison Section */}
      {comparison && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Comparação de Cenários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`rounded-lg p-4 ${
                  comparison.monthlyDiff >= 0
                    ? "bg-success/10 border border-success/30"
                    : "bg-destructive/10 border border-destructive/30"
                }`}
              >
                <p className="text-sm text-muted-foreground mb-1">
                  Diferença de Faturamento Mensal
                </p>
                <p
                  className={`text-2xl font-bold ${
                    comparison.monthlyDiff >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {comparison.monthlyDiff >= 0 ? "+" : ""}
                  {formatCurrency(comparison.monthlyDiff)}
                </p>
                <p
                  className={`text-sm font-medium ${
                    comparison.monthlyDiff >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {comparison.monthlyDiff >= 0 ? "+" : ""}
                  {formatPercent(comparison.monthlyDiffPercent)}
                </p>
              </div>

              <div
                className={`rounded-lg p-4 ${
                  comparison.yearlyDiff >= 0
                    ? "bg-success/10 border border-success/30"
                    : "bg-destructive/10 border border-destructive/30"
                }`}
              >
                <p className="text-sm text-muted-foreground mb-1">
                  Diferença de Faturamento em 12 Meses
                </p>
                <p
                  className={`text-2xl font-bold ${
                    comparison.yearlyDiff >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {comparison.yearlyDiff >= 0 ? "+" : ""}
                  {formatCurrency(comparison.yearlyDiff)}
                </p>
                <p
                  className={`text-sm font-medium ${
                    comparison.yearlyDiff >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {comparison.yearlyDiff >= 0 ? "+" : ""}
                  {formatPercent(comparison.yearlyDiffPercent)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 0 && (currentCalc.isValid || newCalc.isValid) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              Faturamento Acumulado em 12 Meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAtual" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-1))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="colorNovo" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="hsl(var(--chart-2))"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) =>
                      value.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        notation: "compact",
                      })
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      undefined,
                    ]}
                  />
                  <Legend />
                  {currentCalc.isValid && (
                    <Area
                      type="monotone"
                      dataKey="atual"
                      name="Cenário Atual"
                      stroke="hsl(var(--chart-1))"
                      fill="url(#colorAtual)"
                      strokeWidth={2}
                    />
                  )}
                  {newCalc.isValid && (
                    <Area
                      type="monotone"
                      dataKey="novo"
                      name="Novo Cenário"
                      stroke="hsl(var(--chart-2))"
                      fill="url(#colorNovo)"
                      strokeWidth={2}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
