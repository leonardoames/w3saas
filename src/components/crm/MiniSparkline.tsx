interface MiniSparklineProps {
  values: (number | null)[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Renders a tiny SVG line chart from an array of values (nulls skipped).
 * values: oldest → newest
 */
export function MiniSparkline({ values, width = 60, height = 24, className }: MiniSparklineProps) {
  const valid = values.filter(v => v !== null && v !== undefined) as number[];
  if (valid.length < 2) return null;

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = valid.map((v, i) => {
    const x = pad + (i / (valid.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = valid[valid.length - 1];
  const prev = valid[valid.length - 2];
  const isUp = last >= prev;
  const strokeColor = isUp ? "#22c55e" : "#ef4444";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: "visible" }}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot at last point */}
      {(() => {
        const lastPt = points[points.length - 1].split(",");
        return (
          <circle
            cx={parseFloat(lastPt[0])}
            cy={parseFloat(lastPt[1])}
            r={2}
            fill={strokeColor}
          />
        );
      })()}
    </svg>
  );
}
