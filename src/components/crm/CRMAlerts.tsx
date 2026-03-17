import { AlertTriangle, Clock, Calendar, UserX, TrendingDown, X } from "lucide-react";
import { useState } from "react";
import type { CRMCardExtended } from "./types";

interface AlertItem {
  id: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  text: string;
  count: number;
  filterFn: (c: CRMCardExtended) => boolean;
}

interface CRMAlertsProps {
  cards: CRMCardExtended[];
  onFilter: (filterFn: (c: CRMCardExtended) => boolean, label: string) => void;
}

function buildAlerts(cards: CRMCardExtended[]): AlertItem[] {
  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

  const alerts: AlertItem[] = [];

  // 1. Critical SLA
  const criticalCount = cards.filter(c =>
    (c.stage === "risco" || c.stage === "alerta") && c.slaExceeded
  ).length;
  if (criticalCount > 0) {
    alerts.push({
      id: "critical",
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
      text: `${criticalCount} cliente${criticalCount > 1 ? "s" : ""} em situação crítica (SLA excedido)`,
      count: criticalCount,
      filterFn: c => (c.stage === "risco" || c.stage === "alerta") && c.slaExceeded,
    });
  }

  // 2. Overdue next contact
  const overdueContact = cards.filter(c => c.nextContactDate && c.nextContactDate < today).length;
  if (overdueContact > 0) {
    alerts.push({
      id: "contact",
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
      text: `${overdueContact} cliente${overdueContact > 1 ? "s" : ""} com contato atrasado`,
      count: overdueContact,
      filterFn: c => !!c.nextContactDate && c.nextContactDate < today,
    });
  }

  // 3. Contracts expiring in 30 days
  const expiringContracts = cards.filter(c =>
    c.dataFimContrato && c.dataFimContrato >= today && c.dataFimContrato <= in30
  ).length;
  if (expiringContracts > 0) {
    alerts.push({
      id: "expiring",
      icon: Calendar,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
      text: `${expiringContracts} contrato${expiringContracts > 1 ? "s" : ""} vencendo em 30 dias`,
      count: expiringContracts,
      filterFn: c => !!c.dataFimContrato && c.dataFimContrato >= today && c.dataFimContrato <= in30,
    });
  }

  // 4. Inactive > 30 days
  const inactiveCount = cards.filter(c => c.lastLoginDaysAgo !== null && c.lastLoginDaysAgo > 30).length;
  if (inactiveCount > 0) {
    alerts.push({
      id: "inactive",
      icon: UserX,
      color: "text-slate-600",
      bg: "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700",
      text: `${inactiveCount} cliente${inactiveCount > 1 ? "s" : ""} inativos há mais de 30 dias`,
      count: inactiveCount,
      filterFn: c => c.lastLoginDaysAgo !== null && c.lastLoginDaysAgo > 30,
    });
  }

  // 5. Revenue declining (last < second-to-last by >20%)
  const decliningCount = cards.filter(c => {
    const valid = c.sparkline.filter(v => v !== null) as number[];
    if (valid.length < 2) return false;
    const last = valid[valid.length - 1];
    const prev = valid[valid.length - 2];
    return prev > 0 && (last - prev) / prev < -0.2;
  }).length;
  if (decliningCount > 0) {
    alerts.push({
      id: "declining",
      icon: TrendingDown,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
      text: `${decliningCount} cliente${decliningCount > 1 ? "s" : ""} com faturamento em queda >20%`,
      count: decliningCount,
      filterFn: c => {
        const valid = c.sparkline.filter(v => v !== null) as number[];
        if (valid.length < 2) return false;
        const last = valid[valid.length - 1];
        const prev = valid[valid.length - 2];
        return prev > 0 && (last - prev) / prev < -0.2;
      },
    });
  }

  return alerts;
}

export function CRMAlerts({ cards, onFilter }: CRMAlertsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const alerts = buildAlerts(cards).filter(a => !dismissed.has(a.id));

  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map(alert => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${alert.bg}`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${alert.color}`} />
            <p className={`flex-1 text-xs font-medium ${alert.color}`}>{alert.text}</p>
            <button
              onClick={() => onFilter(alert.filterFn, alert.text)}
              className={`text-xs font-semibold underline underline-offset-2 ${alert.color} hover:opacity-70 shrink-0`}
            >
              Ver
            </button>
            <button
              onClick={() => setDismissed(d => new Set([...d, alert.id]))}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
