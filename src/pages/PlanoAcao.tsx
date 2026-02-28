import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, SECTIONS, Task } from "@/hooks/useTasks";
import { ProgressCard } from "@/components/plano-acao/ProgressCard";
import { TaskSection } from "@/components/plano-acao/TaskSection";
import { AddTaskDialog } from "@/components/plano-acao/AddTaskDialog";
import { MiroEmbed } from "@/components/plano-acao/MiroEmbed";

export default function PlanoAcao() {
  const { user, profile } = useAuth();
  const { 
    tasks, 
    loading, 
    progress, 
    completedCount, 
    totalCount,
    updateTaskStatus,
    updateTaskDueDate,
    createTask,
    updateTask,
    deleteTask,
    reorderTasks,
  } = useTasks();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  // Separate tasks by type
  const amesTasks = useMemo(() => 
    tasks.filter(t => t.origin !== 'mentorado'),
    [tasks]
  );

  const personalTasks = useMemo(() => 
    tasks.filter(t => t.origin === 'mentorado'),
    [tasks]
  );

  // Group AMES tasks by section
  const tasksBySection = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    SECTIONS.forEach(section => {
      grouped[section] = amesTasks.filter(t => t.section === section);
    });
    return grouped;
  }, [amesTasks]);

  const handleSubmitTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    if (editTask) {
      await updateTask(editTask.id, taskData);
      setEditTask(null);
      return editTask;
    } else {
      return await createTask(taskData);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditTask(task);
    setAddDialogOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Plano de Ação</h1>
        <p className="mt-2 text-muted-foreground">
          Acompanhe as tarefas do seu plano e mantenha tudo organizado
        </p>
      </div>

      <ProgressCard 
        completed={completedCount} 
        total={totalCount} 
        progress={progress} 
      />

      <Tabs defaultValue="ames" className="w-full">
        <TabsList className={`grid w-full ${profile?.is_mentorado ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="ames">Plano AMES</TabsTrigger>
          <TabsTrigger value="custom">Personalizado</TabsTrigger>
          {profile?.is_mentorado && (
            <TabsTrigger value="mapa-mental">Mapa Mental</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="ames" className="mt-6">
          {amesTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhuma tarefa do Plano AMES ainda
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  As tarefas serão adicionadas pelo seu tutor
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" defaultValue={SECTIONS.slice()} className="space-y-2">
              {SECTIONS.map(section => (
                <TaskSection
                  key={section}
                  section={section}
                  tasks={tasksBySection[section]}
                  onStatusChange={updateTaskStatus}
                  onDueDateChange={updateTaskDueDate}
                  onReorder={reorderTasks}
                />
              ))}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <div className="mb-4">
            <Button onClick={() => {
              setEditTask(null);
              setAddDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar ação
            </Button>
          </div>

          {personalTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhuma ação personalizada ainda
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Clique em "Adicionar ação" para criar suas próprias tarefas
                </p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" defaultValue={["Personalizado"]} className="space-y-2">
              <TaskSection
                section="Personalizado"
                tasks={personalTasks.map(t => ({ ...t, section: 'Personalizado' }))}
                onStatusChange={updateTaskStatus}
                onDueDateChange={updateTaskDueDate}
                onReorder={reorderTasks}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                canEdit={true}
                canDelete={true}
              />
            </Accordion>
          )}
        </TabsContent>

        {profile?.is_mentorado && (
          <TabsContent value="mapa-mental" className="mt-6">
            <MiroEmbed />
          </TabsContent>
        )}
      </Tabs>

      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) setEditTask(null);
        }}
        onSubmit={handleSubmitTask}
        userId={user?.id || ''}
        origin="mentorado"
        defaultSection="Personalizado"
        editTask={editTask}
      />
    </div>
  );
}
