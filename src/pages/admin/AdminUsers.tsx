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
  ArrowUpDown, ArrowDown, ArrowUp,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BulkUserImportDialog } from "@/components/admin/BulkUserImportDialog";
import { AdminWhatsAppConfig } from "@/components/admin/AdminWhatsAppConfig";
import { UserEditSheet } from "@/components/admin/UserEditSheet";

import { useMemo } from "react";
import { UserPlanView } from "./AdminPlanoAcao";
import { CRMClientDrawer } from "@/components/crm/CRMClientDrawer";

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

type SortKey = "full_name" | "access_status" | "roles" | "created_at" | "last_login_at";
type SortDir = "asc" | "desc";

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
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);

  const [planoUser, setPlanoUser] = useState<UserProfile | null>(null);
  const [crmUserId, setCrmUserId] = useState<string | null>(null);
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
          send_invite_email: false,
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
        if (newUserIsAdmin) promises.push(supabase.rpc("admin_update_role", { target_user_id: profile.user_id, make_admin: true }) as any);
        if (newUserClienteW3) promises.push(supabase.rpc("admin_set_client_role" as any, { target_user_id: profile.user_id, p_role: "cliente_w3", p_grant: true }) as any);
        if (newUserClienteAmes) {
          promises.push(supabase.rpc("admin_set_client_role" as any, { target_user_id: profile.user_id, p_role: "cliente_ames", p_grant: true }) as any);
          // AMES implies w3 access
          if (!newUserClienteW3) promises.push(supabase.rpc("admin_set_client_role" as any, { target_user_id: profile.user_id, p_role: "cliente_w3", p_grant: true }) as any);
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

  const handleBulkAction = async (action: "active" | "suspended" | "add_w3" | "add_ames") => {
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((userId) => {
        switch (action) {
          case "active":
          case "suspended":
            return supabase.rpc("admin_update_user_status", { target_user_id: userId, new_status: action });
          case "add_w3":
            return supabase.rpc("admin_set_client_role" as any, { target_user_id: userId, p_role: "cliente_w3", p_grant: true });
          case "add_ames":
            return supabase.rpc("admin_set_client_role" as any, { target_user_id: userId, p_role: "cliente_ames", p_grant: true });
        }
      }));
      await fetchUsers();
      setSelectedIds(new Set());
      toast({ title: `${ids.length} usuário(s) atualizado(s)` });
    } catch (error: any) {
      toast({ title: "Erro na operação em massa", description: error.message, variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((userId) => supabase.rpc("admin_delete_user", { target_user_id: userId })));
      await fetchUsers();
      setSelectedIds(new Set());
      setBulkDeleteDialog(false);
      toast({ title: `${ids.length} usuário(s) excluído(s)` });
    } catch (error: any) {
      toast({ title: "Erro ao excluir usuários", description: error.message, variant: "destructive" });
    } finally {
      setBulkLoading(false);
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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "created_at" || key === "last_login_at" ? "desc" : "asc");
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/70" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-foreground" />
      : <ArrowDown className="h-3 w-3 text-foreground" />;
  };

  const sortedUsers = useMemo(() => {
    const list = [...filteredUsers];
    list.sort((a, b) => {
      const order = sortDir === "asc" ? 1 : -1;

      if (sortKey === "created_at") {
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * order;
      }

      if (sortKey === "last_login_at") {
        const aTime = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
        const bTime = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
        return (aTime - bTime) * order;
      }

      if (sortKey === "roles") {
        const aRoles = (a.roles ?? []).join(", ");
        const bRoles = (b.roles ?? []).join(", ");
        return aRoles.localeCompare(bRoles, "pt-BR") * order;
      }

      if (sortKey === "access_status") {
        return (a.access_status ?? "").localeCompare(b.access_status ?? "", "pt-BR") * order;
      }

      const aName = (a.full_name || a.email || "").toLowerCase();
      const bName = (b.full_name || b.email || "").toLowerCase();
      return aName.localeCompare(bName, "pt-BR") * order;
    });

    return list;
  }, [filteredUsers, sortDir, sortKey]);

  const formatDateSafe = (value: string | null, includeTime = false) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    return format(dt, includeTime ? "dd/MM/yyyy HH:mm" : "dd/MM/yyyy", { locale: ptBR });
  };

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
                      <TableHead className="w-[40px]">
                        <Checkbox
                          checked={sortedUsers.length > 0 && sortedUsers.every(u => selectedIds.has(u.user_id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(new Set(sortedUsers.map(u => u.user_id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="min-w-[180px]">
                        <button type="button" onClick={() => toggleSort("full_name")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Usuário {sortIcon("full_name")}
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[80px]">
                        <button type="button" onClick={() => toggleSort("access_status")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Status {sortIcon("access_status")}
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[120px]">
                        <button type="button" onClick={() => toggleSort("roles")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Roles {sortIcon("roles")}
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[100px] hidden md:table-cell">
                        <button type="button" onClick={() => toggleSort("created_at")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Cadastro {sortIcon("created_at")}
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[120px] hidden lg:table-cell">
                        <button type="button" onClick={() => toggleSort("last_login_at")} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          Último login {sortIcon("last_login_at")}
                        </button>
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedUsers.map((user) => (
                      <TableRow key={user.id} className="cursor-pointer hover:bg-accent/40" onClick={() => setActionsDialog({ open: true, user })}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(user.user_id)}
                            onCheckedChange={(checked) => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(user.user_id);
                                else next.delete(user.user_id);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
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
                          {formatDateSafe(user.created_at)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDateSafe(user.last_login_at, true)}
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
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
        onViewCRM={(u) => { setCrmUserId(u.user_id); setActionsDialog({ open: false, user: null }); }}
      />

      <CRMClientDrawer
        userId={crmUserId}
        open={!!crmUserId}
        onClose={() => setCrmUserId(null)}
        onStageChange={() => {}}
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

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{selectedIds.size} usuário(s) selecionado(s)</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="h-7 text-xs">
                Limpar seleção
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleBulkAction("active")} disabled={bulkLoading} className="h-8">
                {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                Ativar
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction("suspended")} disabled={bulkLoading} className="h-8">
                {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserX className="h-3 w-3 mr-1" />}
                Suspender
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction("add_w3")} disabled={bulkLoading} className="h-8">
                <ShoppingBag className="h-3 w-3 mr-1" />
                Add Cliente W3
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkAction("add_ames")} disabled={bulkLoading} className="h-8">
                <GraduationCap className="h-3 w-3 mr-1" />
                Add Cliente AMES
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setBulkDeleteDialog(true)} disabled={bulkLoading} className="h-8">
                <Trash2 className="h-3 w-3 mr-1" />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} usuário(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os {selectedIds.size} usuários selecionados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Excluir todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

