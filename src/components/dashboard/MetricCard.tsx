interface MetricCardProps {
  title: string;
  value: string;
}

export function MetricCard({ title, value }: MetricCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">{title}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
