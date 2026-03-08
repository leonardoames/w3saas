import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  onClick?: () => void;
  dominant?: boolean;
}

export function KPICard({ title, value, subtitle, change, onClick, dominant }: KPICardProps) {
  const isClickable = !!onClick;
  
  return (
    <div 
      className={cn(
        "rounded-xl border border-border bg-card transition-all duration-200 ease-out",
        dominant ? "p-6 md:p-7 col-span-2 lg:col-span-1" : "p-5 md:p-6",
        isClickable 
          ? "cursor-pointer hover:shadow-md hover:border-primary/30 hover:-translate-y-px group" 
          : "hover:shadow-sm"
      )}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="metric-label">{title}</span>
        {isClickable && (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div className={cn(
        "font-semibold text-foreground tabular-nums tracking-tight",
        dominant ? "text-3xl md:text-[2.25rem]" : "text-2xl md:text-[1.75rem]"
      )}
        style={{ letterSpacing: '-0.03em' }}
      >
        {value}
      </div>
      <div className="flex items-center gap-2 mt-2.5">
        {change !== undefined && change !== 0 && (
          <span className={cn(
            "text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
            change > 0 
              ? "text-success bg-success/10" 
              : "text-destructive bg-destructive/10"
          )}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {subtitle && (
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
