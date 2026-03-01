import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, UserPlus, Clock, DollarSign, TrendingUp } from "lucide-react";

interface KPIs {
  total: number;
  active: number;
  newRecent: number;
  expiringSoon: number;
  totalRev: number;
  avgRev: number;
  hasRevenue: boolean;
}

export function AdminKPIs({ kpis, isLoading }: { kpis: KPIs; isLoading: boolean }) {
  const cards = [
    { label: "Total Mentorados", value: kpis.total, icon: Users, show: true },
    { label: "Ativos", value: kpis.active, icon: UserCheck, show: true },
    { label: "Novos (30d)", value: kpis.newRecent, icon: UserPlus, show: true },
    { label: "Encerrando (30d)", value: kpis.expiringSoon, icon: Clock, show: true },
    {
      label: "Faturamento Total",
      value: `R$ ${kpis.totalRev.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      show: kpis.hasRevenue,
    },
    {
      label: "Fat. Médio/Mentorado",
      value: `R$ ${kpis.avgRev.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      show: kpis.hasRevenue,
    },
  ].filter((c) => c.show);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-xs font-medium truncate">{c.label}</span>
              </div>
              <p className="text-xl font-bold tabular-nums">{c.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
