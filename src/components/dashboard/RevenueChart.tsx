import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, ComposedChart, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";

interface ChartData {
  data: string;
  faturamento: number;
}

interface PreviousData {
  data: string;
  faturamento: number;
}

interface RevenueChartProps {
  data: ChartData[];
  previousData?: PreviousData[];
  previousTotal?: number;
}

const formatYAxis = (value: number) => {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const current = payload.find((p: any) => p.dataKey === "faturamento");
    const prev = payload.find((p: any) => p.dataKey === "prevFaturamento");
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
        {current && (
          <p className="text-sm font-bold text-foreground">
            Atual: R$ {current.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        )}
        {prev && prev.value != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Mês ant.: R$ {prev.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data, previousData, previousTotal }: RevenueChartProps) {
  // Merge current and previous data by index (day position)
  const chartData = data.map((m, i) => ({
    data: format(parseISO(m.data), "dd/MM", { locale: ptBR }),
    faturamento: m.faturamento,
    prevFaturamento: previousData && previousData[i] ? previousData[i].faturamento : undefined,
  }));

  if (chartData.length === 0) {
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
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
            tick={{ fontSize: 10, fill: "hsl(0, 0%, 45%)" }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(0, 0%, 45%)" }}
            tickFormatter={formatYAxis}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="faturamento"
            stroke="#F97316"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorFaturamento)"
          />
          <Line
            type="monotone"
            dataKey="prevFaturamento"
            stroke="#666666"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {previousData && previousData.length > 0 && (
        <div className="flex items-center gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-[#F97316] rounded-full" />
            <span className="text-[10px] text-muted-foreground">Período atual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 border-t border-dashed border-[#666666]" />
            <span className="text-[10px] text-muted-foreground">Mês anterior</span>
          </div>
        </div>
      )}
    </div>
  );
}
