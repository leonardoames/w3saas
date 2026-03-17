import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Calendar, ChevronRight } from "lucide-react";
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

export function ListView({ tasks, onTaskClick }: ListViewProps) {
  const today = new Date().toISOString().split("T")[0];

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma ação no plano ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => {
        const isOverdue = task.due_date && task.due_date < today && task.status !== "concluida" && task.status !== "cancelada";
        return (
          <button
            key={task.id}
            onClick={() => onTaskClick(task)}
            className="w-full text-left"
          >
            <Card className="hover:bg-accent/40 transition-colors cursor-pointer">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium truncate ${task.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </span>
                      {task.priority && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </Badge>
                      )}
                      {isOverdue && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Atrasada</Badge>
                      )}
                    </div>
                    {task.section && (
                      <p className="text-xs text-muted-foreground mt-0.5">{task.section}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.due_date && (
                      <span className={`flex items-center gap-1 text-xs ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                        <Calendar className="h-3 w-3" />
                        {new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_COLORS[task.status]}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
