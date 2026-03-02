interface MetricCardProps {
  title: string;
  value: string;
}

export function MetricCard({ title, value }: MetricCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium opacity-60 mb-1">{title}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
