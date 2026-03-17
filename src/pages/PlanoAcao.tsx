import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, List, Columns, Calendar, Search, X, ChevronDown, Users, Plus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, Task, TaskStatus } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { DashboardTab } from "@/components/plano-acao/DashboardTab";
import { ListView } from "@/components/plano-acao/ListView";
import { KanbanView } from "@/components/plano-acao/KanbanView";
import { TimelineView } from "@/components/plano-acao/TimelineView";
import { ActionDrawer } from "@/components/plano-acao/ActionDrawer";
import { AddTaskDialog } from "@/components/plano-acao/AddTaskDialog";
import { MiroEmbed } from "@/components/plano-acao/MiroEmbed";
import { AuditoriasTab } from "@/components/plano-acao/AuditoriasTab";
import { Diagnostico360Tab } from "@/components/plano-acao/Diagnostico360Tab";
import { UserResourcesTab } from "@/components/plano-acao/UserResourcesTab";
import { InternoTab } from "@/components/plano-acao/InternoTab";

type PlanView = "list" | "kanban" | "timeline";

interface ClientOption {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

function ClientSelector({
  selected,
  onSelect,
  onClear,
}: {
  selected: ClientOption | null;
  onSelect: (c: ClientOption) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.rpc("get_dash_admin_mentorado_ids" as any).then(({ data }) => {
      const ids = (data || []).map((r: any) => r.mentorado_id).filter(Boolean);
      if (ids.length === 0) { setClients([]); setLoading(false); return; }
      supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids).order("full_name").then(({ data: profiles }) => {
        setClients(profiles || []);
        setLoading(false);
      });
    });
  }, [open]);

  const filtered = clients.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  return (
    <div ref={ref} className="relative">
      {selected ? (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-md px-3 py-1.5">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium text-primary">
            {selected.full_name || selected.email}
          </span>
          <button onClick={onClear} className="ml-1 text-primary/60 hover:text-primary">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setOpen(v => !v)}
        >
          <Search className="h-3.5 w-3.5" />
          Selecionar cliente
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}

      {open && !selected && (
        <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum cliente encontrado</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.user_id}
                  onClick={() => { onSelect(c); setOpen(false); setSearch(""); }}
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
                >
                  <p className="font-medium leading-tight">{c.full_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlanoAcao() {
  const { user, isAdmin, hasRole } = useAuth();
  const isStaff = isAdmin || hasRole("master") || hasRole("tutor") || hasRole("cs");
  const canEditDiag = isAdmin || hasRole("master") || hasRole("tutor");

  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const viewUserId = isStaff && selectedClient ? selectedClient.user_id : (user?.id || "");

  const {
    tasks,
    loading,
    updateTaskStatus,
    updateTask,
    deleteTask,
    createTask,
  } = useTasks(isStaff && selectedClient ? selectedClient.user_id : undefined);

  const [planView, setPlanView] = useState<PlanView>("list");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleStatusChange = (taskId: string, status: TaskStatus) => {
    updateTaskStatus(taskId, status);
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, status } : prev);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, ...updates } : prev);
  };

  const handleSelectClientFromInterno = (userId: string, name: string) => {
    setSelectedClient({ user_id: userId, full_name: name, email: null });
    setActiveTab("plano");
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setActiveTab("dashboard");
  };

  // ── Staff without a client selected: show portfolio overview ──
  if (isStaff && !selectedClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="page-title">Plano de Ação</h1>
            <p className="text-sm text-muted-foreground mt-1">Visão geral da sua carteira</p>
          </div>
          <ClientSelector
            selected={null}
            onSelect={c => { setSelectedClient(c); setActiveTab("plano"); }}
            onClear={handleClearClient}
          />
        </div>
        <InternoTab onSelectClient={handleSelectClientFromInterno} />
      </div>
    );
  }

  if (loading && !isStaff) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Client view (staff with client selected, or regular user) ──
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {isStaff && (
            <button
              onClick={handleClearClient}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Voltar à carteira
            </button>
          )}
          <h1 className="page-title">Plano de Ação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isStaff && selectedClient
              ? `Visualizando: ${selectedClient.full_name || selectedClient.email}`
              : "Acompanhe e execute as ações do seu plano de consultoria"}
          </p>
        </div>
        {isStaff && (
          <ClientSelector
            selected={selectedClient}
            onSelect={c => { setSelectedClient(c); setActiveTab("plano"); }}
            onClear={handleClearClient}
          />
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <DashboardTab tasks={tasks} userId={viewUserId} canEdit={isStaff} />
          )}
        </TabsContent>

        {/* Plano de Ação */}
        <TabsContent value="plano" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Button variant={planView === "list" ? "default" : "outline"} size="sm" onClick={() => setPlanView("list")}>
                  <List className="h-3.5 w-3.5 mr-1.5" />Lista
                </Button>
                <Button variant={planView === "kanban" ? "default" : "outline"} size="sm" onClick={() => setPlanView("kanban")}>
                  <Columns className="h-3.5 w-3.5 mr-1.5" />Kanban
                </Button>
                <Button variant={planView === "timeline" ? "default" : "outline"} size="sm" onClick={() => setPlanView("timeline")}>
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />Timeline
                </Button>
              </div>
              {isStaff && (
                <Button size="sm" onClick={() => setAddTaskOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />Nova Ação
                </Button>
              )}
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {planView === "list" && <ListView tasks={tasks} onTaskClick={handleTaskClick} />}
                {planView === "kanban" && <KanbanView tasks={tasks} onTaskClick={handleTaskClick} onStatusChange={handleStatusChange} />}
                {planView === "timeline" && <TimelineView tasks={tasks} onTaskClick={handleTaskClick} />}
              </>
            )}
          </div>
        </TabsContent>

        {/* Mapa Mental */}
        <TabsContent value="mapa-mental" className="mt-6">
          <MiroEmbed userId={viewUserId !== user?.id ? viewUserId : undefined} />
        </TabsContent>

        {/* Auditorias */}
        <TabsContent value="auditorias" className="mt-6">
          <AuditoriasTab userId={viewUserId} canEdit={isStaff} />
        </TabsContent>

        {/* Diagnóstico 360 */}
        <TabsContent value="diagnostico" className="mt-6">
          <Diagnostico360Tab userId={viewUserId} canEdit={canEditDiag} />
        </TabsContent>

        {/* Recursos */}
        <TabsContent value="recursos" className="mt-6">
          <UserResourcesTab userId={viewUserId} canEdit={isStaff} />
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

      {isStaff && (
        <AddTaskDialog
          open={addTaskOpen}
          onOpenChange={setAddTaskOpen}
          onSubmit={createTask}
          userId={viewUserId}
          origin="mentorado"
          isAdmin={true}
        />
      )}
    </div>
  );
}
