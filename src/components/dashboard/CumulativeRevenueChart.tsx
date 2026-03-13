import { Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart } from "recharts";
import { getDaysInMonth, getDate } from "date-fns";

interface CumulativeChartProps {
  data: { data: string; faturamento: number }[];
  previousData?: { data: string; faturamento: number }[];
  goal?: number | null;
}

const formatYAxis = (value: number) => {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    const real = payload.find((p: any) => p.dataKey === "acumulado");
    const proj = payload.find((p: any) => p.dataKey === "projecao");
    const prev = payload.find((p: any) => p.dataKey === "prevAcumulado");
    const meta = payload.find((p: any) => p.dataKey === "metaAcumulada");
    return (
      <div className="bg-card border border-border rounded-lg p-3 min-w-[180px]">
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Dia {label}</p>
        {real?.value != null && (
          <p className="text-sm font-bold text-foreground">
            Acumulado: R$ {real.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        )}
        {proj?.value != null && (
          <p className="text-xs mt-0.5" style={{ color: 'rgba(249,115,22,0.7)' }}>
            Projeção: R$ {proj.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        )}
        {prev?.value != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Mês ant.: R$ {prev.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        )}
        {meta?.value != null && (
          <p className="text-xs mt-0.5" style={{ color: '#22C55E' }}>
            Meta acum.: R$ {meta.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function CumulativeRevenueChart({ data, previousData, goal }: CumulativeChartProps) {
  const now = new Date();
  const totalDays = getDaysInMonth(now);
  const currentDay = getDate(now);

  // Current month daily values
  const dailyByDay: Record<number, number> = {};
  for (const d of data) {
    try {
      const day = parseInt(d.data.substring(8, 10), 10);
      if (!isNaN(day)) dailyByDay[day] = (dailyByDay[day] || 0) + d.faturamento;
    } catch {}
  }

  // Previous month daily values
  const prevByDay: Record<number, number> = {};
  if (previousData) {
    for (const d of previousData) {
      try {
        const day = parseInt(d.data.substring(8, 10), 10);
        if (!isNaN(day)) prevByDay[day] = (prevByDay[day] || 0) + d.faturamento;
      } catch {}
    }
  }

  // Calculate cumulative totals
  let cumReal = 0;
  let cumPrev = 0;
  const totalRevenue = Object.entries(dailyByDay)
    .filter(([d]) => Number(d) <= currentDay)
    .reduce((s, [, v]) => s + v, 0);
  const dailyAvg = currentDay > 0 ? totalRevenue / currentDay : 0;
  const projectedTotal = dailyAvg * totalDays;
  const metaDiaria = goal && goal > 0 ? goal / totalDays : 0;

  const chartData = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const isPast = day <= currentDay;
    const isFuture = day > currentDay;

    cumReal += isPast ? (dailyByDay[day] || 0) : 0;
    cumPrev += (prevByDay[day] || 0);

    const projectedCum = dailyAvg * day;

    return {
      label: String(day).padStart(2, "0"),
      acumulado: isPast ? cumReal : undefined,
      projecao: isFuture ? projectedCum : (day === currentDay ? cumReal : undefined),
      prevAcumulado: cumPrev > 0 ? cumPrev : undefined,
      metaAcumulada: metaDiaria > 0 ? metaDiaria * day : undefined,
    };
  });

  const onTrack = goal && goal > 0 ? projectedTotal >= goal : undefined;

  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-start justify-between mb-0.5">
        <div>
          <h3 className="text-sm font-medium text-foreground">Acumulado do Mês</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Evolução real vs projeção para bater a meta</p>
        </div>
        {onTrack !== undefined && (
          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
            onTrack
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-red-400 bg-red-500/10'
          }`}>
            {onTrack
              ? '✓ No ritmo da meta'
              : `↓ Projeção: ${projectedTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
            }
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap mt-2 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F97316' }} />
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Acumulado Real</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgba(249,115,22,0.45)' }} />
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Projeção</span>
        </div>
        {goal && goal > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22C55E' }} />
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Meta</span>
          </div>
        )}
        {previousData && previousData.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Mês anterior</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="rgba(249,115,22,0.15)" />
              <stop offset="95%" stopColor="rgba(249,115,22,0)" />
            </linearGradient>
          </defs>
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
          <Tooltip content={<CustomTooltip />} />

          {/* Meta acumulada */}
          {metaDiaria > 0 && (
            <Line
              type="monotone"
              dataKey="metaAcumulada"
              stroke="#22C55E"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              strokeOpacity={0.7}
              dot={false}
              connectNulls
            />
          )}

          {/* Previous month */}
          <Line
            type="monotone"
            dataKey="prevAcumulado"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
            strokeDasharray="4 4"
            dot={false}
            connectNulls={false}
          />

          {/* Acumulado real */}
          <Area
            type="monotone"
            dataKey="acumulado"
            stroke="#F97316"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorAcumulado)"
            connectNulls={false}
          />

          {/* Projeção */}
          <Line
            type="monotone"
            dataKey="projecao"
            stroke="rgba(249,115,22,0.45)"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
