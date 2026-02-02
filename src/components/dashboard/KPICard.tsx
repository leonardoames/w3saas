import { LucideIcon, ChevronRight } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export function KPICard({ title, value, subtitle, icon: Icon, onClick }: KPICardProps) {
  const isClickable = !!onClick;
  
  return (
    <div 
      className={`bg-card border border-border rounded-lg p-5 md:p-6 shadow-sm transition-all ${
        isClickable 
          ? 'cursor-pointer hover:shadow-md hover:border-primary/50 hover:bg-accent/30 group' 
          : 'hover:shadow-md'
      }`}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        <div className="flex items-center gap-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {isClickable && (
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-bold text-foreground">{value}</div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
}
