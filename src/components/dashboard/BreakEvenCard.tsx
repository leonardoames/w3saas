import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface BreakEvenCardProps {
  investimento: number;
  faturamento: number;
  days: number;
}

export function BreakEvenCard({ investimento, faturamento, days }: BreakEvenCardProps) {
  const breakEven = days > 0 ? investimento / days : 0;
  const avgDailyRevenue = days > 0 ? faturamento / days : 0;
  const isHealthy = avgDailyRevenue >= breakEven;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 md:p-6 transition-all duration-200 hover:shadow-sm",
        isHealthy 
          ? "border-success/30" 
          : "border-destructive/30"
      )}
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="metric-label">Break-even Diário</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs">
              Valor mínimo de vendas diárias para cobrir seu investimento em tráfego
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="text-2xl md:text-[1.75rem] font-semibold text-foreground tabular-nums tracking-tight" style={{ letterSpacing: '-0.03em' }}>
        R$ {breakEven.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        <span className="text-sm font-normal text-muted-foreground">/dia</span>
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        <span className={cn(
          "text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
          isHealthy ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
        )}>
          {isHealthy ? "✓ Acima do break-even" : "✗ Abaixo do break-even"}
        </span>
      </div>
    </div>
  );
}
