import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, Search, UserPlus, X, Users, BookUser, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

interface Assignment {
  id: string;
  staff_id?: string;
  tutor_id?: string;
  cs_id?: string;
  mentorado_id?: string;
  target: StaffUser;
}

// ─── Reusable picker dialog ────────────────────────────────────
function UserPickerDialog({
  open,
  onOpenChange,
  title,
  candidates,
  onSelect,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  candidates: StaffUser[];
  onSelect: (user: StaffUser) => void;
  loading: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = candidates.filter((u) =>
    u.email?.toLowerCase().includes(q.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por email ou nome..." className="pl-9" autoFocus />
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1 mt-1">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhum resultado</p>
            ) : filtered.map((u) => (
              <button
                key={u.user_id}
                type="button"
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
                onClick={() => { onSelect(u); setQ(""); onOpenChange(false); }}
              >
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                  {(u.full_name || u.email || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{u.full_name || "Sem nome"}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Left panel: list of staff ─────────────────────────────────
function StaffList({
  items,
  selected,
  onSelect,
  loading,
  emptyLabel,
}: {
  items: StaffUser[];
  selected: StaffUser | null;
  onSelect: (u: StaffUser) => void;
  loading: boolean;
  emptyLabel: string;
}) {
  const [q, setQ] = useState("");
  const filtered = items.filter(
    (u) => u.email?.toLowerCase().includes(q.toLowerCase()) || u.full_name?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar..." className="pl-8 h-8 text-sm" />
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{emptyLabel}</p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1">
          {filtered.map((u) => (
            <button
              key={u.user_id}
              type="button"
              onClick={() => onSelect(u)}
              className={cn(
                "w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors",
                selected?.user_id === u.user_id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent"
              )}
            >
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                {(u.full_name || u.email || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{u.full_name || "Sem nome"}</div>
                <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Right panel: assigned items ────────────────────────────────
function AssignedList({
  assignments,
  onRemove,
  onAdd,
  emptyLabel,
  addLabel,
  loading,
}: {
  assignments: Assignment[];
  onRemove: (a: Assignment) => void;
  onAdd: () => void;
  emptyLabel: string;
  addLabel: string;
  loading: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{assignments.length} atribuído{assignments.length !== 1 ? "s" : ""}</span>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> {addLabel}
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border bg-card">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                  {(a.target.full_name || a.target.email || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.target.full_name || "Sem nome"}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.target.email}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(a)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────
export default function AdminCarteiras() {
  const { toast } = useToast();

  // All users cache
  const [allUsers, setAllUsers] = useState<StaffUser[]>([]);
  const [allUsersLoading, setAllUsersLoading] = useState(true);

  // Staff lists
  const [csList, setCsList] = useState<StaffUser[]>([]);
  const [tutorList, setTutorList] = useState<StaffUser[]>([]);
  const [mentoradoList, setMentoradoList] = useState<StaffUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  // Carteiras tab state
  const [selectedCS, setSelectedCS] = useState<StaffUser | null>(null);
  const [csAssignments, setCsAssignments] = useState<Assignment[]>([]);
  const [csAssLoading, setCsAssLoading] = useState(false);
  const [addMentoradoOpen, setAddMentoradoOpen] = useState(false);

  // Times tab state
  const [selectedTutor, setSelectedTutor] = useState<StaffUser | null>(null);
  const [tutorAssignments, setTutorAssignments] = useState<Assignment[]>([]);
  const [tutorAssLoading, setTutorAssLoading] = useState(false);
  const [addCSOpen, setAddCSOpen] = useState(false);

  // Load all users + role-based lists
  const loadData = useCallback(async () => {
    setStaffLoading(true);
    const [profilesResult, rolesResult] = await Promise.all([
      supabase.from("profiles").select("user_id, email, full_name").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const profiles: StaffUser[] = (profilesResult.data ?? []).map((p) => ({
      user_id: p.user_id,
      email: p.email,
      full_name: p.full_name,
    }));
    setAllUsers(profiles);
    setAllUsersLoading(false);

    const roleMap: Record<string, string[]> = {};
    for (const r of rolesResult.data ?? []) {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role as string);
    }

    const profWithRoles = (uid: string) => profiles.find((p) => p.user_id === uid);

    setCsList(
      Object.entries(roleMap)
        .filter(([, roles]) => roles.includes("cs"))
        .map(([uid]) => profWithRoles(uid))
        .filter(Boolean) as StaffUser[]
    );
    setTutorList(
      Object.entries(roleMap)
        .filter(([, roles]) => roles.includes("tutor"))
        .map(([uid]) => profWithRoles(uid))
        .filter(Boolean) as StaffUser[]
    );
    setMentoradoList(
      Object.entries(roleMap)
        .filter(([, roles]) => roles.includes("cliente_ames") || roles.includes("cliente_w3"))
        .map(([uid]) => profWithRoles(uid))
        .filter(Boolean) as StaffUser[]
    );

    setStaffLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Load CS carteira ──
  const loadCSCarteira = useCallback(async (cs: StaffUser) => {
    setCsAssLoading(true);
    const { data, error } = await supabase
      .from("staff_carteiras" as any)
      .select("id, mentorado_id")
      .eq("staff_id", cs.user_id) as any;

    if (error) {
      toast({ title: "Erro ao carregar carteira", description: error.message, variant: "destructive" });
      setCsAssLoading(false);
      return;
    }

    const ids = data?.map((r) => r.mentorado_id) ?? [];
    const targets = ids.map((id) => allUsers.find((u) => u.user_id === id)).filter(Boolean) as StaffUser[];

    setCsAssignments(
      (data ?? []).map((r, i) => ({ id: r.id, mentorado_id: r.mentorado_id, target: targets[i] || { user_id: r.mentorado_id, email: r.mentorado_id, full_name: null } }))
    );
    setCsAssLoading(false);
  }, [allUsers, toast]);

  useEffect(() => {
    if (selectedCS && allUsers.length > 0) loadCSCarteira(selectedCS);
  }, [selectedCS, allUsers, loadCSCarteira]);

  // ── Load Tutor team ──
  const loadTutorTeam = useCallback(async (tutor: StaffUser) => {
    setTutorAssLoading(true);
    const { data, error } = await supabase
      .from("tutor_teams" as any)
      .select("id, cs_id")
      .eq("tutor_id", tutor.user_id) as any;

    if (error) {
      toast({ title: "Erro ao carregar time", description: error.message, variant: "destructive" });
      setTutorAssLoading(false);
      return;
    }

    const ids = data?.map((r) => r.cs_id) ?? [];
    const targets = ids.map((id) => allUsers.find((u) => u.user_id === id)).filter(Boolean) as StaffUser[];

    setTutorAssignments(
      (data ?? []).map((r, i) => ({ id: r.id, cs_id: r.cs_id, target: targets[i] || { user_id: r.cs_id, email: r.cs_id, full_name: null } }))
    );
    setTutorAssLoading(false);
  }, [allUsers, toast]);

  useEffect(() => {
    if (selectedTutor && allUsers.length > 0) loadTutorTeam(selectedTutor);
  }, [selectedTutor, allUsers, loadTutorTeam]);

  // ── Assign mentorado to CS ──
  const assignMentorado = async (mentorado: StaffUser) => {
    if (!selectedCS) return;
    const { error } = await supabase.rpc("admin_assign_staff_carteira" as any, {
      p_staff_id: selectedCS.user_id,
      p_mentorado_id: mentorado.user_id,
      p_assign: true,
    });
    if (error) { toast({ title: "Erro ao atribuir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Mentorado adicionado à carteira" });
    await loadCSCarteira(selectedCS);
  };

  const removeCSAssignment = async (a: Assignment) => {
    if (!selectedCS) return;
    const { error } = await supabase.rpc("admin_assign_staff_carteira" as any, {
      p_staff_id: selectedCS.user_id,
      p_mentorado_id: a.mentorado_id,
      p_assign: false,
    });
    if (error) { toast({ title: "Erro ao remover", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Mentorado removido da carteira" });
    await loadCSCarteira(selectedCS);
  };

  // ── Assign CS to Tutor ──
  const assignCS = async (cs: StaffUser) => {
    if (!selectedTutor) return;
    const { error } = await supabase.rpc("admin_assign_tutor_team" as any, {
      p_tutor_id: selectedTutor.user_id,
      p_cs_id: cs.user_id,
      p_assign: true,
    });
    if (error) { toast({ title: "Erro ao atribuir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "CS adicionada ao time" });
    await loadTutorTeam(selectedTutor);
  };

  const removeTutorAssignment = async (a: Assignment) => {
    if (!selectedTutor) return;
    const { error } = await supabase.rpc("admin_assign_tutor_team" as any, {
      p_tutor_id: selectedTutor.user_id,
      p_cs_id: a.cs_id,
      p_assign: false,
    });
    if (error) { toast({ title: "Erro ao remover", description: error.message, variant: "destructive" }); return; }
    toast({ title: "CS removida do time" });
    await loadTutorTeam(selectedTutor);
  };

  // Candidates for pickers (exclude already assigned)
  const assignedMentoradoIds = new Set(csAssignments.map((a) => a.mentorado_id));
  const availableMentorados = mentoradoList.filter((u) => !assignedMentoradoIds.has(u.user_id));

  const assignedCSIds = new Set(tutorAssignments.map((a) => a.cs_id));
  const availableCSforTutor = csList.filter((u) => !assignedCSIds.has(u.user_id));

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Carteiras & Times</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie quais mentorados cada CS acompanha, e quais CSs cada tutor supervisiona.
          </p>
        </div>

        <Tabs defaultValue="carteiras" className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="carteiras" className="gap-1.5">
              <BookUser className="h-3.5 w-3.5" /> Carteiras
            </TabsTrigger>
            <TabsTrigger value="times" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Times
            </TabsTrigger>
          </TabsList>

          {/* ─── Carteiras tab ─── */}
          <TabsContent value="carteiras" className="mt-4">
            <p className="text-xs text-muted-foreground mb-4">
              Selecione um CS à esquerda para ver e gerenciar os mentorados da carteira dele.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
              {/* CS list */}
              <Card className="h-[520px] overflow-hidden flex flex-col">
                <CardHeader className="py-3 px-4 border-b shrink-0">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-blue-500" />
                    CSs ({csList.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-3">
                  <StaffList
                    items={csList}
                    selected={selectedCS}
                    onSelect={setSelectedCS}
                    loading={staffLoading}
                    emptyLabel="Nenhum CS cadastrado. Atribua o papel de CS a um usuário primeiro."
                  />
                </CardContent>
              </Card>

              {/* Assignments */}
              <Card className="h-[520px] overflow-hidden flex flex-col">
                <CardHeader className="py-3 px-4 border-b shrink-0">
                  <CardTitle className="text-sm">
                    {selectedCS
                      ? <>Carteira de <strong>{selectedCS.full_name || selectedCS.email}</strong></>
                      : "Selecione um CS"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4">
                  {!selectedCS ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Clique em um CS para ver a carteira
                    </div>
                  ) : (
                    <AssignedList
                      assignments={csAssignments}
                      onRemove={removeCSAssignment}
                      onAdd={() => setAddMentoradoOpen(true)}
                      addLabel="Adicionar mentorado"
                      emptyLabel="Nenhum mentorado nesta carteira"
                      loading={csAssLoading}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ─── Times tab ─── */}
          <TabsContent value="times" className="mt-4">
            <p className="text-xs text-muted-foreground mb-4">
              Selecione um Tutor à esquerda para ver e gerenciar as CSs que ele supervisiona.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
              {/* Tutor list */}
              <Card className="h-[520px] overflow-hidden flex flex-col">
                <CardHeader className="py-3 px-4 border-b shrink-0">
                  <CardTitle className="text-sm flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-amber-500" />
                    Tutores ({tutorList.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-3">
                  <StaffList
                    items={tutorList}
                    selected={selectedTutor}
                    onSelect={setSelectedTutor}
                    loading={staffLoading}
                    emptyLabel="Nenhum Tutor cadastrado. Atribua o papel de Tutor a um usuário primeiro."
                  />
                </CardContent>
              </Card>

              {/* Team assignments */}
              <Card className="h-[520px] overflow-hidden flex flex-col">
                <CardHeader className="py-3 px-4 border-b shrink-0">
                  <CardTitle className="text-sm">
                    {selectedTutor
                      ? <>Time de <strong>{selectedTutor.full_name || selectedTutor.email}</strong></>
                      : "Selecione um Tutor"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4">
                  {!selectedTutor ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Clique em um Tutor para ver o time
                    </div>
                  ) : (
                    <AssignedList
                      assignments={tutorAssignments}
                      onRemove={removeTutorAssignment}
                      onAdd={() => setAddCSOpen(true)}
                      addLabel="Adicionar CS"
                      emptyLabel="Nenhuma CS neste time"
                      loading={tutorAssLoading}
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Pickers */}
      <UserPickerDialog
        open={addMentoradoOpen}
        onOpenChange={setAddMentoradoOpen}
        title="Adicionar mentorado à carteira"
        candidates={availableMentorados}
        onSelect={assignMentorado}
        loading={allUsersLoading}
      />
      <UserPickerDialog
        open={addCSOpen}
        onOpenChange={setAddCSOpen}
        title="Adicionar CS ao time"
        candidates={availableCSforTutor}
        onSelect={assignCS}
        loading={allUsersLoading}
      />
    </AdminLayout>
  );
}
