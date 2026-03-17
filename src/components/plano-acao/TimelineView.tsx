import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import type { Task } from "@/hooks/useTasks";

interface TimelineViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

function getStatusColor(status: Task["status"]) {
  switch (status) {
    case "concluida": return "bg-green-500";
    case "em_andamento": return "bg-blue-500";
    case "cancelada": return "bg-muted-foreground/30";
    default: return "bg-slate-400";
  }
}

export function TimelineView({ tasks, onTaskClick }: TimelineViewProps) {
  // Only tasks with both start_date and due_date
  const timedTasks = useMemo(
    () => tasks.filter(t => t.start_date && t.due_date),
    [tasks]
  );

  if (timedTasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma ação com data de início e prazo definidos
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Defina start_date e due_date para ver no cronograma
          </p>
        </CardContent>
      </Card>
    );
  }

  // Compute timeline range
  const allDates = timedTasks.flatMap(t => [new Date(t.start_date!), new Date(t.due_date!)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

  // Snap to month boundaries
  const rangeStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const rangeEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
  const totalDays = Math.max(1, (rangeEnd.getTime() - rangeStart.getTime()) / 86400000);

  // Build month headers
  const months: { label: string; leftPct: number; widthPct: number }[] = [];
  let cur = new Date(rangeStart);
  while (cur <= rangeEnd) {
    const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const startMs = Math.max(monthStart.getTime(), rangeStart.getTime());
    const endMs = Math.min(monthEnd.getTime(), rangeEnd.getTime());
    const leftPct = ((startMs - rangeStart.getTime()) / (totalDays * 86400000)) * 100;
    const widthPct = ((endMs - startMs) / (totalDays * 86400000)) * 100;
    months.push({
      label: new Date(cur).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      leftPct,
      widthPct,
    });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  // Group tasks by section
  const sectionMap = new Map<string, Task[]>();
  timedTasks.forEach(t => {
    const s = t.section || "Sem seção";
    if (!sectionMap.has(s)) sectionMap.set(s, []);
    sectionMap.get(s)!.push(t);
  });

  const getBarProps = (task: Task) => {
    const start = new Date(task.start_date!).getTime();
    const end = new Date(task.due_date!).getTime();
    const leftPct = ((start - rangeStart.getTime()) / (totalDays * 86400000)) * 100;
    const widthPct = Math.max(((end - start) / (totalDays * 86400000)) * 100, 1);
    return { leftPct: Math.max(0, leftPct), widthPct: Math.min(widthPct, 100 - Math.max(0, leftPct)) };
  };

  return (
    <div className="space-y-4 overflow-x-auto">
      {/* Month header */}
      <div className="relative h-6 min-w-[600px]">
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute text-[10px] text-muted-foreground border-l border-border/40 pl-1"
            style={{ left: `${m.leftPct}%`, width: `${m.widthPct}%` }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Rows per section */}
      {Array.from(sectionMap.entries()).map(([section, sectionTasks]) => (
        <div key={section} className="min-w-[600px]">
          <p className="text-xs font-medium text-muted-foreground mb-1">{section}</p>
          <div className="space-y-1.5">
            {sectionTasks.map(task => {
              const { leftPct, widthPct } = getBarProps(task);
              const colorClass = getStatusColor(task.status);
              return (
                <div key={task.id} className="relative h-7 w-full">
                  {/* Grid lines */}
                  {months.map((m, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-l border-border/20"
                      style={{ left: `${m.leftPct}%` }}
                    />
                  ))}
                  <button
                    onClick={() => onTaskClick(task)}
                    className={`absolute h-full rounded flex items-center px-2 text-white text-xs font-medium truncate hover:opacity-90 transition-opacity ${colorClass}`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={task.title}
                  >
                    {widthPct > 5 && task.title}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
