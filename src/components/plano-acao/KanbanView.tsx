import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Star } from "lucide-react";
import type { Task, TaskStatus } from "@/hooks/useTasks";

const COLUMNS: { status: TaskStatus; label: string; colorClass: string }[] = [
  { status: "a_fazer", label: "Não Iniciado", colorClass: "border-muted" },
  { status: "em_andamento", label: "Em Andamento", colorClass: "border-blue-400" },
  { status: "concluida", label: "Concluído", colorClass: "border-green-400" },
];

const PRIORITY_COLORS: Record<string, string> = {
  Alta: "text-destructive border-destructive/30",
  Média: "text-yellow-600 border-yellow-300 dark:text-yellow-400",
  Baixa: "text-muted-foreground",
};

interface KanbanViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

export function KanbanView({ tasks, onTaskClick, onStatusChange }: KanbanViewProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDragging(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(status);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (dragging) {
      const task = tasks.find(t => t.id === dragging);
      if (task && task.status !== status) {
        onStatusChange(dragging, status);
      }
    }
    setDragging(null);
    setDragOver(null);
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status);
        const isDragTarget = dragOver === col.status;
        return (
          <div
            key={col.status}
            onDragOver={e => handleDragOver(e, col.status)}
            onDrop={e => handleDrop(e, col.status)}
            className={`rounded-lg border-2 transition-colors min-h-[300px] ${
              isDragTarget ? "border-primary bg-primary/5" : `${col.colorClass} bg-muted/20`
            }`}
          >
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
              </div>
            </div>
            <div className="p-2 space-y-2">
              {colTasks.map(task => {
                const isOverdue = task.due_date && task.due_date < today && task.status !== "concluida" && task.status !== "cancelada";
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onTaskClick(task)}
                    className={`rounded-md border bg-background p-3 cursor-pointer hover:shadow-sm transition-all select-none ${
                      dragging === task.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      {task.is_next_action && (
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                      )}
                      <p className={`text-sm font-medium leading-snug ${task.status === "concluida" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                    </div>
                    {task.section && (
                      <p className="text-xs text-muted-foreground mt-1">{task.section}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.priority && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </Badge>
                      )}
                      {isOverdue && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Atrasada</Badge>
                      )}
                      {task.due_date && (
                        <span className={`text-[10px] ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                          {new Date(task.due_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </div>
                    {task.checklist.length > 0 && (() => {
                      const checked = task.checklist.filter(i => i.checked).length;
                      const pct = (checked / task.checklist.length) * 100;
                      return (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] text-muted-foreground">{checked}/{task.checklist.length}</span>
                            <span className="text-[10px] text-muted-foreground">{Math.round(pct)}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-primary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
              {colTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
                  <AlertCircle className="h-6 w-6 mb-1" />
                  <p className="text-xs">Sem ações</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
