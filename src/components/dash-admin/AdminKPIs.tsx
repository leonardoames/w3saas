import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DollarSign, TrendingUp, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KPIs {
  active: number;
  newRecent: number;
  totalRev: number;
  avgRev: number;
  hasRevenue: boolean;
  engagementRate: number;
}

export function AdminKPIs({ kpis, isLoading }: { kpis: KPIs; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Mentorados Ativos",
      value: kpis.active,
      formatted: String(kpis.active),
      delta: kpis.newRecent,
      deltaLabel: `+${kpis.newRecent} este mês`,
      icon: Users,
      positive: kpis.newRecent > 0,
    },
    {
      label: "Faturamento Total",
      value: kpis.totalRev,
      formatted: `R$ ${kpis.totalRev.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      delta: null,
      deltaLabel: null,
      icon: DollarSign,
      positive: true,
      show: kpis.hasRevenue,
    },
    {
      label: "Fat. Médio/Mentorado",
      value: kpis.avgRev,
      formatted: `R$ ${kpis.avgRev.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      delta: null,
      deltaLabel: null,
      icon: TrendingUp,
      positive: true,
      show: kpis.hasRevenue,
    },
    {
      label: "Taxa de Engajamento",
      value: kpis.engagementRate,
      formatted: `${kpis.engagementRate.toFixed(0)}%`,
      delta: null,
      deltaLabel: "últimos 7 dias",
      icon: Activity,
      positive: kpis.engagementRate >= 50,
    },
  ].filter((c) => c.show !== false);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="border-border/50 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold tabular-nums tracking-tight">{c.formatted}</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              {(c.deltaLabel) && (
                <div className="mt-3 flex items-center gap-1.5">
                  {c.delta !== null && c.delta !== undefined ? (
                    c.positive ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    )
                  ) : null}
                  <span className={`text-xs font-medium ${c.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {c.deltaLabel}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
