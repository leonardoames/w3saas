import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Calendar, ChevronRight, Lock, Star } from "lucide-react";
import type { Task, TaskStatus } from "@/hooks/useTasks";

const STATUS_LABELS: Record<TaskStatus, string> = {
  a_fazer: "A Fazer",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  a_fazer: "bg-muted text-muted-foreground",
  em_andamento: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  concluida: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelada: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  Alta: "text-destructive border-destructive/30",
  Média: "text-yellow-600 border-yellow-300 dark:text-yellow-400",
  Baixa: "text-muted-foreground",
};

interface ListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

function isSprintComplete(tasks: Task[], sprint: number): boolean {
  const sprintTasks = tasks.filter(t => t.sprint === sprint && t.status !== "cancelada");
  return sprintTasks.length > 0 && sprintTasks.every(t => t.status === "concluida");
}

function TaskCard({ task, locked, onTaskClick, today }: {
  task: Task;
  locked: boolean;
  onTaskClick: (t: Task) => void;
  today: string;
}) {
  const isOverdue = task.due_date && task.due_date < today && task.status !== "concluida" && task.status !== "cancelada";

  return (
    <button
      onClick={() => !locked && onTaskClick(task)}
      className={`w-full text-left ${locked ? "cursor-not-allowed" : ""}`}
      disabled={locked}
    >
      <Card className={`transition-colors ${locked ? "opacity-50" : "hover:bg-accent/40 cursor-pointer"}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {task.is_next_action && (
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                )}
                <span className={`text-sm font-medium ${task.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                  {task.title}
                </span>
                {task.priority && (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                  </Badge>
                )}
                {isOverdue && !locked && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Atrasada</Badge>
                )}
              </div>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
              )}
              {task.checklist.length > 0 && (() => {
                const checked = task.checklist.filter(i => i.checked).length;
                const pct = (checked / task.checklist.length) * 100;
                return (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{checked}/{task.checklist.length}</span>
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {task.due_date && (
                <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              )}
              {!locked && (
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[task.status]}`}>
                  {STATUS_LABELS[task.status]}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

export function ListView({ tasks, onTaskClick }: ListViewProps) {
  const today = new Date().toISOString().split("T")[0];

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma ação no plano ainda</p>
          <p className="mt-1 text-xs text-muted-foreground">Seu tutor irá adicionar as primeiras ações em breve.</p>
        </CardContent>
      </Card>
    );
  }

  const withSprint = tasks.filter(t => t.sprint !== null && t.sprint !== undefined);
  const withoutSprint = tasks.filter(t => t.sprint === null || t.sprint === undefined);
  const sprints = [...new Set(withSprint.map(t => t.sprint as number))].sort((a, b) => a - b);

  // Group no-sprint tasks by section
  const noSprintSections: Record<string, Task[]> = {};
  withoutSprint.forEach(t => {
    const sec = t.section || "Geral";
    if (!noSprintSections[sec]) noSprintSections[sec] = [];
    noSprintSections[sec].push(t);
  });

  return (
    <div className="space-y-6">
      {sprints.map((sprint, idx) => {
        const sprintTasks = withSprint.filter(t => t.sprint === sprint);
        const previousComplete = idx === 0 || isSprintComplete(tasks, sprints[idx - 1]);
        const isLocked = !previousComplete;
        const nonCanceled = sprintTasks.filter(t => t.status !== "cancelada");
        const completed = nonCanceled.filter(t => t.status === "concluida").length;
        const pct = nonCanceled.length > 0 ? (completed / nonCanceled.length) * 100 : 0;

        // Group by section within sprint
        const sections: Record<string, Task[]> = {};
        sprintTasks.forEach(t => {
          const sec = t.section || "Geral";
          if (!sections[sec]) sections[sec] = [];
          sections[sec].push(t);
        });

        return (
          <div key={sprint} className="space-y-3">
            <div className={`flex items-center gap-3 pb-2 border-b ${isLocked ? "opacity-70" : ""}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  <h3 className="text-sm font-semibold">Sprint {sprint}</h3>
                  {isLocked && (
                    <Badge variant="outline" className="text-[10px] px-1.5">Bloqueado</Badge>
                  )}
                  {pct === 100 && !isLocked && (
                    <Badge className="text-[10px] px-1.5 bg-green-100 text-green-700 border-green-200 border">Concluído ✓</Badge>
                  )}
                </div>
                {isLocked && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Complete o Sprint {sprints[idx - 1]} antes de prosseguir
                  </p>
                )}
              </div>
              {nonCanceled.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{completed}/{nonCanceled.length}</span>
                </div>
              )}
            </div>

            {Object.entries(sections).map(([section, sectionTasks]) => (
              <div key={section} className="space-y-2">
                {Object.keys(sections).length > 1 && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pl-1">{section}</p>
                )}
                {sectionTasks.map(task => (
                  <TaskCard key={task.id} task={task} locked={isLocked} onTaskClick={onTaskClick} today={today} />
                ))}
              </div>
            ))}
          </div>
        );
      })}

      {/* Tasks without sprint, grouped by section */}
      {Object.keys(noSprintSections).length > 0 && (
        <div className="space-y-4">
          {sprints.length > 0 && (
            <div className="flex items-center gap-3 pb-2 border-b">
              <h3 className="text-sm font-semibold text-muted-foreground">Outras Ações</h3>
            </div>
          )}
          {Object.entries(noSprintSections).map(([section, sectionTasks]) => (
            <div key={section} className="space-y-2">
              {Object.keys(noSprintSections).length > 1 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pl-1">{section}</p>
              )}
              {sectionTasks.map(task => (
                <TaskCard key={task.id} task={task} locked={false} onTaskClick={onTaskClick} today={today} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
