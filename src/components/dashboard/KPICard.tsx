import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  onClick?: () => void;
  dominant?: boolean;
  invertChange?: boolean;
  tooltip?: string;
  isEmpty?: boolean;
  secondary?: boolean;
}

export function KPICard({ title, value, subtitle, change, onClick, dominant, invertChange, tooltip, isEmpty, secondary }: KPICardProps) {
  const isClickable = !!onClick;
  
  const isPositive = invertChange ? (change !== undefined && change < 0) : (change !== undefined && change > 0);
  const isNegative = invertChange ? (change !== undefined && change > 0) : (change !== undefined && change < 0);

  const cardContent = (
    <div 
      className={cn(
        "rounded-xl border border-border bg-card transition-all duration-200 ease-out relative overflow-hidden",
        secondary ? "p-3 sm:p-4" : dominant ? "p-4 sm:p-5" : "p-3 sm:p-4 md:p-5",
        isClickable 
          ? "cursor-pointer hover:shadow-md hover:border-primary/30 hover:-translate-y-px group" 
          : "hover:shadow-sm"
      )}
      style={{ borderColor: 'hsla(24, 94%, 53%, 0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' }}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="metric-label">{title}</span>
        {isClickable && (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          "font-semibold text-foreground tabular-nums tracking-tight",
          secondary ? "text-lg sm:text-xl" : dominant ? "text-xl sm:text-2xl" : "text-lg sm:text-xl md:text-2xl"
        )}
          style={{ letterSpacing: '-0.03em' }}
        >
          {isEmpty ? "—" : value}
        </span>
        {!isEmpty && change !== undefined && change !== 0 && (
          <span className={cn(
            "text-[11px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap",
            isPositive
              ? "text-success bg-success/10" 
              : isNegative
              ? "text-destructive bg-destructive/10"
              : "text-muted-foreground bg-muted/50"
          )}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
          </span>
        )}
      </div>
      {isEmpty && (
        <p className="text-[10px] text-muted-foreground mt-0.5">Sem dados neste período</p>
      )}
      {subtitle && !isEmpty && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] text-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}
