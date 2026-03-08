import { Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart, ReferenceLine } from "recharts";
import { format, getDaysInMonth, getDate } from "date-fns";
import { TrendingUp } from "lucide-react";

interface ChartDataPoint {
  data: string;
  faturamento: number;
}

interface RevenueChartProps {
  data: ChartDataPoint[];
  previousData?: ChartDataPoint[];
  previousTotal?: number;
  goal?: number | null;
}

const formatYAxis = (value: number) => {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const current = payload.find((p: any) => p.dataKey === "faturamento");
    const proj = payload.find((p: any) => p.dataKey === "projecao");
    const prev = payload.find((p: any) => p.dataKey === "prevFaturamento");
    const goalLine = payload.find((p: any) => p.dataKey === "metaDiaria");
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
        {current?.value != null && (
          <p className="text-sm font-bold text-foreground">
            Atual: R$ {current.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        )}
        {proj?.value != null && !current?.value && (
          <p className="text-sm font-medium text-primary/70">
            Projeção: R$ {proj.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        )}
        {prev?.value != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Mês ant.: R$ {prev.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        )}
        {goalLine?.value != null && (
          <p className="text-xs text-emerald-500 mt-0.5">
            Meta diária: R$ {goalLine.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data, previousData, previousTotal, goal }: RevenueChartProps) {
  const now = new Date();
  const totalDaysInMonth = getDaysInMonth(now);
  const currentDay = getDate(now);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Build a map of actual data by day-of-month
  const dataByDay: Record<number, number> = {};
  for (const d of data) {
    try {
      const parts = d.data.substring(0, 10).split("-");
      const day = parseInt(parts[2], 10);
      if (!isNaN(day)) {
        dataByDay[day] = (dataByDay[day] || 0) + d.faturamento;
      }
    } catch {}
  }

  // Previous month data by day index
  const prevByDay: Record<number, number> = {};
  if (previousData) {
    for (const d of previousData) {
      try {
        const parts = d.data.substring(0, 10).split("-");
        const day = parseInt(parts[2], 10);
        if (!isNaN(day)) {
          prevByDay[day] = (prevByDay[day] || 0) + d.faturamento;
        }
      } catch {}
    }
  }

  // Calculate daily average for projection
  const daysWithData = Object.keys(dataByDay).length;
  const totalRevenue = Object.values(dataByDay).reduce((s, v) => s + v, 0);
  const dailyAvg = daysWithData > 0 ? totalRevenue / currentDay : 0;

  // Goal daily target
  const metaDiaria = goal && goal > 0 ? goal / totalDaysInMonth : undefined;

  // Build full month chart data (all days 1..totalDaysInMonth)
  const fullMonthData = Array.from({ length: totalDaysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${String(day).padStart(2, "0")}/${String(currentMonth + 1).padStart(2, "0")}`;
    const hasActual = day <= currentDay && dataByDay[day] !== undefined;
    const isToday = day === currentDay;
    const isFuture = day > currentDay;

    return {
      data: dateStr,
      faturamento: hasActual || (day <= currentDay && dataByDay[day] !== undefined) ? (dataByDay[day] || 0) : (day <= currentDay ? (dataByDay[day] ?? 0) : undefined),
      projecao: isFuture ? dailyAvg : (isToday ? (dataByDay[day] || 0) : undefined),
      prevFaturamento: prevByDay[day] ?? undefined,
      metaDiaria: metaDiaria,
    };
  });

  // Clean up: for days <= currentDay with no data, set faturamento to 0 (they existed but had no sales)
  for (const point of fullMonthData) {
    const dayNum = parseInt(point.data.split("/")[0], 10);
    if (dayNum <= currentDay && point.faturamento === undefined) {
      point.faturamento = 0;
    }
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground gap-3">
        <div className="w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium">Nenhum dado no período</p>
        <p className="text-xs text-muted-foreground/70">Importe dados para visualizar a evolução</p>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={fullMonthData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <XAxis
            dataKey="data"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fill: "hsl(0, 0%, 45%)" }}
            dy={8}
            interval={Math.floor(totalDaysInMonth / 10)}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(0, 0%, 45%)" }}
            tickFormatter={formatYAxis}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Meta diária line */}
          {metaDiaria && (
            <Line
              type="monotone"
              dataKey="metaDiaria"
              stroke="#10b981"
              strokeWidth={1}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
            />
          )}

          {/* Previous month */}
          <Line
            type="monotone"
            dataKey="prevFaturamento"
            stroke="#666666"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={false}
          />

          {/* Actual revenue area */}
          <Area
            type="monotone"
            dataKey="faturamento"
            stroke="#F97316"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorFaturamento)"
            connectNulls={false}
          />

          {/* Projection line */}
          <Line
            type="monotone"
            dataKey="projecao"
            stroke="#F97316"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeOpacity={0.5}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-3 sm:gap-4 mt-2 justify-center flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#F97316] rounded-full" />
          <span className="text-[10px] text-muted-foreground">Atual</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 border-t-2 border-dashed border-[#F97316]/50" />
          <span className="text-[10px] text-muted-foreground">Projeção</span>
        </div>
        {previousData && previousData.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 border-t border-dashed border-[#666666]" />
            <span className="text-[10px] text-muted-foreground">Mês anterior</span>
          </div>
        )}
        {metaDiaria && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 border-t border-dashed border-emerald-500" />
            <span className="text-[10px] text-muted-foreground">Meta diária</span>
          </div>
        )}
      </div>
    </div>
  );
}
