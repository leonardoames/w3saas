import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
}

export function MetricCard({ title, value, icon: Icon }: MetricCardProps) {
  return (
    <div className="bg-card border border-border/50 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground/70 font-medium">{title}</p>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
