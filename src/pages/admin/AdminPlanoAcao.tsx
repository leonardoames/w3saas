import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Search,
  AlertCircle,
  ArrowLeft,
  Trash2,
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
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Gestão de Planos de Ação</h2>
          <p className="text-sm text-muted-foreground">
            Selecione um usuário para gerenciar seu plano de ação
          </p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
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
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="text-left w-full">
                      <div className="font-medium">
                        {user.full_name || 'Sem nome'}
                      </div>
                      <div className="text-sm text-muted-foreground break-all">
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

const MIRO_PREFIX = "https://miro.com/app/live-embed/";
const SRC_REGEX = /src="([^"]+)"/;

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

  // Miro embed state
  const [embedSrc, setEmbedSrc] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEmbed = async () => {
      const { data } = await supabase
        .from("miro_embeds")
        .select("embed_src")
        .eq("user_id", user.user_id)
        .maybeSingle();
      if (data?.embed_src) {
        setEmbedSrc(data.embed_src);
        setInputValue(data.embed_src);
      }
    };
    fetchEmbed();
  }, [user.user_id]);

  const handleSaveEmbed = async () => {
    const srcMatch = SRC_REGEX.exec(inputValue);
    const extracted = srcMatch ? srcMatch[1] : inputValue.trim();

    if (!extracted.startsWith(MIRO_PREFIX)) {
      toast({
        title: "URL inválida",
        description: "O src deve começar com https://miro.com/app/live-embed/",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("miro_embeds")
      .upsert({ user_id: user.user_id, embed_src: extracted }, { onConflict: "user_id" });
    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar embed", variant: "destructive" });
    } else {
      setEmbedSrc(extracted);
      toast({ title: "Embed salvo com sucesso!" });
    }
  };

  const handleRemoveEmbed = async () => {
    const { error } = await supabase
      .from("miro_embeds")
      .delete()
      .eq("user_id", user.user_id);

    if (error) {
      toast({ title: "Erro ao remover embed", variant: "destructive" });
    } else {
      setEmbedSrc("");
      setInputValue("");
      toast({ title: "Embed removido" });
    }
  };

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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-2xl font-bold truncate">{user.full_name || user.email}</h2>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      <ProgressCard 
        completed={completedCount} 
        total={totalCount} 
        progress={progress} 
      />

      <Tabs defaultValue="ames" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="ames" className="text-xs sm:text-sm py-2">Plano AMES</TabsTrigger>
          <TabsTrigger value="custom" className="text-xs sm:text-sm py-2">Personalizado</TabsTrigger>
          <TabsTrigger value="mapa-mental" className="text-xs sm:text-sm py-2">Mapa Mental</TabsTrigger>
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
        <TabsContent value="mapa-mental" className="mt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Cole o iframe HTML do Miro ou a URL direta do embed:
              </p>
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder='<iframe src="https://miro.com/app/live-embed/..." />'
                rows={4}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveEmbed} disabled={saving || !inputValue.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar embed
              </Button>
              {embedSrc && (
                <Button variant="destructive" onClick={handleRemoveEmbed}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </Button>
              )}
            </div>

            {embedSrc && embedSrc.startsWith(MIRO_PREFIX) && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Preview:</p>
                <div className="w-full rounded-lg overflow-hidden border">
                  <iframe
                    src={embedSrc}
                    className="w-full"
                    style={{ height: "500px" }}
                    allow="fullscreen; clipboard-read; clipboard-write"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
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
