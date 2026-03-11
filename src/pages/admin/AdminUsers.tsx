import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Check, Loader2, MoreHorizontal, Search, Shield, Trash2, UserPlus,
  UsersRound, UserX, ArrowLeft, Plus, AlertCircle, GraduationCap, ShoppingBag,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BulkUserImportDialog } from "@/components/admin/BulkUserImportDialog";
import { AdminWhatsAppConfig } from "@/components/admin/AdminWhatsAppConfig";
import { UserEditSheet } from "@/components/admin/UserEditSheet";

// Plano de Ação imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { useTasks, SECTIONS, Task } from "@/hooks/useTasks";
import { ProgressCard } from "@/components/plano-acao/ProgressCard";
import { TaskSection } from "@/components/plano-acao/TaskSection";
import { AddTaskDialog } from "@/components/plano-acao/AddTaskDialog";
import { useMemo } from "react";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  access_status: string;
  is_mentorado: boolean;
  is_w3_client: boolean;
  plan_type: string;
  access_expires_at: string | null;
  last_login_at: string | null;
  created_at: string;
  revenue_goal?: number | null;
  isAdmin?: boolean;
  roles?: string[];
}

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  admin:       { label: "Admin",        className: "border-primary/50 text-primary bg-primary/5" },
  master:      { label: "Master",       className: "border-purple-500/50 text-purple-500 bg-purple-500/5" },
  tutor:       { label: "Tutor",        className: "border-amber-500/50 text-amber-500 bg-amber-500/5" },
  cs:          { label: "CS",           className: "border-blue-500/50 text-blue-500 bg-blue-500/5" },
  cliente_w3:  { label: "Cliente W3",   className: "border-emerald-500/50 text-emerald-600 bg-emerald-500/5" },
  cliente_ames:{ label: "AMES",         className: "border-amber-400/50 text-amber-600 bg-amber-400/5" },
};

