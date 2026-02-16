import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "./ScenarioCard";

interface GrowthProjectionChartProps {
  currentYearlyRevenue: number | null;
  newYearlyRevenue: number | null;
}

export function GrowthProjectionChart({
  currentYearlyRevenue,
  newYearlyRevenue,
}: GrowthProjectionChartProps) {
  const chartData = useMemo(() => {
    if (!currentYearlyRevenue && !newYearlyRevenue) return [];

    return Array.from({ length: 5 }, (_, i) => {
      const year = i + 1;
      const factor = Math.pow(1.1, year);
      return {
        year: `Ano ${year}`,
        atual: currentYearlyRevenue ? currentYearlyRevenue * factor : undefined,
        novo: newYearlyRevenue ? newYearlyRevenue * factor : undefined,
      };
    });
  }, [currentYearlyRevenue, newYearlyRevenue]);

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Projeção de Crescimento (10% ao ano)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="year"
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
                formatter={(value: number) => [formatCurrency(value), undefined]}
              />
              <Legend />
              {currentYearlyRevenue && (
                <Bar
                  dataKey="atual"
                  name="Cenário Atual"
                  fill="hsl(var(--chart-1))"
                  radius={[4, 4, 0, 0]}
                />
              )}
              {newYearlyRevenue && (
                <Bar
                  dataKey="novo"
                  name="Novo Cenário"
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
