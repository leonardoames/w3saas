interface MetricCardProps {
  title: string;
  value: string;
}

export function MetricCard({ title, value }: MetricCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <p className="text-xs text-muted-foreground font-medium mb-1">{title}</p>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
