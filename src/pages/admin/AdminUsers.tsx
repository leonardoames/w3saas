import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { 
  Calendar,
  Check,
  Crown,
  Loader2,
  MoreHorizontal, 
  Search, 
  Shield, 
  UserX,
  Users,
  X
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
  const { toast } = useToast();

  // Dialog states
  const [expirationDialog, setExpirationDialog] = useState<{ open: boolean; user: UserProfile | null }>({
    open: false,
    user: null,
  });
  const [expirationDate, setExpirationDate] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch admin roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(roles?.map(r => r.user_id) || []);

      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        isAdmin: adminUserIds.has(profile.user_id),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, status: 'active' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ access_status: status })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.user_id === userId ? { ...u, access_status: status } : u
      ));

      toast({
        title: status === 'active' ? "Acesso liberado" : "Acesso suspenso",
        description: `O status do usuário foi atualizado.`,
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive",
      });
    }
  };

  const updateUserFlag = async (userId: string, field: 'is_mentorado' | 'is_w3_client', value: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.user_id === userId ? { ...u, [field]: value } : u
      ));

      toast({
        title: "Atualizado",
        description: `Flag atualizada com sucesso.`,
      });
    } catch (error) {
      console.error('Error updating user flag:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar.",
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (userId: string, makeAdmin: boolean) => {
    try {
      if (makeAdmin) {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        if (error) throw error;
      }

      setUsers(users.map(u => 
        u.user_id === userId ? { ...u, isAdmin: makeAdmin } : u
      ));

      toast({
        title: makeAdmin ? "Admin adicionado" : "Admin removido",
        description: `O papel do usuário foi atualizado.`,
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o papel.",
        variant: "destructive",
      });
    }
  };

  const setExpiration = async () => {
    if (!expirationDialog.user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          access_expires_at: expirationDate ? new Date(expirationDate).toISOString() : null 
        })
        .eq('user_id', expirationDialog.user.user_id);

      if (error) throw error;

      setUsers(users.map(u => 
        u.user_id === expirationDialog.user?.user_id 
          ? { ...u, access_expires_at: expirationDate || null } 
          : u
      ));

      toast({
        title: "Expiração definida",
        description: expirationDate 
          ? `Acesso expira em ${format(new Date(expirationDate), "dd/MM/yyyy", { locale: ptBR })}`
          : "Expiração removida",
      });

      setExpirationDialog({ open: false, user: null });
      setExpirationDate("");
    } catch (error) {
      console.error('Error setting expiration:', error);
      toast({
        title: "Erro",
        description: "Não foi possível definir a expiração.",
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
        description: `Um email de redefinição foi enviado para ${email}.`,
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o email de redefinição.",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = search.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (user: UserProfile) => {
    if (user.access_status === 'suspended') {
      return <Badge variant="destructive">Suspenso</Badge>;
    }
    if (user.access_expires_at && new Date(user.access_expires_at) < new Date()) {
      return <Badge variant="secondary">Expirado</Badge>;
    }
    return <Badge variant="default">Ativo</Badge>;
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'paid':
        return <Badge variant="default">Pago</Badge>;
      case 'manual':
        return <Badge variant="outline">Manual</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Gestão de Usuários</h2>
            <p className="text-sm text-muted-foreground">
              {users.length} usuários cadastrados
            </p>
          </div>
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
          <CardContent className="p-0 sm:p-6 sm:pt-0">
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
                            {user.isAdmin && (
                              <Shield className="h-4 w-4 text-primary" />
                            )}
                            <div>
                              <div className="font-medium">
                                {user.full_name || 'Sem nome'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.email}
                              </div>
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
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              {user.access_status === 'suspended' ? (
                                <DropdownMenuItem onClick={() => updateUserStatus(user.user_id, 'active')}>
                                  <Check className="mr-2 h-4 w-4" />
                                  Liberar acesso
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => updateUserStatus(user.user_id, 'suspended')}>
                                  <UserX className="mr-2 h-4 w-4" />
                                  Suspender acesso
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem onClick={() => user.email && resetPassword(user.email)}>
                                Resetar senha
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem onClick={() => updateUserRole(user.user_id, !user.isAdmin)}>
                                <Shield className="mr-2 h-4 w-4" />
                                {user.isAdmin ? "Remover admin" : "Tornar admin"}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem onClick={() => updateUserFlag(user.user_id, 'is_mentorado', !user.is_mentorado)}>
                                <Crown className="mr-2 h-4 w-4" />
                                {user.is_mentorado ? "Desmarcar Mentorado" : "Marcar como Mentorado"}
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => updateUserFlag(user.user_id, 'is_w3_client', !user.is_w3_client)}>
                                <Users className="mr-2 h-4 w-4" />
                                {user.is_w3_client ? "Desmarcar Cliente W3" : "Marcar como Cliente W3"}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem onClick={() => {
                                setExpirationDialog({ open: true, user });
                                setExpirationDate(user.access_expires_at?.split('T')[0] || '');
                              }}>
                                <Calendar className="mr-2 h-4 w-4" />
                                Definir expiração
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

      {/* Expiration Dialog */}
      <Dialog open={expirationDialog.open} onOpenChange={(open) => setExpirationDialog({ open, user: open ? expirationDialog.user : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir Expiração</DialogTitle>
            <DialogDescription>
              Defina uma data de expiração para o acesso de {expirationDialog.user?.email}
            </DialogDescription>
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
              <p className="text-sm text-muted-foreground">
                Deixe em branco para remover a expiração
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpirationDialog({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button onClick={setExpiration}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
