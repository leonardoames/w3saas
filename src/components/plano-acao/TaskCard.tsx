import { useState } from "react";
import { format, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Calendar as CalendarIcon, 
  GripVertical, 
  MoreVertical,
  RotateCcw,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Task, TaskStatus } from "@/hooks/useTasks";

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDueDateChange: (taskId: string, date: string | null) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isDraggable?: boolean;
}

export function TaskCard({
  task,
  onStatusChange,
  onDueDateChange,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  isDraggable = true,
}: TaskCardProps) {
  const [dateOpen, setDateOpen] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = task.status === 'concluida';
  const isCanceled = task.status === 'cancelada';
  const isOverdue = task.due_date && !isCompleted && !isCanceled && isPast(parseISO(task.due_date));

  const handleCheckboxChange = () => {
    if (isCompleted) {
      onStatusChange(task.id, 'a_fazer');
    } else {
      onStatusChange(task.id, 'concluida');
    }
  };

  const priorityColors: Record<string, string> = {
    Baixa: "bg-muted text-muted-foreground",
    Média: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
    Alta: "bg-destructive/20 text-destructive",
  };

  const originLabels: Record<string, string> = {
    sistema: "Plano AMES",
    admin: "Tutor",
    mentorado: "Personalizado",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className={cn(
          "transition-all",
          isDragging && "opacity-50 ring-2 ring-primary",
          (isCompleted || isCanceled) && "opacity-60",
        )}
      >
        <CardContent className="flex items-start gap-3 p-4">
          {isDraggable && (
            <button
              {...attributes}
              {...listeners}
              className="mt-1 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleCheckboxChange}
            disabled={isCanceled}
            className="mt-1"
          />

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span 
                className={cn(
                  "font-medium",
                  (isCompleted || isCanceled) && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </span>
              
              {task.priority && (
                <Badge className={priorityColors[task.priority]} variant="secondary">
                  {task.priority}
                </Badge>
              )}
              
              {isCanceled && (
                <Badge variant="outline" className="text-muted-foreground">
                  Cancelada
                </Badge>
              )}
              
              {isOverdue && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Atrasada
                </Badge>
              )}
            </div>

            {task.description && (
              <p className={cn(
                "text-sm text-muted-foreground",
                (isCompleted || isCanceled) && "line-through"
              )}>
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "h-7 gap-1 px-2 text-muted-foreground hover:text-foreground",
                      isOverdue && "text-destructive hover:text-destructive"
                    )}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {task.due_date 
                      ? format(parseISO(task.due_date), "dd/MM/yyyy", { locale: ptBR })
                      : "Definir prazo"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={task.due_date ? parseISO(task.due_date) : undefined}
                    onSelect={(date) => {
                      onDueDateChange(task.id, date ? format(date, 'yyyy-MM-dd') : null);
                      setDateOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                  {task.due_date && (
                    <div className="border-t p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          onDueDateChange(task.id, null);
                          setDateOpen(false);
                        }}
                      >
                        Remover prazo
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <span className="text-xs text-muted-foreground">
                {originLabels[task.origin]}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isCompleted && !isCanceled && (
                <DropdownMenuItem onClick={() => onStatusChange(task.id, 'concluida')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Marcar como concluída
                </DropdownMenuItem>
              )}
              
              {!isCanceled && (
                <DropdownMenuItem onClick={() => onStatusChange(task.id, 'cancelada')}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar / Não se aplica
                </DropdownMenuItem>
              )}
              
              {(isCompleted || isCanceled) && (
                <DropdownMenuItem onClick={() => onStatusChange(task.id, 'a_fazer')}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Voltar para A Fazer
                </DropdownMenuItem>
              )}

              {(canEdit || canDelete) && <DropdownMenuSeparator />}

              {canEdit && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  Editar tarefa
                </DropdownMenuItem>
              )}

              {canDelete && onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(task.id)}
                  className="text-destructive focus:text-destructive"
                >
                  Excluir tarefa
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>
    </div>
  );
}
