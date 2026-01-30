import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "./ScenarioCard";

interface ComparisonData {
  monthlyDiff: number;
  monthlyDiffPercent: number;
  yearlyDiff: number;
  yearlyDiffPercent: number;
}

interface ComparisonCardProps {
  comparison: ComparisonData;
}

export function ComparisonCard({ comparison }: ComparisonCardProps) {
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
  );
}
