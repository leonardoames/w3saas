import { ChevronRight } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number; // percentage change vs previous period
  onClick?: () => void;
  dominant?: boolean;
}

export function KPICard({ title, value, subtitle, change, onClick, dominant }: KPICardProps) {
  const isClickable = !!onClick;
  
  return (
    <div 
      className={`bg-card border border-border rounded-lg shadow-sm transition-all ${
        dominant ? 'p-6 md:p-8 col-span-2 lg:col-span-1' : 'p-5 md:p-6'
      } ${
        isClickable 
          ? 'cursor-pointer hover:shadow-md hover:border-primary/40 group' 
          : 'hover:shadow-md'
      }`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{title}</span>
        {isClickable && (
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <div className={`font-bold text-foreground ${dominant ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'}`}>
        {value}
      </div>
      <div className="flex items-center gap-2 mt-2">
        {change !== undefined && change !== 0 && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
            change > 0 
              ? 'text-success bg-success/10' 
              : 'text-destructive bg-destructive/10'
          }`}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
