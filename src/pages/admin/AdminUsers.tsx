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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Check,
  ClipboardList,
  CreditCard,
  Crown,
  Key,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Shield,
  Trash2,
  UserPlus,
  UsersRound,
  UserX,
  Users,
  ArrowLeft,
  Plus,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BulkUserImportDialog } from "@/components/admin/BulkUserImportDialog";
import { AdminWhatsAppConfig } from "@/components/admin/AdminWhatsAppConfig";

// Plano de Ação imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { useTasks, SECTIONS, Task } from "@/hooks/useTasks";
import { ProgressCard } from "@/components/plano-acao/ProgressCard";
import { TaskSection } from "@/components/plano-acao/TaskSection";
import { AddTaskDialog } from "@/components/plano-acao/AddTaskDialog";
import { useMemo } from "react";

interface UserProfile {
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
  isAdmin?: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  // View state: null = user list, UserProfile = viewing that user's plano de ação
  const [planoUser, setPlanoUser] = useState<UserProfile | null>(null);

  // Dialog states
  const [expirationDialog, setExpirationDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [expirationDate, setExpirationDate] = useState("");

  const [planDialog, setPlanDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const [editNameDialog, setEditNameDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [editedName, setEditedName] = useState("");

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [actionsDialog, setActionsDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });

  // Suspend confirmation dialog
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; user: UserProfile | null; action: "active" | "suspended" }>({ open: false, user: null, action: "suspended" });

  // Reset password dialog
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ open: boolean; user: UserProfile | null }>({ open: false, user: null });
  const [tempPassword, setTempPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const [addUserDialog, setAddUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPlan, setNewUserPlan] = useState("free");
  const [newUserPassword, setNewUserPassword] = useState("appw3acesso");
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [newUserMentorado, setNewUserMentorado] = useState(false);
  const [newUserW3Client, setNewUserW3Client] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const [bulkImportDialog, setBulkImportDialog] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchUsers();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data, error } = await supabase.rpc("is_current_user_admin");
      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      console.error("Error checking admin:", error);
      setIsAdmin(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "admin");

      if (rolesError && rolesError.code !== "PGRST116") {
        console.warn("Error fetching roles:", rolesError);
      }

      const adminUserIds = new Set(roles?.map((r) => r.user_id) || []);

