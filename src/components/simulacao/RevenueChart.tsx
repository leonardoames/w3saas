import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency } from "./ScenarioCard";

interface ChartDataPoint {
  month: string;
  atual?: number;
  novo?: number;
}

interface RevenueChartProps {
  chartData: ChartDataPoint[];
  showCurrent: boolean;
  showNew: boolean;
}

export function RevenueChart({ chartData, showCurrent, showNew }: RevenueChartProps) {
  if (chartData.length === 0 || (!showCurrent && !showNew)) {
    return null;
  }

  return (
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
                formatter={(value: number) => [formatCurrency(value), undefined]}
              />
              <Legend />
              {showCurrent && (
                <Area
                  type="monotone"
                  dataKey="atual"
                  name="Cenário Atual"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#colorAtual)"
                  strokeWidth={2}
                />
              )}
              {showNew && (
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
  );
}
