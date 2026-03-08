import { getDaysInMonth, getDate } from "date-fns";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface MonthProjectionProps {
  currentRevenue: number;
  goal: number | null;
}

export function MonthProjection({ currentRevenue, goal }: MonthProjectionProps) {
  if (!goal || goal <= 0) return null;

  const today = new Date();
  const daysPassed = getDate(today);
  const totalDays = getDaysInMonth(today);
  const dailyAvg = daysPassed > 0 ? currentRevenue / daysPassed : 0;
  const projection = dailyAvg * totalDays;
  const onTrack = projection >= goal;
  const gap = goal - projection;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 -mt-3">
      <span className="text-[11px] text-muted-foreground">
        Projeção: <span className="font-semibold text-foreground">{projection.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
        {" / "}Meta: {goal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </span>
      {onTrack ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
          <CheckCircle2 className="h-3 w-3" /> No caminho certo
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-yellow-500">
          <AlertTriangle className="h-3 w-3" /> Faltam {Math.abs(gap).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} para bater a meta
        </span>
      )}
    </div>
  );
}
