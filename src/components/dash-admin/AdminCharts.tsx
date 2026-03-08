import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell,
} from "recharts";

interface Props {
  monthlyRevenue: { month: string; total: number }[];
  top5: { name: string; revenue: number }[];
  isLoading: boolean;
}

const COLORS = [
  "hsl(27, 92%, 52%)",
  "hsl(27, 99%, 60%)",
  "hsl(27, 100%, 70%)",
  "hsl(27, 100%, 78%)",
  "hsl(27, 100%, 86%)",
];

const formatBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function AdminCharts({ monthlyRevenue, top5, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3"><CardContent className="p-4"><Skeleton className="h-56 w-full" /></CardContent></Card>
        <Card className="lg:col-span-2"><CardContent className="p-4"><Skeleton className="h-56 w-full" /></CardContent></Card>
      </div>
    );
  }

  const hasRevenue = monthlyRevenue.some((d) => d.total > 0);
  const hasTop5 = top5.some((d) => d.revenue > 0);

  if (!hasRevenue && !hasTop5) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {hasRevenue && (
        <Card className="border-border/50 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              📈 Evolução do Faturamento Consolidado (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-60 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [formatBRL(v), "Faturamento"]} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(27, 92%, 52%)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "hsl(27, 92%, 52%)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {hasTop5 && (
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              🏆 Top 5 por Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top5} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={100} />
                <Tooltip formatter={(v: number) => [formatBRL(v), "Faturamento"]} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} name="Faturamento">
                  {top5.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
