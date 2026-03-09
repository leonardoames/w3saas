import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Shield, Crown, Users, Key, Trash2, Save,
  ClipboardList, Calendar, CreditCard, UserX, Check,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  access_status: string;
  is_mentorado_deprecated: boolean;
  is_w3_client_deprecated: boolean;
  plan_type: string;
  access_expires_at: string | null;
  last_login_at: string | null;
  created_at: string;
  revenue_goal?: number | null;
  isAdmin?: boolean;
}

interface UserEditSheetProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onViewPlano: (user: UserProfile) => void;
}

export function UserEditSheet({ user, open, onOpenChange, onRefresh, onViewPlano }: UserEditSheetProps) {
  const { toast } = useToast();

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [accessStatus, setAccessStatus] = useState("");
  const [planType, setPlanType] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isMentorado, setIsMentorado] = useState(false);
  const [isW3Client, setIsW3Client] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [revenueGoal, setRevenueGoal] = useState("");

  // Action states
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  // Initialize form when user changes
  const initForm = (u: UserProfile) => {
    setFullName(u.full_name || "");
    setAccessStatus(u.access_status);
    setPlanType(u.plan_type);
    setExpirationDate(u.access_expires_at?.split("T")[0] || "");
    setIsMentorado(u.is_mentorado_deprecated);
    setIsW3Client(u.is_w3_client_deprecated);
    setIsAdmin(u.isAdmin || false);
    setRevenueGoal(u.revenue_goal?.toString() || "");
  };

  // Reset form when sheet opens/closes
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && user) {
      initForm(user);
    }
    onOpenChange(isOpen);
  };

  if (!user) return null;

  const hasChanges = () => {
    if (!user) return false;
    return (
      fullName !== (user.full_name || "") ||
      accessStatus !== user.access_status ||
      planType !== user.plan_type ||
      expirationDate !== (user.access_expires_at?.split("T")[0] || "") ||
      isMentorado !== user.is_mentorado_deprecated ||
      isW3Client !== user.is_w3_client_deprecated ||
      isAdmin !== (user.isAdmin || false) ||
      revenueGoal !== (user.revenue_goal?.toString() || "")
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const promises: Promise<any>[] = [];

      // Name
      if (fullName !== (user.full_name || "")) {
        promises.push(
          supabase.rpc("admin_update_user_name", {
            target_user_id: user.user_id,
            new_name: fullName.trim(),
          })
        );
      }

      // Status
      if (accessStatus !== user.access_status) {
        promises.push(
          supabase.rpc("admin_update_user_status", {
            target_user_id: user.user_id,
            new_status: accessStatus,
          })
        );
      }

      // Plan
      if (planType !== user.plan_type) {
        promises.push(
          supabase.rpc("admin_update_user_plan", {
            target_user_id: user.user_id,
            new_plan: planType,
          })
        );
      }

      // Expiration
      if (expirationDate !== (user.access_expires_at?.split("T")[0] || "")) {
        const expDate = expirationDate ? new Date(expirationDate).toISOString() : null;
        promises.push(
          supabase.rpc("admin_set_expiration", {
            target_user_id: user.user_id,
            expiration_date: expDate,
          })
        );
      }

      // Mentorado flag
      if (isMentorado !== user.is_mentorado_deprecated) {
        promises.push(
          supabase.rpc("admin_update_user_flag", {
            target_user_id: user.user_id,
            flag_name: "is_mentorado",
            flag_value: isMentorado,
          })
        );
      }

      // W3 Client flag
      if (isW3Client !== user.is_w3_client_deprecated) {
        promises.push(
          supabase.rpc("admin_update_user_flag", {
            target_user_id: user.user_id,
            flag_name: "is_w3_client",
            flag_value: isW3Client,
          })
        );
      }

      // Admin role
      if (isAdmin !== (user.isAdmin || false)) {
        promises.push(
          supabase.rpc("admin_update_role", {
            target_user_id: user.user_id,
            make_admin: isAdmin,
          })
        );
      }

      // Revenue Goal
      if (revenueGoal !== (user.revenue_goal?.toString() || "")) {
        const goalValue = revenueGoal ? parseFloat(revenueGoal) : null;
        promises.push(
          supabase.rpc("admin_update_revenue_goal", {
            target_user_id: user.user_id,
            new_goal: goalValue,
          })
        );
      }

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        console.error("Errors saving:", errors);
        toast({
          title: "Erro parcial",
          description: `${errors.length} de ${promises.length} alterações falharam.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Salvo com sucesso", description: "Todas as alterações foram aplicadas." });
        onRefresh();
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user || !tempPassword || tempPassword.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { target_user_id: user.user_id, temp_password: tempPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Senha resetada", description: `Senha temporária definida para ${user.email}.` });
      setResetPasswordOpen(false);
      setTempPassword("");
    } catch (error: any) {
      toast({ title: "Erro ao resetar senha", description: error.message, variant: "destructive" });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc("admin_delete_user", { target_user_id: user.user_id });
      if (error) throw error;
      toast({ title: "Usuário removido", description: "O usuário foi removido do sistema." });
      setDeleteDialogOpen(false);
      onRefresh();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:w-[520px] border-l border-border p-0 flex flex-col"
        >
          <SheetHeader className="px-6 py-5 border-b border-border">
            <SheetTitle className="text-foreground flex items-center gap-2">
              {user.isAdmin && <Shield className="h-4 w-4 text-primary" />}
              Editar Usuário
            </SheetTitle>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Info Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações</h3>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome completo</Label>
                <Input
                  id="edit-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome do usuário"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Cadastro</span>
                  <p className="font-medium">{format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Último login</span>
                  <p className="font-medium">
                    {user.last_login_at
                      ? format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "Nunca"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Access Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acesso</h3>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={accessStatus} onValueChange={setAccessStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <span className="flex items-center gap-2">
                        <Check className="h-3 w-3 text-emerald-500" /> Ativo
                      </span>
                    </SelectItem>
                    <SelectItem value="suspended">
                      <span className="flex items-center gap-2">
                        <UserX className="h-3 w-3 text-destructive" /> Suspenso
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={planType} onValueChange={setPlanType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free (Gratuito)</SelectItem>
                    <SelectItem value="paid">Paid (Pago)</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-expiration">Data de expiração</Label>
                <Input
                  id="edit-expiration"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Deixe em branco para acesso sem expiração</p>
              </div>
            </div>

            <Separator />

            {/* Flags Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permissões & Flags</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <Label htmlFor="edit-admin" className="cursor-pointer">Administrador</Label>
                  </div>
                  <Switch id="edit-admin" checked={isAdmin} onCheckedChange={setIsAdmin} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <Label htmlFor="edit-mentorado" className="cursor-pointer">Mentorado</Label>
                  </div>
                  <Switch id="edit-mentorado" checked={isMentorado} onCheckedChange={setIsMentorado} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <Label htmlFor="edit-w3client" className="cursor-pointer">Cliente W3</Label>
                  </div>
                  <Switch id="edit-w3client" checked={isW3Client} onCheckedChange={setIsW3Client} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Revenue Goal */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-revenue-goal">Meta de faturamento (R$)</Label>
                <Input
                  id="edit-revenue-goal"
                  type="number"
                  min="0"
                  step="100"
                  value={revenueGoal}
                  onChange={(e) => setRevenueGoal(e.target.value)}
                  placeholder="Ex: 50000"
                />
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</h3>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  onViewPlano(user);
                  onOpenChange(false);
                }}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Ver Plano de Ação
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setResetPasswordOpen(true)}
              >
                <Key className="mr-2 h-4 w-4" />
                Resetar Senha
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remover Usuário
              </Button>
            </div>
          </div>

          {/* Footer with Save */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reset Password Dialog */}
      <AlertDialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Defina uma senha temporária para <strong>{user.email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="temp-pwd">Senha temporária</Label>
            <Input
              id="temp-pwd"
              type="text"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPassword}
              disabled={resettingPassword || tempPassword.length < 6}
            >
              {resettingPassword ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Resetar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{user.email}</strong>?
              <br />
              Esta ação irá remover o perfil e dados associados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
