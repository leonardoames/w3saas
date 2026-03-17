import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, List, Columns, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, Task, TaskStatus } from "@/hooks/useTasks";
import { DashboardTab } from "@/components/plano-acao/DashboardTab";
import { ListView } from "@/components/plano-acao/ListView";
import { KanbanView } from "@/components/plano-acao/KanbanView";
import { TimelineView } from "@/components/plano-acao/TimelineView";
import { ActionDrawer } from "@/components/plano-acao/ActionDrawer";
import { MiroEmbed } from "@/components/plano-acao/MiroEmbed";
import { AuditoriasTab } from "@/components/plano-acao/AuditoriasTab";
import { Diagnostico360Tab } from "@/components/plano-acao/Diagnostico360Tab";
import { UserResourcesTab } from "@/components/plano-acao/UserResourcesTab";

type PlanView = "list" | "kanban" | "timeline";

export default function PlanoAcao() {
  const { user, isAdmin, hasRole } = useAuth();
  const isStaff = isAdmin || hasRole("master") || hasRole("tutor") || hasRole("cs");
  const canEditDiag = isAdmin || hasRole("master") || hasRole("tutor");

  const {
    tasks,
    loading,
    updateTaskStatus,
    updateTask,
    deleteTask,
  } = useTasks();

  const [planView, setPlanView] = useState<PlanView>("list");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    updateTaskStatus(taskId, status);
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status } : prev);
    }
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    if (selectedTask?.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, ...updates } : prev);
    }
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
        <h1 className="page-title">Plano de Ação</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe e execute as ações do seu plano de consultoria
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="flex w-full h-auto flex-wrap gap-1">
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
          <TabsTrigger value="plano" className="text-xs sm:text-sm">Plano de Ação</TabsTrigger>
          <TabsTrigger value="mapa-mental" className="text-xs sm:text-sm">Mapa Mental</TabsTrigger>
          <TabsTrigger value="auditorias" className="text-xs sm:text-sm">Auditorias</TabsTrigger>
          <TabsTrigger value="diagnostico" className="text-xs sm:text-sm">Diagnóstico 360</TabsTrigger>
          <TabsTrigger value="recursos" className="text-xs sm:text-sm">Recursos</TabsTrigger>
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab tasks={tasks} userId={user?.id || ""} canEdit={isStaff} />
        </TabsContent>

        {/* Plano de Ação */}
        <TabsContent value="plano" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant={planView === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setPlanView("list")}
              >
                <List className="h-3.5 w-3.5 mr-1.5" />
                Lista
              </Button>
              <Button
                variant={planView === "kanban" ? "default" : "outline"}
                size="sm"
                onClick={() => setPlanView("kanban")}
              >
                <Columns className="h-3.5 w-3.5 mr-1.5" />
                Kanban
              </Button>
              <Button
                variant={planView === "timeline" ? "default" : "outline"}
                size="sm"
                onClick={() => setPlanView("timeline")}
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Timeline
              </Button>
            </div>

            {planView === "list" && (
              <ListView tasks={tasks} onTaskClick={handleTaskClick} />
            )}
            {planView === "kanban" && (
              <KanbanView
                tasks={tasks}
                onTaskClick={handleTaskClick}
                onStatusChange={handleStatusChange}
              />
            )}
            {planView === "timeline" && (
              <TimelineView tasks={tasks} onTaskClick={handleTaskClick} />
            )}
          </div>
        </TabsContent>

        {/* Mapa Mental */}
        <TabsContent value="mapa-mental" className="mt-6">
          <MiroEmbed />
        </TabsContent>

        {/* Auditorias */}
        <TabsContent value="auditorias" className="mt-6">
          <AuditoriasTab userId={user?.id || ""} canEdit={isStaff} />
        </TabsContent>

        {/* Diagnóstico 360 */}
        <TabsContent value="diagnostico" className="mt-6">
          <Diagnostico360Tab userId={user?.id || ""} canEdit={canEditDiag} />
        </TabsContent>

        {/* Recursos */}
        <TabsContent value="recursos" className="mt-6">
          <UserResourcesTab />
        </TabsContent>
      </Tabs>

      <ActionDrawer
        task={selectedTask}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusChange={handleStatusChange}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={isStaff ? deleteTask : undefined}
        canEditTask={isStaff}
      />
    </div>
  );
}
