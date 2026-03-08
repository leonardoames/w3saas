import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { getDaysInMonth, getDate } from "date-fns";

interface DailyBarChartProps {
  data: { data: string; faturamento: number }[];
}

const formatYAxis = (value: number) => {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length && payload[0].value > 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1 font-medium">Dia {label}</p>
        <p className="text-sm font-bold text-foreground">
          R$ {payload[0].value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

// Custom bar shape with top border-radius
const RoundedBar = (props: any) => {
  const { x, y, width, height, fill, stroke, strokeWidth } = props;
  if (!height || height <= 0) return null;
  const r = Math.min(4, width / 2, height);
  return (
    <g>
      <path
        d={`M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth || 0}
      />
    </g>
  );
};

export function DailyRevenueBarChart({ data }: DailyBarChartProps) {
  const now = new Date();
  const totalDays = getDaysInMonth(now);
  const currentDay = getDate(now);
  const currentMonth = now.getMonth();

  // Map actual data by day
  const dataByDay: Record<number, number> = {};
  for (const d of data) {
    try {
      const day = parseInt(d.data.substring(8, 10), 10);
      if (!isNaN(day)) dataByDay[day] = (dataByDay[day] || 0) + d.faturamento;
    } catch {}
  }

  // Find best day
  let bestDay = 0;
  let bestVal = 0;
  for (const [day, val] of Object.entries(dataByDay)) {
    if (val > bestVal) { bestVal = val; bestDay = Number(day); }
  }

  const chartData = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    return {
      label: String(day).padStart(2, "0"),
      value: day <= currentDay ? (dataByDay[day] || 0) : 0,
      isBest: day === bestDay && bestVal > 0,
      isToday: day === currentDay,
      isFuture: day > currentDay,
    };
  });

  return (
    <div className="rounded-xl border bg-card p-5 md:p-6" style={{ borderColor: 'hsla(24, 94%, 53%, 0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
      <h3 className="text-sm font-medium text-foreground">Faturamento por Dia</h3>
      <div className="flex items-center gap-3 mt-0.5 mb-4">
        <p className="text-[11px] text-muted-foreground">Receita gerada a cada dia no período selecionado</p>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F97316' }} />
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Faturamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FBBF24' }} />
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Melhor dia</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 20, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }}
            dy={6}
            interval={Math.max(0, Math.floor(totalDays / 12))}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }}
            tickFormatter={formatYAxis}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="value" shape={<RoundedBar />} maxBarSize={18}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isFuture ? 'transparent' : entry.isBest ? '#FBBF24' : 'rgba(249,115,22,0.85)'}
                stroke={entry.isToday && !entry.isFuture ? 'rgba(255,255,255,0.6)' : 'none'}
                strokeWidth={entry.isToday ? 1.5 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
