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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Calendar,
  Check,
  CreditCard,
  Crown,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Shield,
  Trash2,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  // Dialog states
  const [expirationDialog, setExpirationDialog] = useState<{
    open: boolean;
    user: UserProfile | null;
  }>({
    open: false,
    user: null,
  });
  const [expirationDate, setExpirationDate] = useState("");

  const [planDialog, setPlanDialog] = useState<{
    open: boolean;
    user: UserProfile | null;
  }>({
    open: false,
    user: null,
  });
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  // Edit name dialog
  const [editNameDialog, setEditNameDialog] = useState<{
    open: boolean;
    user: UserProfile | null;
  }>({
    open: false,
    user: null,
  });
  const [editedName, setEditedName] = useState("");

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    user: UserProfile | null;
  }>({
    open: false,
    user: null,
  });

  // Add user dialog
  const [addUserDialog, setAddUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPlan, setNewUserPlan] = useState("free");
  const [addingUser, setAddingUser] = useState(false);

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
      toast({
        title: "Erro ao carregar usuários",
        description: error.message || "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, status: "active" | "suspended") => {
    try {
      const { error } = await supabase.rpc("admin_update_user_status", {
        target_user_id: userId,
        new_status: status,
      });

      if (error) throw error;

      await fetchUsers();

      toast({
        title: status === "active" ? "Acesso liberado" : "Acesso suspenso",
        description: "Status atualizado com sucesso!",
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Verifique suas permissões de admin.",
        variant: "destructive",
      });
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

      toast({
        title: "Atualizado com sucesso",
        description: "Flag atualizada!",
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Verifique suas permissões.",
        variant: "destructive",
      });
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

      toast({
        title: "Plano atualizado",
        description: `Plano alterado para ${getPlanName(selectedPlan)}!`,
      });

      setPlanDialog({ open: false, user: null });
      setSelectedPlan("");
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro ao atualizar plano",
        description: error.message || "Verifique suas permissões.",
        variant: "destructive",
      });
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

      toast({
        title: makeAdmin ? "Admin adicionado" : "Admin removido",
        description: "Papel atualizado com sucesso!",
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro ao atualizar papel",
        description: error.message || "Verifique suas permissões.",
        variant: "destructive",
      });
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
      console.error("Error:", error);
      toast({
        title: "Erro ao definir expiração",
        description: error.message || "Verifique suas permissões.",
        variant: "destructive",
      });
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

      toast({
        title: "Nome atualizado",
        description: "Nome do usuário alterado com sucesso!",
      });

      setEditNameDialog({ open: false, user: null });
      setEditedName("");
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro ao atualizar nome",
        description: error.message || "Verifique suas permissões.",
        variant: "destructive",
      });
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

      toast({
        title: "Usuário removido",
        description: "O usuário foi removido do sistema.",
      });

      setDeleteDialog({ open: false, user: null });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro ao remover usuário",
        description: error.message || "Verifique suas permissões.",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Email enviado",
        description: `Email de redefinição enviado para ${email}.`,
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o email.",
        variant: "destructive",
      });
    }
  };

  const sendInvite = async () => {
    if (!newUserEmail.trim()) {
      toast({
        title: "Email obrigatório",
        description: "Informe o email do novo usuário.",
        variant: "destructive",
      });
      return;
    }

    setAddingUser(true);

    try {
      // Enviar convite de recuperação de senha (funciona como convite)
      const { error } = await supabase.auth.resetPasswordForEmail(newUserEmail.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Convite enviado",
        description: `Um email foi enviado para ${newUserEmail} com instruções para criar a senha.`,
      });

      setAddUserDialog(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPlan("free");
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Erro ao enviar convite",
        description: error.message || "Não foi possível enviar o convite.",
        variant: "destructive",
      });
    } finally {
      setAddingUser(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = search.toLowerCase();
    return user.email?.toLowerCase().includes(searchLower) || user.full_name?.toLowerCase().includes(searchLower);
  });

  const getStatusBadge = (user: UserProfile) => {
    if (user.access_status === "suspended") {
      return <Badge variant="destructive">Suspenso</Badge>;
    }
    if (user.access_expires_at && new Date(user.access_expires_at) < new Date()) {
      return <Badge variant="secondary">Expirado</Badge>;
    }
    return <Badge variant="default">Ativo</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "paid":
        return <Badge variant="default">Pago</Badge>;
      case "manual":
        return <Badge variant="outline">Manual</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getPlanName = (plan: string) => {
    switch (plan) {
      case "paid":
        return "Pago";
      case "manual":
        return "Manual";
      default:
        return "Free";
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
          <Button onClick={() => setAddUserDialog(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Adicionar Usuário
          </Button>
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
          <CardContent className="p-0 sm:p-6 sm:pt-0 overflow-visible">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible">
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
                            {user.is_mentorado && (
                              <Badge variant="outline" className="text-xs">
                                Mentorado
                              </Badge>
                            )}
                            {user.is_w3_client && (
                              <Badge variant="outline" className="text-xs">
                                Cliente W3
                              </Badge>
                            )}
                            {!user.is_mentorado && !user.is_w3_client && (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {user.last_login_at
                            ? format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell className="relative">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Abrir menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              align="end" 
                              className="w-56 z-[100] bg-popover border shadow-lg"
                              sideOffset={5}
                            >
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  setEditNameDialog({ open: true, user });
                                  setEditedName(user.full_name || "");
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar nome
                              </DropdownMenuItem>

                              {user.access_status === "suspended" ? (
                                <DropdownMenuItem onClick={() => updateUserStatus(user.user_id, "active")}>
                                  <Check className="mr-2 h-4 w-4" />
                                  Liberar acesso
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => updateUserStatus(user.user_id, "suspended")}>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Suspender acesso
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem onClick={() => user.email && resetPassword(user.email)}>
                                Resetar senha
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  setPlanDialog({ open: true, user });
                                  setSelectedPlan(user.plan_type);
                                }}
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Alterar plano
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setExpirationDialog({ open: true, user });
                                  setExpirationDate(user.access_expires_at?.split("T")[0] || "");
                                }}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                Definir expiração
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem onClick={() => updateUserRole(user.user_id, !user.isAdmin)}>
                                <Shield className="mr-2 h-4 w-4" />
                                {user.isAdmin ? "Remover admin" : "Tornar admin"}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => updateUserFlag(user.user_id, "is_mentorado", !user.is_mentorado)}
                              >
                                <Crown className="mr-2 h-4 w-4" />
                                {user.is_mentorado ? "Desmarcar Mentorado" : "Marcar como Mentorado"}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => updateUserFlag(user.user_id, "is_w3_client", !user.is_w3_client)}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                {user.is_w3_client ? "Desmarcar Cliente W3" : "Marcar como Cliente W3"}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteDialog({ open: true, user })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remover usuário
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Dialog Plano */}
      <Dialog
        open={planDialog.open}
        onOpenChange={(open) => {
          setPlanDialog({ open, user: open ? planDialog.user : null });
          if (!open) setSelectedPlan("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Plano</DialogTitle>
            <DialogDescription>Selecione o novo plano para {planDialog.user?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de plano</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (Gratuito)</SelectItem>
                  <SelectItem value="paid">Paid (Pago)</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button onClick={updateUserPlan}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Expiração */}
      <Dialog
        open={expirationDialog.open}
        onOpenChange={(open) => {
          setExpirationDialog({ open, user: open ? expirationDialog.user : null });
          if (!open) setExpirationDate("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Expiração</DialogTitle>
            <DialogDescription>Defina a expiração para {expirationDialog.user?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expiration">Data de expiração</Label>
              <Input
                id="expiration"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">Deixe em branco para remover</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpirationDialog({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button onClick={setExpiration}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Nome */}
      <Dialog
        open={editNameDialog.open}
        onOpenChange={(open) => {
          setEditNameDialog({ open, user: open ? editNameDialog.user : null });
          if (!open) setEditedName("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nome</DialogTitle>
            <DialogDescription>Altere o nome do usuário {editNameDialog.user?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="userName">Nome completo</Label>
              <Input
                id="userName"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Digite o nome do usuário"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNameDialog({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button onClick={updateUserName} disabled={!editedName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Adicionar Usuário */}
      <Dialog open={addUserDialog} onOpenChange={setAddUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            <DialogDescription>
              Um email será enviado para o usuário com instruções para criar a senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="usuario@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newName">Nome (opcional)</Label>
              <Input
                id="newName"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nome do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label>Plano inicial</Label>
              <Select value={newUserPlan} onValueChange={setNewUserPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (Gratuito)</SelectItem>
                  <SelectItem value="paid">Paid (Pago)</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={sendInvite} disabled={addingUser || !newUserEmail.trim()}>
              {addingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Convite"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Confirmação de Exclusão */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, user: open ? deleteDialog.user : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o usuário <strong>{deleteDialog.user?.email}</strong>?
              <br />
              <br />
              Esta ação irá remover o perfil e dados associados. O usuário não poderá mais acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
