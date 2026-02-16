import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ChartData {
  data: string;
  faturamento: number;
}

interface RevenueChartProps {
  data: ChartData[];
  previousTotal?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-bold text-foreground">
          R$ {payload[0].value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

export function RevenueChart({ data, previousTotal }: RevenueChartProps) {
  const chartData = data.map(m => ({
    data: format(parseISO(m.data), "dd/MM", { locale: ptBR }),
    faturamento: m.faturamento,
  }));

  const currentTotal = data.reduce((sum, d) => sum + d.faturamento, 0);
  const changePercent = previousTotal && previousTotal > 0
    ? ((currentTotal - previousTotal) / previousTotal) * 100
    : undefined;
  const isUp = changePercent !== undefined && changePercent >= 0;

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground gap-3">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
          <TrendingUp className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium">Nenhum dado no período</p>
        <p className="text-xs text-muted-foreground/70">Importe dados para visualizar a evolução</p>
      </div>
    );
  }

  return (
    <div>
      {/* Trend indicator */}
      {changePercent !== undefined && (
        <div className="flex items-center gap-2 mb-4">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
            isUp ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
          }`}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isUp ? '+' : ''}{changePercent.toFixed(1)}% vs período anterior
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(27, 92%, 52%)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="hsl(27, 92%, 52%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="data" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "hsl(0, 0%, 40%)" }}
            dy={10}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="faturamento"
            stroke="hsl(27, 92%, 52%)"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorFaturamento)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
