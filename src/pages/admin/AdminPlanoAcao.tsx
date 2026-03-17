import { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Search,
  ArrowLeft,
  Trash2,
  List,
  Columns,
  Calendar,
  Save,
  DollarSign,
} from "lucide-react";
import { useTasks, Task, TaskStatus } from "@/hooks/useTasks";
import { DashboardTab } from "@/components/plano-acao/DashboardTab";
import { ListView } from "@/components/plano-acao/ListView";
import { KanbanView } from "@/components/plano-acao/KanbanView";
import { TimelineView } from "@/components/plano-acao/TimelineView";
import { ActionDrawer } from "@/components/plano-acao/ActionDrawer";
import { AuditoriasTab } from "@/components/plano-acao/AuditoriasTab";
import { Diagnostico360Tab } from "@/components/plano-acao/Diagnostico360Tab";
import { AddTaskDialog } from "@/components/plano-acao/AddTaskDialog";
import { PlanAulasTab } from "@/components/plano-acao/PlanAulasTab";
import { PlanFerramentasTab } from "@/components/plano-acao/PlanFerramentasTab";
import { CRM_STAGES } from "@/components/crm/CRMClientDrawer";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
        .from("profiles")
        .select("user_id, email, full_name")
        .order("email");

      if (error) throw error;
      setUsers(data || []);
    } catch {
      toast({ title: "Erro ao carregar usuários", variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q);
  });

  if (selectedUser) {
    return (
      <AdminLayout>
        <UserPlanView user={selectedUser} onBack={() => setSelectedUser(null)} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Gestão de Planos de Ação</h2>
          <p className="text-sm text-muted-foreground">Selecione um usuário</p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={search}
                onChange={e => setSearch(e.target.value)}
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
                {filteredUsers.map(u => (
                  <Button
                    key={u.user_id}
                    variant="outline"
                    className="justify-start h-auto py-3 px-4 w-full"
                    onClick={() => setSelectedUser(u)}
                  >
                    <div className="text-left w-full">
                      <div className="font-medium">{u.full_name || "Sem nome"}</div>
                      <div className="text-sm text-muted-foreground break-all">{u.email}</div>
                    </div>
                  </Button>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">Nenhum usuário encontrado</p>
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

function UserPlanView({ user, onBack }: { user: UserProfile; onBack: () => void }) {
  const { tasks, loading, updateTaskStatus, createTask, updateTask, deleteTask, refetch } = useTasks(user.user_id);
  const { toast } = useToast();

  const [planView, setPlanView] = useState<"list" | "kanban" | "timeline">("list");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // CRM contract data
  const [crmDraft, setCrmDraft] = useState({ stage: "onboarding", valor: "", inicio: "", fim: "" });
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [savingCrm, setSavingCrm] = useState(false);

  useEffect(() => {
    setLoadingCrm(true);
    (supabase as any).from("crm_clients")
      .select("stage, valor_contrato, data_inicio_contrato, data_fim_contrato")
      .eq("user_id", user.user_id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setCrmDraft({
            stage: data.stage || "onboarding",
            valor: data.valor_contrato !== null && data.valor_contrato !== undefined ? String(data.valor_contrato) : "",
            inicio: data.data_inicio_contrato || "",
            fim: data.data_fim_contrato || "",
          });
        }
        setLoadingCrm(false);
      });
  }, [user.user_id]);

  const handleSaveCrm = async () => {
    setSavingCrm(true);
    const { error } = await (supabase as any).from("crm_clients").upsert({
      user_id: user.user_id,
      stage: crmDraft.stage,
      stage_updated_at: new Date().toISOString(),
      valor_contrato: crmDraft.valor ? parseFloat(crmDraft.valor) : null,
      data_inicio_contrato: crmDraft.inicio || null,
      data_fim_contrato: crmDraft.fim || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSavingCrm(false);
    if (error) {
      toast({ title: "Erro ao salvar CRM", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "CRM atualizado com sucesso" });
    }
  };

  // Miro
  const [embedSrc, setEmbedSrc] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [savingMiro, setSavingMiro] = useState(false);

  useEffect(() => {
    supabase
      .from("miro_embeds")
      .select("embed_src")
      .eq("user_id", user.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.embed_src) {
          setEmbedSrc(data.embed_src);
          setInputValue(data.embed_src);
        }
      });
  }, [user.user_id]);

  const handleSaveEmbed = async () => {
    const srcMatch = SRC_REGEX.exec(inputValue);
    const extracted = srcMatch ? srcMatch[1] : inputValue.trim();
    if (!extracted.startsWith(MIRO_PREFIX)) {
      toast({ title: "URL inválida", description: "Deve começar com " + MIRO_PREFIX, variant: "destructive" });
      return;
    }
    setSavingMiro(true);
    const { error } = await supabase
      .from("miro_embeds")
      .upsert({ user_id: user.user_id, embed_src: extracted }, { onConflict: "user_id" });
    setSavingMiro(false);
    if (error) {
      toast({ title: "Erro ao salvar embed", variant: "destructive" });
    } else {
      setEmbedSrc(extracted);
      toast({ title: "Embed salvo!" });
    }
  };

  const handleRemoveEmbed = async () => {
    await supabase.from("miro_embeds").delete().eq("user_id", user.user_id);
    setEmbedSrc("");
    setInputValue("");
    toast({ title: "Embed removido" });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    updateTaskStatus(taskId, status);
    if (selectedTask?.id === taskId) setSelectedTask(p => p ? { ...p, status } : p);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    if (selectedTask?.id === taskId) setSelectedTask(p => p ? { ...p, ...updates } : p);
  };

  const handleCreateTask = async (taskData: Omit<Task, "id" | "created_at" | "updated_at">) => {
    return await createTask(taskData);
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

      <Tabs defaultValue="plano" className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="plano" className="text-xs sm:text-sm">Plano de Ação</TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
          <TabsTrigger value="auditorias" className="text-xs sm:text-sm">Auditorias</TabsTrigger>
          <TabsTrigger value="diagnostico" className="text-xs sm:text-sm">Diagnóstico 360</TabsTrigger>
          <TabsTrigger value="crm" className="text-xs sm:text-sm">CRM</TabsTrigger>
          <TabsTrigger value="mapa-mental" className="text-xs sm:text-sm">Mapa Mental</TabsTrigger>
          <TabsTrigger value="aulas" className="text-xs sm:text-sm">Aulas</TabsTrigger>
          <TabsTrigger value="ferramentas" className="text-xs sm:text-sm">Ferramentas</TabsTrigger>
        </TabsList>

        {/* Plano de Ação */}
        <TabsContent value="plano" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
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
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nova Ação
            </Button>
          </div>

          {planView === "list" && (
            <ListView tasks={tasks} onTaskClick={handleTaskClick} />
          )}
          {planView === "kanban" && (
            <KanbanView tasks={tasks} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />
          )}
          {planView === "timeline" && (
            <TimelineView tasks={tasks} onTaskClick={handleTaskClick} />
          )}
        </TabsContent>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab tasks={tasks} userId={user.user_id} canEdit={true} />
        </TabsContent>

        {/* Auditorias */}
        <TabsContent value="auditorias" className="mt-6">
          <AuditoriasTab userId={user.user_id} canEdit={true} />
        </TabsContent>

        {/* Diagnóstico 360 */}
        <TabsContent value="diagnostico" className="mt-6">
          <Diagnostico360Tab userId={user.user_id} canEdit={true} />
        </TabsContent>

        {/* CRM */}
        <TabsContent value="crm" className="mt-6">
          {loadingCrm ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6 max-w-lg">
              <div className="space-y-4 rounded-lg border p-5">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Dados do CRM
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs">Etapa no CRM</Label>
                  <Select value={crmDraft.stage} onValueChange={v => setCrmDraft(d => ({ ...d, stage: v }))}>
                    <SelectTrigger className="h-9 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${CRM_STAGES.find(s => s.id === crmDraft.stage)?.dot || "bg-muted"}`} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {CRM_STAGES.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-sm">
                          <span className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Valor do Contrato (R$)</Label>
                  <Input
                    type="number"
                    value={crmDraft.valor}
                    onChange={e => setCrmDraft(d => ({ ...d, valor: e.target.value }))}
                    placeholder="Ex: 3500"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Início do contrato</Label>
                    <Input
                      type="date"
                      value={crmDraft.inicio}
                      onChange={e => setCrmDraft(d => ({ ...d, inicio: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fim / encerramento</Label>
                    <Input
                      type="date"
                      value={crmDraft.fim}
                      onChange={e => setCrmDraft(d => ({ ...d, fim: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSaveCrm} disabled={savingCrm}>
                    {savingCrm ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    Salvar CRM
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Mapa Mental */}
        <TabsContent value="mapa-mental" className="mt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Cole o iframe HTML do Miro ou a URL direta do embed:
              </p>
              <Textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder='<iframe src="https://miro.com/app/live-embed/..." />'
                rows={4}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEmbed} disabled={savingMiro || !inputValue.trim()}>
                {savingMiro && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

        {/* Aulas */}
        <TabsContent value="aulas" className="mt-6">
          <PlanAulasTab userId={user.user_id} />
        </TabsContent>

        {/* Ferramentas */}
        <TabsContent value="ferramentas" className="mt-6">
          <PlanFerramentasTab userId={user.user_id} />
        </TabsContent>
      </Tabs>

      <ActionDrawer
        task={selectedTask}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStatusChange={handleStatusChange}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={deleteTask}
        canEditTask={true}
      />

      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleCreateTask}
        userId={user.user_id}
        origin="admin"
        isAdmin={true}
      />
    </div>
  );
}
