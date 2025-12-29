import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Plus, 
  Search, 
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useTasks, SECTIONS, Task } from "@/hooks/useTasks";
import { ProgressCard } from "@/components/plano-acao/ProgressCard";
import { TaskSection } from "@/components/plano-acao/TaskSection";
import { AddTaskDialog } from "@/components/plano-acao/AddTaskDialog";

interface UserProfile {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

export default function AdminPlanoAcao() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .order('email');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = search.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower)
    );
  });

  if (selectedUser) {
    return (
      <AdminLayout>
        <UserPlanView 
          user={selectedUser} 
          onBack={() => setSelectedUser(null)} 
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Planos de Ação</h2>
          <p className="text-muted-foreground">
            Selecione um usuário para gerenciar seu plano de ação
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredUsers.map((user) => (
                  <Button
                    key={user.user_id}
                    variant="outline"
                    className="justify-start h-auto py-3"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="text-left">
                      <div className="font-medium">
                        {user.full_name || 'Sem nome'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </Button>
                ))}
                
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum usuário encontrado
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

// Component for viewing/editing a user's plan
function UserPlanView({ user, onBack }: { user: UserProfile; onBack: () => void }) {
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
  } = useTasks(user.user_id);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

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

  const handleAddToSection = (section: string) => {
    setSelectedSection(section);
    setEditTask(null);
    setAddDialogOpen(true);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{user.full_name || user.email}</h2>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <ProgressCard 
        completed={completedCount} 
        total={totalCount} 
        progress={progress} 
      />

      <Tabs defaultValue="ames" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ames">Plano AMES</TabsTrigger>
          <TabsTrigger value="custom">Personalizado</TabsTrigger>
        </TabsList>

        <TabsContent value="ames" className="mt-6">
          <div className="space-y-4">
            {SECTIONS.map(section => (
              <div key={section}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{section}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleAddToSection(section)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar
                  </Button>
                </div>
                {tasksBySection[section].length > 0 ? (
                  <Accordion type="multiple" defaultValue={[section]} className="space-y-2">
                    <TaskSection
                      section={section}
                      tasks={tasksBySection[section]}
                      onStatusChange={updateTaskStatus}
                      onDueDateChange={updateTaskDueDate}
                      onReorder={reorderTasks}
                      onEdit={handleEditTask}
                      onDelete={deleteTask}
                      canEdit={true}
                      canDelete={true}
                    />
                  </Accordion>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-4 text-center text-sm text-muted-foreground">
                      Nenhuma tarefa nesta seção
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          <div className="mb-4">
            <Button onClick={() => {
              setSelectedSection('Personalizado');
              setEditTask(null);
              setAddDialogOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar ação personalizada
            </Button>
          </div>

          {personalTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium text-muted-foreground">
                  Nenhuma ação personalizada ainda
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
                onDelete={deleteTask}
                canEdit={true}
                canDelete={true}
              />
            </Accordion>
          )}
        </TabsContent>
      </Tabs>

      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setEditTask(null);
            setSelectedSection(null);
          }
        }}
        onSubmit={handleSubmitTask}
        userId={user.user_id}
        origin="admin"
        defaultSection={selectedSection || undefined}
        editTask={editTask}
        isAdmin={true}
      />
    </div>
  );
}