      const usersWithRoles = (profiles || []).map((profile) => ({
        ...profile,
        isAdmin: adminUserIds.has(profile.user_id),
      }));

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({ title: "Erro ao carregar usuários", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const confirmSuspend = async () => {
    if (!suspendDialog.user) return;
    try {
      const { error } = await supabase.rpc("admin_update_user_status", {
        target_user_id: suspendDialog.user.user_id,
        new_status: suspendDialog.action,
      });
      if (error) throw error;
      await fetchUsers();
      toast({
        title: suspendDialog.action === "active" ? "Acesso liberado" : "Acesso suspenso",
        description: "Status atualizado com sucesso!",
      });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
    } finally {
      setSuspendDialog({ open: false, user: null, action: "suspended" });
    }
  };

  const updateUserFlag = async (userId: string, field: "is_mentorado" | "is_w3_client", value: boolean) => {
    try {
      const { error } = await supabase.rpc("admin_update_user_flag", {
        target_user_id: userId,
        flag_name: field,
        flag_value: value,
      });
      if (error) throw error;
      await fetchUsers();
      toast({ title: "Atualizado com sucesso", description: "Flag atualizada!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    }
  };

  const updateUserPlan = async () => {
    if (!planDialog.user || !selectedPlan) return;
    try {
      const { error } = await supabase.rpc("admin_update_user_plan", {
        target_user_id: planDialog.user.user_id,
        new_plan: selectedPlan,
      });
      if (error) throw error;
      await fetchUsers();
      toast({ title: "Plano atualizado", description: `Plano alterado para ${getPlanName(selectedPlan)}!` });
      setPlanDialog({ open: false, user: null });
      setSelectedPlan("");
    } catch (error: any) {
      toast({ title: "Erro ao atualizar plano", description: error.message, variant: "destructive" });
    }
  };

  const updateUserRole = async (userId: string, makeAdmin: boolean) => {
    try {
      const { error } = await supabase.rpc("admin_update_role", {
        target_user_id: userId,
        make_admin: makeAdmin,
      });
      if (error) throw error;
      await fetchUsers();
      toast({ title: makeAdmin ? "Admin adicionado" : "Admin removido", description: "Papel atualizado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar papel", description: error.message, variant: "destructive" });
    }
  };

  const setExpiration = async () => {
    if (!expirationDialog.user) return;
    try {
      const expDate = expirationDate ? new Date(expirationDate).toISOString() : null;
      const { error } = await supabase.rpc("admin_set_expiration", {
        target_user_id: expirationDialog.user.user_id,
        expiration_date: expDate,
      });
      if (error) throw error;
      await fetchUsers();
      toast({
        title: "Expiração definida",
        description: expirationDate
          ? `Acesso expira em ${format(new Date(expirationDate), "dd/MM/yyyy", { locale: ptBR })}`
          : "Expiração removida",
      });
      setExpirationDialog({ open: false, user: null });
      setExpirationDate("");
    } catch (error: any) {
      toast({ title: "Erro ao definir expiração", description: error.message, variant: "destructive" });
    }
  };

  const updateUserName = async () => {
    if (!editNameDialog.user || !editedName.trim()) return;
    try {
      const { error } = await supabase.rpc("admin_update_user_name", {
        target_user_id: editNameDialog.user.user_id,
        new_name: editedName.trim(),
      });
      if (error) throw error;
      await fetchUsers();
      toast({ title: "Nome atualizado", description: "Nome do usuário alterado com sucesso!" });
      setEditNameDialog({ open: false, user: null });
      setEditedName("");
    } catch (error: any) {
      toast({ title: "Erro ao atualizar nome", description: error.message, variant: "destructive" });
    }
  };

  const deleteUser = async () => {
    if (!deleteDialog.user) return;
    try {
      const { error } = await supabase.rpc("admin_delete_user", {
        target_user_id: deleteDialog.user.user_id,
      });
      if (error) throw error;
      await fetchUsers();
      toast({ title: "Usuário removido", description: "O usuário foi removido do sistema." });
      setDeleteDialog({ open: false, user: null });
    } catch (error: any) {
      toast({ title: "Erro ao remover usuário", description: error.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordDialog.user || !tempPassword || tempPassword.length < 6) {
      toast({ title: "Erro", description: "A senha temporária deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: {
          target_user_id: resetPasswordDialog.user.user_id,
          temp_password: tempPassword,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Senha resetada",
        description: `Senha temporária definida para ${resetPasswordDialog.user.email}. O usuário será obrigado a criar uma nova senha no próximo login.`,
      });
      setResetPasswordDialog({ open: false, user: null });
      setTempPassword("");
    } catch (error: any) {
      toast({ title: "Erro ao resetar senha", description: error.message, variant: "destructive" });
    } finally {
      setResettingPassword(false);
    }
  };

  const sendInvite = async () => {
    if (!newUserEmail.trim()) {
      toast({ title: "Email obrigatório", description: "Informe o email do novo usuário.", variant: "destructive" });
      return;
    }
    if (!newUserPassword || newUserPassword.length < 6) {
      toast({ title: "Senha inválida", description: "A senha temporária deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setAddingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-bulk-users", {
        body: {
          users: [{
            email: newUserEmail.trim(),
            name: newUserName.trim() || undefined,
            plan: newUserPlan,
            is_mentorado: newUserMentorado,
            is_w3_client: newUserW3Client,
          }],
          default_password: newUserPassword,
        },
      });

      if (error) throw error;
      
      const result = data?.results?.[0];
      if (result?.status === "error") {
        throw new Error(result.message);
      }

      // If admin checkbox is checked, assign admin role
      if (newUserIsAdmin && result?.status === "success") {
        // We need the user_id — fetch it from profiles by email
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", newUserEmail.trim())
          .single();
        
        if (profile?.user_id) {
          await supabase.rpc("admin_update_role", {
            target_user_id: profile.user_id,
            make_admin: true,
          });
        }
      }

      await fetchUsers();
      toast({ title: "Usuário criado", description: `Conta criada com sucesso para ${newUserEmail}. Senha temporária: ${newUserPassword}` });
      setAddUserDialog(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPlan("free");
      setNewUserPassword("appw3acesso");
      setNewUserIsAdmin(false);
      setNewUserMentorado(false);
      setNewUserW3Client(false);
    } catch (error: any) {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    } finally {
      setAddingUser(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = search.toLowerCase();
    return user.email?.toLowerCase().includes(searchLower) || user.full_name?.toLowerCase().includes(searchLower);
  });

  const getStatusBadge = (user: UserProfile) => {
    if (user.access_status === "suspended") return <Badge variant="destructive">Suspenso</Badge>;
    if (user.access_expires_at && new Date(user.access_expires_at) < new Date()) return <Badge variant="secondary">Expirado</Badge>;
    return <Badge variant="default">Ativo</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "paid": return <Badge variant="default">Pago</Badge>;
      case "manual": return <Badge variant="outline">Manual</Badge>;
      default: return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case "paid": return "Pago";
      case "manual": return "Manual";
      default: return "Free";
    }
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

  // If viewing a user's plano de ação
  if (planoUser) {
    return (
      <AdminLayout>
        <UserPlanView
          user={{ user_id: planoUser.user_id, email: planoUser.email, full_name: planoUser.full_name }}
          onBack={() => setPlanoUser(null)}
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Gestão de Usuários</h2>
            <p className="text-sm text-muted-foreground">
              {users.length} usuários cadastrados
              {isAdmin && <span className="ml-2 text-primary">• Admin Mode</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkImportDialog(true)} className="gap-2">
              <UsersRound className="h-4 w-4" />
              Importar em Massa
            </Button>
            <Button onClick={() => setAddUserDialog(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Adicionar Usuário
            </Button>
          </div>
        </div>

        {/* WhatsApp Config */}
        <AdminWhatsAppConfig />

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por email ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-full" />
            </div>
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
                      <TableHead className="min-w-[70px]">Plano</TableHead>
                      <TableHead className="min-w-[100px]">Tipo</TableHead>
                      <TableHead className="min-w-[100px] hidden md:table-cell">Criado em</TableHead>
                      <TableHead className="min-w-[120px] hidden lg:table-cell">Último login</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.isAdmin && <Shield className="h-4 w-4 text-primary" />}
                            <div>
                              <div className="font-medium">{user.full_name || "Sem nome"}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell>{getPlanBadge(user.plan_type)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.is_mentorado && <Badge variant="outline" className="text-xs">Mentorado</Badge>}
                            {user.is_w3_client && <Badge variant="outline" className="text-xs">Cliente W3</Badge>}
                            {!user.is_mentorado && !user.is_w3_client && <span className="text-muted-foreground text-sm">-</span>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {user.last_login_at ? format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "-"}
                        </TableCell>
                        <TableCell className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setActionsDialog({ open: true, user })}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menu</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={actionsDialog.open}
        onOpenChange={(open) => setActionsDialog({ open, user: open ? actionsDialog.user : null })}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ações do usuário</DialogTitle>
            <DialogDescription>
              {actionsDialog.user?.email || "Selecione um usuário"}
            </DialogDescription>
          </DialogHeader>

          {actionsDialog.user && (
            <div className="grid gap-1 py-2">
              <Button variant="ghost" className="justify-start" onClick={() => { setEditNameDialog({ open: true, user: actionsDialog.user }); setEditedName(actionsDialog.user.full_name || ""); setActionsDialog({ open: false, user: null }); }}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar nome
              </Button>

              <Button variant="ghost" className="justify-start" onClick={() => { setSuspendDialog({ open: true, user: actionsDialog.user, action: actionsDialog.user.access_status === "suspended" ? "active" : "suspended" }); setActionsDialog({ open: false, user: null }); }}>
                {actionsDialog.user.access_status === "suspended" ? <Check className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                {actionsDialog.user.access_status === "suspended" ? "Liberar acesso" : "Suspender acesso"}
              </Button>

              <Button variant="ghost" className="justify-start" onClick={() => { setResetPasswordDialog({ open: true, user: actionsDialog.user }); setTempPassword(""); setActionsDialog({ open: false, user: null }); }}>
                <Key className="mr-2 h-4 w-4" />
                Resetar senha
              </Button>

              <div className="my-1 border-t border-border" />

              <Button variant="ghost" className="justify-start" onClick={() => { setPlanDialog({ open: true, user: actionsDialog.user }); setSelectedPlan(actionsDialog.user.plan_type); setActionsDialog({ open: false, user: null }); }}>
                <CreditCard className="mr-2 h-4 w-4" />
                Alterar plano
              </Button>

              <Button variant="ghost" className="justify-start" onClick={() => { setExpirationDialog({ open: true, user: actionsDialog.user }); setExpirationDate(actionsDialog.user.access_expires_at?.split("T")[0] || ""); setActionsDialog({ open: false, user: null }); }}>
                <Calendar className="mr-2 h-4 w-4" />
                Definir expiração
              </Button>

              <div className="my-1 border-t border-border" />

              <Button variant="ghost" className="justify-start" onClick={() => { setPlanoUser(actionsDialog.user); setActionsDialog({ open: false, user: null }); }}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Plano de Ação
              </Button>

              <Button variant="ghost" className="justify-start" onClick={() => { updateUserRole(actionsDialog.user.user_id, !actionsDialog.user.isAdmin); setActionsDialog({ open: false, user: null }); }}>
                <Shield className="mr-2 h-4 w-4" />
                {actionsDialog.user.isAdmin ? "Remover admin" : "Tornar admin"}
              </Button>

              <Button variant="ghost" className="justify-start" onClick={() => { updateUserFlag(actionsDialog.user.user_id, "is_mentorado", !actionsDialog.user.is_mentorado); setActionsDialog({ open: false, user: null }); }}>
                <Crown className="mr-2 h-4 w-4" />
                {actionsDialog.user.is_mentorado ? "Desmarcar Mentorado" : "Marcar como Mentorado"}
              </Button>

              <Button variant="ghost" className="justify-start" onClick={() => { updateUserFlag(actionsDialog.user.user_id, "is_w3_client", !actionsDialog.user.is_w3_client); setActionsDialog({ open: false, user: null }); }}>
                <Users className="mr-2 h-4 w-4" />
                {actionsDialog.user.is_w3_client ? "Desmarcar Cliente W3" : "Marcar como Cliente W3"}
              </Button>

              <div className="my-1 border-t border-border" />

              <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" onClick={() => { setDeleteDialog({ open: true, user: actionsDialog.user }); setActionsDialog({ open: false, user: null }); }}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remover usuário
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Plano */}
      <Dialog open={planDialog.open} onOpenChange={(open) => { setPlanDialog({ open, user: open ? planDialog.user : null }); if (!open) setSelectedPlan(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
            <DialogDescription>Selecione o novo plano para {planDialog.user?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de plano</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (Gratuito)</SelectItem>
                  <SelectItem value="paid">Paid (Pago)</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog({ open: false, user: null })}>Cancelar</Button>
            <Button onClick={updateUserPlan}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Expiração */}
      <Dialog open={expirationDialog.open} onOpenChange={(open) => { setExpirationDialog({ open, user: open ? expirationDialog.user : null }); if (!open) setExpirationDate(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Expiração</DialogTitle>
            <DialogDescription>Defina a expiração para {expirationDialog.user?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expiration">Data de expiração</Label>
              <Input id="expiration" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
              <p className="text-sm text-muted-foreground">Deixe em branco para remover</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpirationDialog({ open: false, user: null })}>Cancelar</Button>
            <Button onClick={setExpiration}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Nome */}
      <Dialog open={editNameDialog.open} onOpenChange={(open) => { setEditNameDialog({ open, user: open ? editNameDialog.user : null }); if (!open) setEditedName(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nome</DialogTitle>
            <DialogDescription>Altere o nome do usuário {editNameDialog.user?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Nome completo</Label>
              <Input id="userName" value={editedName} onChange={(e) => setEditedName(e.target.value)} placeholder="Digite o nome do usuário" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNameDialog({ open: false, user: null })}>Cancelar</Button>
            <Button onClick={updateUserName} disabled={!editedName.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Usuário */}
      <Dialog open={addUserDialog} onOpenChange={(open) => {
        setAddUserDialog(open);
        if (!open) {
          setNewUserEmail(""); setNewUserName(""); setNewUserPlan("free");
          setNewUserPassword("appw3acesso"); setNewUserIsAdmin(false);
          setNewUserMentorado(false); setNewUserW3Client(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            <DialogDescription>O usuário será criado com acesso imediato usando a senha temporária definida.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email</Label>
              <Input id="newEmail" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="usuario@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newName">Nome (opcional)</Label>
              <Input id="newName" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nome do usuário" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Senha temporária</Label>
              <Input id="newPassword" type="text" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              <p className="text-sm text-muted-foreground">Padrão: appw3acesso</p>
            </div>
            <div className="space-y-2">
              <Label>Plano inicial</Label>
              <Select value={newUserPlan} onValueChange={setNewUserPlan}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (Gratuito)</SelectItem>
                  <SelectItem value="paid">Paid (Pago)</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="newUserAdmin" checked={newUserIsAdmin} onCheckedChange={(v) => setNewUserIsAdmin(v === true)} />
                <Label htmlFor="newUserAdmin" className="flex items-center gap-1.5 cursor-pointer">
                  <Shield className="h-4 w-4 text-primary" /> Tornar Admin
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="newUserMentorado" checked={newUserMentorado} onCheckedChange={(v) => setNewUserMentorado(v === true)} />
                <Label htmlFor="newUserMentorado" className="cursor-pointer">Mentorado</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="newUserW3Client" checked={newUserW3Client} onCheckedChange={(v) => setNewUserW3Client(v === true)} />
                <Label htmlFor="newUserW3Client" className="cursor-pointer">Cliente W3</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialog(false)}>Cancelar</Button>
            <Button onClick={sendInvite} disabled={addingUser || !newUserEmail.trim() || newUserPassword.length < 6}>
              {addingUser ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Suspender/Liberar */}
      <AlertDialog open={suspendDialog.open} onOpenChange={(open) => setSuspendDialog({ open, user: open ? suspendDialog.user : null, action: suspendDialog.action })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{suspendDialog.action === "suspended" ? "Suspender Acesso" : "Liberar Acesso"}</AlertDialogTitle>
            <AlertDialogDescription>
              {suspendDialog.action === "suspended"
                ? <>Tem certeza que deseja <strong>suspender</strong> o acesso de <strong>{suspendDialog.user?.email}</strong>? O usuário não conseguirá acessar o sistema até ser reativado.</>
                : <>Tem certeza que deseja <strong>liberar</strong> o acesso de <strong>{suspendDialog.user?.email}</strong>?</>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSuspend}
              className={suspendDialog.action === "suspended" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {suspendDialog.action === "suspended" ? "Suspender" : "Liberar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Resetar Senha */}
      <Dialog open={resetPasswordDialog.open} onOpenChange={(open) => { setResetPasswordDialog({ open, user: open ? resetPasswordDialog.user : null }); if (!open) setTempPassword(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
            <DialogDescription>
              Defina uma senha temporária para <strong>{resetPasswordDialog.user?.email}</strong>. O usuário será obrigado a criar uma nova senha no próximo login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tempPassword">Senha temporária</Label>
              <Input
                id="tempPassword"
                type="text"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <p className="text-sm text-muted-foreground">Compartilhe esta senha com o usuário de forma segura.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordDialog({ open: false, user: null })}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword || tempPassword.length < 6}>
              {resettingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetando...</> : "Resetar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Confirmação de Exclusão */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: open ? deleteDialog.user : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuário <strong>{deleteDialog.user?.email}</strong>?
              <br /><br />
              Esta ação irá remover o perfil e dados associados. O usuário não poderá mais acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Import Dialog */}
      <BulkUserImportDialog open={bulkImportDialog} onOpenChange={setBulkImportDialog} onSuccess={fetchUsers} />
    </AdminLayout>
  );
}

// ============================================================
// UserPlanView (moved from AdminPlanoAcao.tsx)
// ============================================================

const MIRO_PREFIX = "https://miro.com/app/live-embed/";
const SRC_REGEX = /src="([^"]+)"/;

interface UserPlanViewUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
}

function UserPlanView({ user, onBack }: { user: UserPlanViewUser; onBack: () => void }) {
  const {
    tasks, loading, progress, completedCount, totalCount,
    updateTaskStatus, updateTaskDueDate, createTask, updateTask, deleteTask, reorderTasks,
  } = useTasks(user.user_id);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const [embedSrc, setEmbedSrc] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEmbed = async () => {
      const { data } = await supabase.from("miro_embeds").select("embed_src").eq("user_id", user.user_id).maybeSingle();
      if (data?.embed_src) { setEmbedSrc(data.embed_src); setInputValue(data.embed_src); }
    };
    fetchEmbed();
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
    if (error) { toast({ title: "Erro ao salvar embed", variant: "destructive" }); }
    else { setEmbedSrc(extracted); toast({ title: "Embed salvo com sucesso!" }); }
  };

  const handleRemoveEmbed = async () => {
    const { error } = await supabase.from("miro_embeds").delete().eq("user_id", user.user_id);
    if (error) { toast({ title: "Erro ao remover embed", variant: "destructive" }); }
    else { setEmbedSrc(""); setInputValue(""); toast({ title: "Embed removido" }); }
  };

  const amesTasks = useMemo(() => tasks.filter(t => t.origin !== 'mentorado'), [tasks]);
  const personalTasks = useMemo(() => tasks.filter(t => t.origin === 'mentorado'), [tasks]);

  const tasksBySection = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    SECTIONS.forEach(section => { grouped[section] = amesTasks.filter(t => t.section === section); });
    return grouped;
  }, [amesTasks]);

  const handleSubmitTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    if (editTask) { await updateTask(editTask.id, taskData); setEditTask(null); return editTask; }
    else { return await createTask(taskData); }
  };

  const handleEditTask = (task: Task) => { setEditTask(task); setAddDialogOpen(true); };
  const handleAddToSection = (section: string) => { setSelectedSection(section); setEditTask(null); setAddDialogOpen(true); };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
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
                  <Button variant="ghost" size="sm" onClick={() => handleAddToSection(section)}>
                    <Plus className="mr-1 h-3 w-3" />Adicionar
                  </Button>
                </div>
                {tasksBySection[section].length > 0 ? (
                  <Accordion type="multiple" defaultValue={[section]} className="space-y-2">
                    <TaskSection section={section} tasks={tasksBySection[section]} onStatusChange={updateTaskStatus} onDueDateChange={updateTaskDueDate} onReorder={reorderTasks} onEdit={handleEditTask} onDelete={deleteTask} canEdit={true} canDelete={true} />
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
            <Button onClick={() => { setSelectedSection('Personalizado'); setEditTask(null); setAddDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />Adicionar ação personalizada
            </Button>
          </div>
          {personalTasks.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-12"><AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" /><p className="text-lg font-medium text-muted-foreground">Nenhuma ação personalizada ainda</p></CardContent></Card>
          ) : (
            <Accordion type="multiple" defaultValue={["Personalizado"]} className="space-y-2">
              <TaskSection section="Personalizado" tasks={personalTasks.map(t => ({ ...t, section: 'Personalizado' }))} onStatusChange={updateTaskStatus} onDueDateChange={updateTaskDueDate} onReorder={reorderTasks} onEdit={handleEditTask} onDelete={deleteTask} canEdit={true} canDelete={true} />
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="mapa-mental" className="mt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Cole o iframe HTML do Miro ou a URL direta do embed:</p>
              <Textarea value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder='<iframe src="https://miro.com/app/live-embed/..." />' rows={4} className="font-mono text-xs" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEmbed} disabled={saving || !inputValue.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar embed
              </Button>
              {embedSrc && (
                <Button variant="destructive" onClick={handleRemoveEmbed}>
                  <Trash2 className="mr-2 h-4 w-4" />Remover
                </Button>
              )}
            </div>
            {embedSrc && embedSrc.startsWith(MIRO_PREFIX) && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Preview:</p>
                <div className="w-full rounded-lg overflow-hidden border">
                  <iframe src={embedSrc} className="w-full" style={{ height: "500px" }} allow="fullscreen; clipboard-read; clipboard-write" allowFullScreen />
                </div>
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
        isAdmin={true}
      />
    </div>
  );
}
