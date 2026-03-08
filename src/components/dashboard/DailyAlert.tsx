import { useState } from "react";
import { X, Rocket, AlertTriangle } from "lucide-react";

interface DailyAlertProps {
  todayRevenue: number;
  avgRevenue7d: number;
}

export function DailyAlert({ todayRevenue, avgRevenue7d }: DailyAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || avgRevenue7d <= 0) return null;

  const change = ((todayRevenue - avgRevenue7d) / avgRevenue7d) * 100;
  const absChange = Math.abs(change).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (Math.abs(change) < 30) return null;

  const isGood = change > 0;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-xs font-medium ${
      isGood 
        ? "bg-success/10 text-success border border-success/20" 
        : "bg-destructive/10 text-destructive border border-destructive/20"
    }`}>
      <div className="flex items-center gap-2">
        {isGood ? <Rocket className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
        <span>
          {isGood 
            ? `Ótimo dia! Vendas ${absChange}% acima da média recente`
            : `Suas vendas hoje estão ${absChange}% abaixo da sua média recente`
          }
        </span>
      </div>
      <button onClick={() => setDismissed(true)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
