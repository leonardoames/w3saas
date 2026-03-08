import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, BarChart3 } from "lucide-react";
import type { DashAdminFilters } from "@/hooks/useDashAdmin";

interface Props {
  expiring7d: number;
  inactive15d: number;
  neverRevenue: number;
  setFilters: React.Dispatch<React.SetStateAction<DashAdminFilters>>;
}

export function AdminAlerts({ expiring7d, inactive15d, neverRevenue, setFilters }: Props) {
  const alerts = [
    {
      show: expiring7d > 0,
      icon: AlertTriangle,
      bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50",
      iconColor: "text-red-500",
      text: `${expiring7d} usuário${expiring7d > 1 ? "s" : ""} com plano expirando em até 7 dias`,
      action: () => setFilters((f) => ({ ...f, status: "expiring", engagement: "all" })),
    },
    {
      show: inactive15d > 0,
      icon: Clock,
      bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50",
      iconColor: "text-amber-500",
      text: `${inactive15d} usuário${inactive15d > 1 ? "s" : ""} sem login há mais de 15 dias`,
      action: () => setFilters((f) => ({ ...f, engagement: "inactive_15d", status: "all" })),
    },
    {
      show: neverRevenue > 0,
      icon: BarChart3,
      bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50",
      iconColor: "text-amber-500",
      text: `${neverRevenue} usuário${neverRevenue > 1 ? "s" : ""} sem dados de faturamento`,
      action: () => setFilters((f) => ({ ...f, status: "all", engagement: "all", search: "" })),
    },
  ].filter((a) => a.show);

  if (alerts.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {alerts.map((a, i) => {
        const Icon = a.icon;
        return (
          <Card key={i} className={`border ${a.bg}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 shrink-0 ${a.iconColor}`} />
              <p className="text-sm flex-1">{a.text}</p>
              <Button variant="ghost" size="sm" className="shrink-0 text-xs h-7" onClick={a.action}>
                Ver lista
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
