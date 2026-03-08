interface MetricCardProps {
  title: string;
  value: string;
}

export function MetricCard({ title, value }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-sm">
      <p className="metric-label mb-2">{title}</p>
      <p className="text-xl font-semibold text-foreground tabular-nums tracking-tight" style={{ letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  );
}
