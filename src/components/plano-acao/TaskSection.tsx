import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";
import { Task, TaskStatus } from "@/hooks/useTasks";
import { CheckCircle2, Circle } from "lucide-react";

interface TaskSectionProps {
  section: string;
  tasks: Task[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDueDateChange: (taskId: string, date: string | null) => void;
  onReorder: (section: string, orderedIds: string[]) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function TaskSection({
  section,
  tasks,
  onStatusChange,
  onDueDateChange,
  onReorder,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}: TaskSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedTasks = useMemo(() => 
    [...tasks].sort((a, b) => a.order_index - b.order_index),
    [tasks]
  );

  const completedCount = tasks.filter(t => t.status === 'concluida').length;
  const nonCanceledCount = tasks.filter(t => t.status !== 'cancelada').length;
  const allCompleted = nonCanceledCount > 0 && completedCount === nonCanceledCount;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = sortedTasks.findIndex(t => t.id === active.id);
      const newIndex = sortedTasks.findIndex(t => t.id === over.id);
      
      const newOrder = arrayMove(sortedTasks, oldIndex, newIndex);
      onReorder(section, newOrder.map(t => t.id));
    }
  };

  if (tasks.length === 0) return null;

  return (
    <AccordionItem value={section} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center gap-3">
          {allCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="font-semibold text-left">{section}</span>
          <Badge variant="secondary" className="ml-2">
            {completedCount}/{nonCanceledCount}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedTasks.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {sortedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={onStatusChange}
                  onDueDateChange={onDueDateChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </AccordionContent>
    </AccordionItem>
  );
}
