import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ScenarioInputs {
  monthlyVisits: string;
  conversionRate: string;
  averageTicket: string;
}

export const defaultInputs: ScenarioInputs = {
  monthlyVisits: "",
  conversionRate: "",
  averageTicket: "",
};

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function formatPercent(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
  });
}

export function calculateRevenue(inputs: ScenarioInputs) {
  const visits = Math.max(0, parseFloat(inputs.monthlyVisits) || 0);
  const rate = Math.max(0, Math.min(100, parseFloat(inputs.conversionRate) || 0));
  const ticket = Math.max(0, parseFloat(inputs.averageTicket) || 0);

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

export function ScenarioCard({ title, inputs, onChange, actions }: ScenarioCardProps) {
  const { monthlyRevenue, yearlyRevenue, isValid } = useMemo(
    () => calculateRevenue(inputs),
    [inputs]
  );

  const handleInputChange = (field: keyof ScenarioInputs, value: string) => {
    // Prevent negative values
    const numValue = parseFloat(value);
    if (value !== "" && numValue < 0) return;
    
    // Limit conversion rate to 100%
    if (field === "conversionRate" && numValue > 100) return;
    
    onChange({ ...inputs, [field]: value });
  };

  return (
    <Card className="flex-1">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
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
              min="0"
              placeholder="Ex: 10000"
              value={inputs.monthlyVisits}
              onChange={(e) => handleInputChange("monthlyVisits", e.target.value)}
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
              min="0"
              max="100"
              step="0.1"
              placeholder="Ex: 2.5"
              value={inputs.conversionRate}
              onChange={(e) => handleInputChange("conversionRate", e.target.value)}
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
              min="0"
              step="0.01"
              placeholder="Ex: 150.00"
              value={inputs.averageTicket}
              onChange={(e) => handleInputChange("averageTicket", e.target.value)}
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