function RoleBadges({ roles = [] }: { roles?: string[] }) {
  const relevant = roles.filter((r) => r in ROLE_CONFIG);
  if (relevant.length === 0) return <span className="text-muted-foreground text-sm">-</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {relevant.map((r) => {
        const cfg = ROLE_CONFIG[r];
        return (
          <Badge key={r} variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.className}`}>
            {cfg.label}
          </Badge>
        );
      })}
    </div>
  );
}

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "cliente_w3", label: "Clientes W3" },
  { value: "cliente_ames", label: "Clientes AMES" },
  { value: "cs", label: "CS" },
  { value: "tutor", label: "Tutores" },
  { value: "master", label: "Masters" },
  { value: "admin", label: "Admins" },
  { value: "none", label: "Sem roles" },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  const [planoUser, setPlanoUser] = useState<UserProfile | null>(null);
  const [actionsDialog, setActionsDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; user: UserProfile | null; action: "active" | "suspended" }>({ open: false, user: null, action: "suspended" });

  const [addUserDialog, setAddUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("appw3acesso");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [newUserClienteW3, setNewUserClienteW3] = useState(false);
  const [newUserClienteAmes, setNewUserClienteAmes] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const [bulkImportDialog, setBulkImportDialog] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchUsers();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data } = await supabase.rpc("is_current_user_admin");
      setIsAdmin(data === true);
    } catch { setIsAdmin(false); }
  };

  const fetchUsers = async () => {
    try {
      const [profilesResult, rolesResult] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesResult.error) throw profilesResult.error;

      const userRolesMap: Record<string, string[]> = {};
      for (const r of rolesResult.data ?? []) {
        if (!userRolesMap[r.user_id]) userRolesMap[r.user_id] = [];
        userRolesMap[r.user_id].push(r.role as string);
      }

      setUsers((profilesResult.data ?? []).map((p) => ({
        ...p,
        roles: userRolesMap[p.user_id] ?? [],
        isAdmin: (userRolesMap[p.user_id] ?? []).includes("admin"),
      })));
    } catch (error: any) {
      toast({ title: "Erro ao carregar usuários", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirmSuspend = async () => {
    if (!suspendDialog.user) return;
    try {
      const { error } = await supabase.rpc("admin_update_user_status", { target_user_id: suspendDialog.user.user_id, new_status: suspendDialog.action });
      if (error) throw error;
      await fetchUsers();
      toast({ title: suspendDialog.action === "active" ? "Acesso liberado" : "Acesso suspenso" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    } finally {
      setSuspendDialog({ open: false, user: null, action: "suspended" });
    }
  };

  const deleteUser = async () => {
    if (!deleteDialog.user) return;
    try {
      const { error } = await supabase.rpc("admin_delete_user", { target_user_id: deleteDialog.user.user_id });
      if (error) throw error;
      await fetchUsers();
      toast({ title: "Usuário removido" });
      setDeleteDialog({ open: false, user: null });
    } catch (error: any) {
      toast({ title: "Erro ao remover usuário", description: error.message, variant: "destructive" });
    }
  };

  const sendInvite = async () => {
    if (!newUserEmail.trim()) return;
    if (newUserPassword.length < 6) {
      toast({ title: "Senha inválida", description: "Mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    setAddingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-bulk-users", {
        body: {
          users: [{ email: newUserEmail.trim(), name: newUserName.trim() || undefined, plan: "free" }],
          default_password: newUserPassword,
        },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result?.status === "error") throw new Error(result.message);

      // Fetch new user's profile to get user_id
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", newUserEmail.trim())
        .single();

      if (profile?.user_id) {
        const promises: Promise<any>[] = [];
        if (newUserIsAdmin) promises.push(supabase.rpc("admin_update_role", { target_user_id: profile.user_id, make_admin: true }));
        if (newUserClienteW3) promises.push(supabase.rpc("admin_set_client_role" as any, { target_user_id: profile.user_id, p_role: "cliente_w3", p_grant: true }));
        if (newUserClienteAmes) {
          promises.push(supabase.rpc("admin_set_client_role" as any, { target_user_id: profile.user_id, p_role: "cliente_ames", p_grant: true }));
          // AMES implies w3 access
          if (!newUserClienteW3) promises.push(supabase.rpc("admin_set_client_role" as any, { target_user_id: profile.user_id, p_role: "cliente_w3", p_grant: true }));
        }
        await Promise.all(promises);
      }

      await fetchUsers();
      toast({ title: "Usuário criado", description: `${newUserEmail} — senha: ${newUserPassword}` });
      setAddUserDialog(false);
      setNewUserEmail(""); setNewUserName(""); setNewUserPassword("appw3acesso");
      setNewUserIsAdmin(false); setNewUserClienteW3(false); setNewUserClienteAmes(false);
    } catch (error: any) {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    } finally {
      setAddingUser(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = u.email?.toLowerCase().includes(searchLower) || u.full_name?.toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;
    if (roleFilter === "all") return true;
    if (roleFilter === "none") return !u.roles?.some((r) => r in ROLE_CONFIG);
    return u.roles?.includes(roleFilter);
  });

  const getStatusBadge = (user: UserProfile) => {
    if (user.access_status === "suspended") return <Badge variant="destructive">Suspenso</Badge>;
    if (user.access_expires_at && new Date(user.access_expires_at) < new Date()) return <Badge variant="secondary">Expirado</Badge>;
    return <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Ativo</Badge>;
  };

  if (!isAdmin && !loading) {
    return (
      <AdminLayout>
        <Card className="p-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground">Você precisa ser administrador para acessar esta página.</p>
          </div>
        </Card>
      </AdminLayout>
    );
  }

  if (planoUser) {
    return (
      <AdminLayout>
        <UserPlanView user={{ user_id: planoUser.user_id, email: planoUser.email, full_name: planoUser.full_name }} onBack={() => setPlanoUser(null)} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Gestão de Usuários</h2>
            <p className="text-sm text-muted-foreground">{users.length} usuários cadastrados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkImportDialog(true)} className="gap-2">
              <UsersRound className="h-4 w-4" />
              <span className="hidden sm:inline">Importar em Massa</span>
            </Button>
            <Button onClick={() => setAddUserDialog(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>

        <AdminWhatsAppConfig />

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por email ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-full" />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-44 h-10">
                  <SelectValue placeholder="Filtrar por role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filteredUsers.length !== users.length && (
              <p className="text-xs text-muted-foreground pt-1">{filteredUsers.length} de {users.length} usuários</p>
            )}
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0 overflow-visible">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Usuário</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Roles</TableHead>
                      <TableHead className="min-w-[100px] hidden md:table-cell">Cadastro</TableHead>
                      <TableHead className="min-w-[120px] hidden lg:table-cell">Último login</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="cursor-pointer hover:bg-accent/40" onClick={() => setActionsDialog({ open: true, user })}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">{user.full_name || <span className="text-muted-foreground italic">Sem nome</span>}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell><RoleBadges roles={user.roles} /></TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {user.last_login_at ? format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setActionsDialog({ open: true, user })}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UserEditSheet
        user={actionsDialog.user}
        open={actionsDialog.open}
        onOpenChange={(open) => setActionsDialog({ open, user: open ? actionsDialog.user : null })}
        onRefresh={fetchUsers}
        onViewPlano={(u) => { setPlanoUser(u); setActionsDialog({ open: false, user: null }); }}
      />

      {/* Add User Sheet */}
      <Sheet open={addUserDialog} onOpenChange={(open) => {
        setAddUserDialog(open);
        if (!open) {
          setNewUserEmail(""); setNewUserName(""); setNewUserPassword("appw3acesso");
          setNewUserIsAdmin(false); setNewUserClienteW3(false); setNewUserClienteAmes(false);
        }
      }}>
        <SheetContent side="right" className="w-full sm:w-[480px] p-0 flex flex-col">
          <SheetHeader className="px-6 py-5 border-b border-border">
            <SheetTitle>Adicionar Novo Usuário</SheetTitle>
            <p className="text-sm text-muted-foreground">O usuário recebe acesso imediato com a senha temporária.</p>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email *</Label>
              <Input id="newEmail" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="usuario@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newName">Nome</Label>
              <Input id="newName" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Senha temporária</Label>
              <Input id="newPassword" type="text" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground">Padrão: appw3acesso</p>
            </div>
            <div className="border-t border-border/40 pt-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Acesso ao produto</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox id="newCW3" checked={newUserClienteW3} onCheckedChange={(v) => setNewUserClienteW3(v === true)} />
                  <Label htmlFor="newCW3" className="flex items-center gap-2 cursor-pointer">
                    <ShoppingBag className="h-4 w-4 text-blue-500" /> Cliente W3 — acesso à plataforma
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="newCAmes" checked={newUserClienteAmes} onCheckedChange={(v) => setNewUserClienteAmes(v === true)} />
                  <Label htmlFor="newCAmes" className="flex items-center gap-2 cursor-pointer">
                    <GraduationCap className="h-4 w-4 text-amber-500" /> Cliente AMES — desbloqueia W3 Educação
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="newAdmin" checked={newUserIsAdmin} onCheckedChange={(v) => setNewUserIsAdmin(v === true)} />
                  <Label htmlFor="newAdmin" className="flex items-center gap-2 cursor-pointer">
                    <Shield className="h-4 w-4 text-primary" /> Administrador
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
            <Button variant="outline" onClick={() => setAddUserDialog(false)}>Cancelar</Button>
            <Button onClick={sendInvite} disabled={addingUser || !newUserEmail.trim() || newUserPassword.length < 6}>
              {addingUser ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar Usuário"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Suspend Dialog */}
      <AlertDialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ open, user: open ? suspendDialog.user : null, action: suspendDialog.action })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{suspendDialog.action === "suspended" ? "Suspender Acesso" : "Liberar Acesso"}</AlertDialogTitle>
            <AlertDialogDescription>
              {suspendDialog.action === "suspended"
                ? <>Suspender acesso de <strong>{suspendDialog.user?.email}</strong>? O usuário não conseguirá entrar até ser reativado.</>
                : <>Liberar acesso de <strong>{suspendDialog.user?.email}</strong>?</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSuspend} className={suspendDialog.action === "suspended" ? "bg-destructive text-destructive-foreground" : ""}>
              {suspendDialog.action === "suspended" ? "Suspender" : "Liberar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: open ? deleteDialog.user : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Remover <strong>{deleteDialog.user?.email}</strong> permanentemente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkUserImportDialog open={bulkImportDialog} onOpenChange={setBulkImportDialog} onSuccess={fetchUsers} />
    </AdminLayout>
  );
}

// ============================================================
// UserPlanView
// ============================================================
const MIRO_PREFIX = "https://miro.com/app/live-embed/";
const SRC_REGEX = /src="([^"]+)"/;

interface UserPlanViewUser { user_id: string; email: string | null; full_name: string | null; }

function UserPlanView({ user, onBack }: { user: UserPlanViewUser; onBack: () => void }) {
  const {
    tasks, loading, progress, completedCount, totalCount,
    updateTaskStatus, updateTaskDueDate, createTask, updateTask, deleteTask, reorderTasks,
  } = useTasks(user.user_id);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [embedSrc, setEmbedSrc] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("miro_embeds").select("embed_src").eq("user_id", user.user_id).maybeSingle()
      .then(({ data }) => { if (data?.embed_src) { setEmbedSrc(data.embed_src); setInputValue(data.embed_src); } });
  }, [user.user_id]);

  const handleSaveEmbed = async () => {
    const srcMatch = SRC_REGEX.exec(inputValue);
    const extracted = srcMatch ? srcMatch[1] : inputValue.trim();
    if (!extracted.startsWith(MIRO_PREFIX)) {
      toast({ title: "URL inválida", description: "O src deve começar com https://miro.com/app/live-embed/", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("miro_embeds").upsert({ user_id: user.user_id, embed_src: extracted }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast({ title: "Erro ao salvar embed", variant: "destructive" });
    else { setEmbedSrc(extracted); toast({ title: "Embed salvo com sucesso!" }); }
  };

  const handleRemoveEmbed = async () => {
    const { error } = await supabase.from("miro_embeds").delete().eq("user_id", user.user_id);
    if (error) toast({ title: "Erro ao remover embed", variant: "destructive" });
    else { setEmbedSrc(""); setInputValue(""); toast({ title: "Embed removido" }); }
  };

  const amesTasks = useMemo(() => tasks.filter(t => t.origin !== "mentorado"), [tasks]);
  const personalTasks = useMemo(() => tasks.filter(t => t.origin === "mentorado"), [tasks]);
  const tasksBySection = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    SECTIONS.forEach(section => { grouped[section] = amesTasks.filter(t => t.section === section); });
    return grouped;
  }, [amesTasks]);

  const handleSubmitTask = async (taskData: Omit<Task, "id" | "created_at" | "updated_at">) => {
    if (editTask) { await updateTask(editTask.id, taskData); setEditTask(null); return editTask; }
    return await createTask(taskData);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-2xl font-bold truncate">{user.full_name || user.email}</h2>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
      <ProgressCard completed={completedCount} total={totalCount} progress={progress} />
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
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedSection(section); setEditTask(null); setAddDialogOpen(true); }}>
                    <Plus className="mr-1 h-3 w-3" />Adicionar
                  </Button>
                </div>
                {tasksBySection[section].length > 0 ? (
                  <Accordion type="multiple" defaultValue={[section]} className="space-y-2">
                    <TaskSection section={section} tasks={tasksBySection[section]} onStatusChange={updateTaskStatus} onDueDateChange={updateTaskDueDate} onReorder={reorderTasks} onEdit={(t) => { setEditTask(t); setAddDialogOpen(true); }} onDelete={deleteTask} canEdit canDelete />
                  </Accordion>
                ) : (
                  <Card className="border-dashed"><CardContent className="py-4 text-center text-sm text-muted-foreground">Nenhuma tarefa nesta seção</CardContent></Card>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="custom" className="mt-6">
          <div className="mb-4">
            <Button onClick={() => { setSelectedSection("Personalizado"); setEditTask(null); setAddDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />Adicionar ação personalizada
            </Button>
          </div>
          {personalTasks.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-12"><AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">Nenhuma ação personalizada</p></CardContent></Card>
          ) : (
            <Accordion type="multiple" defaultValue={["Personalizado"]} className="space-y-2">
              <TaskSection section="Personalizado" tasks={personalTasks.map(t => ({ ...t, section: "Personalizado" }))} onStatusChange={updateTaskStatus} onDueDateChange={updateTaskDueDate} onReorder={reorderTasks} onEdit={(t) => { setEditTask(t); setAddDialogOpen(true); }} onDelete={deleteTask} canEdit canDelete />
            </Accordion>
          )}
        </TabsContent>
        <TabsContent value="mapa-mental" className="mt-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Cole o iframe HTML do Miro ou a URL direta do embed:</p>
            <Textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder='<iframe src="https://miro.com/app/live-embed/..." />' rows={4} className="font-mono text-xs" />
            <div className="flex gap-2">
              <Button onClick={handleSaveEmbed} disabled={saving || !inputValue.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar embed
              </Button>
              {embedSrc && <Button variant="destructive" onClick={handleRemoveEmbed}><Trash2 className="mr-2 h-4 w-4" />Remover</Button>}
            </div>
            {embedSrc && embedSrc.startsWith(MIRO_PREFIX) && (
              <div className="w-full rounded-lg overflow-hidden border">
                <iframe src={embedSrc} className="w-full" style={{ height: "500px" }} allow="fullscreen; clipboard-read; clipboard-write" allowFullScreen />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <AddTaskDialog
        open={addDialogOpen}
        onOpenChange={(open) => { setAddDialogOpen(open); if (!open) { setEditTask(null); setSelectedSection(null); } }}
        onSubmit={handleSubmitTask}
        userId={user.user_id}
        origin="admin"
        defaultSection={selectedSection || undefined}
        editTask={editTask}
        isAdmin
      />
    </div>
  );
}
