import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComparisonData {
  monthlyDiff: number;
  monthlyDiffPercent: number;
  yearlyDiff: number;
  yearlyDiffPercent: number;
}

interface ComparisonCardProps {
  comparison: ComparisonData;
}

function formatDiffCurrency(value: number): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function formatDiffPercent(value: number): string {
  const absValue = Math.abs(value);
  const formatted = absValue.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
  });
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function ComparisonCard({ comparison }: ComparisonCardProps) {
  const isMonthlyPositive = comparison.monthlyDiff >= 0;
  const isYearlyPositive = comparison.yearlyDiff >= 0;

  return (
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
              isMonthlyPositive
                ? "bg-success/10 border border-success/30"
                : "bg-destructive/10 border border-destructive/30"
            }`}
          >
            <p className="text-sm text-muted-foreground mb-1">
              Diferença de Faturamento Mensal
            </p>
            <p
              className={`text-2xl font-bold ${
                isMonthlyPositive ? "text-success" : "text-destructive"
              }`}
            >
              {formatDiffCurrency(comparison.monthlyDiff)}
            </p>
            <p
              className={`text-sm font-medium ${
                isMonthlyPositive ? "text-success" : "text-destructive"
              }`}
            >
              {formatDiffPercent(comparison.monthlyDiffPercent)}
            </p>
          </div>

          <div
            className={`rounded-lg p-4 ${
              isYearlyPositive
                ? "bg-success/10 border border-success/30"
                : "bg-destructive/10 border border-destructive/30"
            }`}
          >
            <p className="text-sm text-muted-foreground mb-1">
              Diferença de Faturamento em 12 Meses
            </p>
            <p
              className={`text-2xl font-bold ${
                isYearlyPositive ? "text-success" : "text-destructive"
              }`}
            >
              {formatDiffCurrency(comparison.yearlyDiff)}
            </p>
            <p
              className={`text-sm font-medium ${
                isYearlyPositive ? "text-success" : "text-destructive"
              }`}
            >
              {formatDiffPercent(comparison.yearlyDiffPercent)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}