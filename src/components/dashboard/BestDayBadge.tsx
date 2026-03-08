import { parseISO, getDay } from "date-fns";
import { TrendingUp } from "lucide-react";

interface BestDayBadgeProps {
  data: { data: string; receita_paga: number }[];
}

const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function BestDayBadge({ data }: BestDayBadgeProps) {
  if (data.length < 7) return null;

  const dayTotals: Record<number, { sum: number; count: number }> = {};
  for (const d of data) {
    const dow = getDay(parseISO(d.data));
    if (!dayTotals[dow]) dayTotals[dow] = { sum: 0, count: 0 };
    dayTotals[dow].sum += d.receita_paga;
    dayTotals[dow].count += 1;
  }

  let bestDay = 0;
  let bestAvg = 0;
  for (const [dow, v] of Object.entries(dayTotals)) {
    const avg = v.count > 0 ? v.sum / v.count : 0;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestDay = Number(dow);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
      <TrendingUp className="h-3 w-3" />
      Melhor dia: {dayNames[bestDay]}
    </span>
  );
}
