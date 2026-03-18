import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { BusinessInfoSection } from "@/components/admin/BusinessInfoSection";
import {
  Loader2, Shield, Crown, Users, Key, Trash2, Save,
  ClipboardList, Check, UserX, ChevronDown, GraduationCap, ShoppingBag,
  UserPlus, X, Search,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  revenue_goal?: number | null;
  isAdmin?: boolean;
}

interface UserEditSheetProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  onViewPlano: (user: UserProfile) => void;
  onViewCRM?: (user: UserProfile) => void;
}

// ─── Inline carteira / team manager ────────────────────────────
interface SimpleUser { user_id: string; email: string | null; full_name: string | null; }

function CarteiraSection({
  staffId,
  mode,
}: {
  staffId: string;
  mode: "cs" | "tutor";
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [candidates, setCandidates] = useState<SimpleUser[]>([]);
  const [candLoading, setCandLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    if (mode === "cs") {
      const { data } = await supabase.from("staff_carteiras" as any).select("mentorado_id").eq("staff_id", staffId);
      const ids = (data ?? []).map((r: any) => r.mentorado_id);
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name").in("user_id", ids);
        setItems(profiles ?? []);
      } else setItems([]);
    } else {
      const { data } = await supabase.from("tutor_teams" as any).select("cs_id").eq("tutor_id", staffId);
      const ids = (data ?? []).map((r: any) => r.cs_id);
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name").in("user_id", ids);
        setItems(profiles ?? []);
      } else setItems([]);
    }
    setLoading(false);
  };

  const loadCandidates = async () => {
    setCandLoading(true);
    if (mode === "cs") {
      // All users with cliente_w3 or cliente_ames
      const { data: roles } = await supabase.from("user_roles").select("user_id").in("role", ["cliente_w3", "cliente_ames"]);
      const ids = [...new Set((roles ?? []).map((r) => r.user_id))].filter((id) => !items.find((i) => i.user_id === id));
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name").in("user_id", ids);
        setCandidates(profiles ?? []);
      } else setCandidates([]);
    } else {
      // All users with cs role
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "cs");
      const ids = (roles ?? []).map((r) => r.user_id).filter((id) => !items.find((i) => i.user_id === id));
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, email, full_name").in("user_id", ids);
        setCandidates(profiles ?? []);
      } else setCandidates([]);
    }
    setCandLoading(false);
  };

  useEffect(() => { load(); }, [staffId, mode]);

  const handleAdd = async (target: SimpleUser) => {
    const rpc = mode === "cs" ? "admin_assign_staff_carteira" : "admin_assign_tutor_team";
    const params = mode === "cs"
      ? { p_staff_id: staffId, p_mentorado_id: target.user_id, p_assign: true }
      : { p_tutor_id: staffId, p_cs_id: target.user_id, p_assign: true };
    const { error } = await supabase.rpc(rpc as any, params);
    if (error) { toast({ title: "Erro ao atribuir", description: error.message, variant: "destructive" }); return; }
    toast({ title: mode === "cs" ? "Mentorado adicionado" : "CS adicionada" });
    setPickerOpen(false);
    load();
  };

  const handleRemove = async (target: SimpleUser) => {
    const rpc = mode === "cs" ? "admin_assign_staff_carteira" : "admin_assign_tutor_team";
    const params = mode === "cs"
      ? { p_staff_id: staffId, p_mentorado_id: target.user_id, p_assign: false }
      : { p_tutor_id: staffId, p_cs_id: target.user_id, p_assign: false };
    const { error } = await supabase.rpc(rpc as any, params);
    if (error) { toast({ title: "Erro ao remover", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const filteredCands = candidates.filter(
    (c) => c.email?.toLowerCase().includes(pickerSearch.toLowerCase()) || c.full_name?.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{items.length} {mode === "cs" ? "mentorado(s)" : "CS(s)"}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => { loadCandidates(); setPickerOpen(true); }}
        >
          <UserPlus className="mr-1 h-3 w-3" />
          {mode === "cs" ? "Adicionar mentorado" : "Adicionar CS"}
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          {mode === "cs" ? "Nenhum mentorado nesta carteira." : "Nenhuma CS neste time."}
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((u) => (
            <div key={u.user_id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border bg-muted/30 text-sm">
              <div className="min-w-0">
                <span className="font-medium truncate">{u.full_name || u.email}</span>
                {u.full_name && <span className="text-xs text-muted-foreground ml-1.5">{u.email}</span>}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleRemove(u)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Picker inline dropdown */}
      {pickerOpen && (
        <div className="border rounded-lg p-3 space-y-2 bg-card shadow-sm">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {candLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : filteredCands.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">Nenhum resultado</p>
            ) : filteredCands.map((c) => (
              <button
                key={c.user_id}
                type="button"
                className="w-full text-left px-2.5 py-1.5 rounded text-sm hover:bg-accent transition-colors"
                onClick={() => handleAdd(c)}
              >
                <span className="font-medium">{c.full_name || c.email}</span>
                {c.full_name && <span className="text-xs text-muted-foreground ml-1.5">{c.email}</span>}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => { setPickerOpen(false); setPickerSearch(""); }}>
            Fechar
          </Button>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
export function UserEditSheet({ user, open, onOpenChange, onRefresh, onViewPlano, onViewCRM }: UserEditSheetProps) {
  const { toast } = useToast();

  // Base fields
  const [fullName, setFullName] = useState("");
  const [accessStatus, setAccessStatus] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [revenueGoal, setRevenueGoal] = useState("");

  // New: product roles
  const [isClienteW3, setIsClienteW3] = useState(false);
  const [isClienteAmes, setIsClienteAmes] = useState(false);
  const [originalClienteW3, setOriginalClienteW3] = useState(false);
  const [originalClienteAmes, setOriginalClienteAmes] = useState(false);

  // Dash admin role
  const [dashRole, setDashRole] = useState<string>("none");
  const [originalDashRole, setOriginalDashRole] = useState<string>("none");

  // Legacy fields
  const [planType, setPlanType] = useState("");
  const [isMentorado, setIsMentorado] = useState(false);
  const [isW3Client, setIsW3Client] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const initForm = (u: UserProfile) => {
    setFullName(u.full_name || "");
    setAccessStatus(u.access_status);
    setExpirationDate(u.access_expires_at?.split("T")[0] || "");
    setIsAdmin(u.isAdmin || false);
    setRevenueGoal(u.revenue_goal?.toString() || "");
    // Legacy
    setPlanType(u.plan_type);
    setIsMentorado(u.is_mentorado);
    setIsW3Client(u.is_w3_client);
  };

  // Initialize form + roles when sheet opens
  useEffect(() => {
    if (!open || !user) return;
    initForm(user);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.user_id)
      .then(({ data }) => {
        const roles = (data ?? []).map((r) => r.role as string);
        const cw3 = roles.includes("cliente_w3");
        const cames = roles.includes("cliente_ames");
        setIsClienteW3(cw3);
        setIsClienteAmes(cames);
        setOriginalClienteW3(cw3);
        setOriginalClienteAmes(cames);

        const staffRoles = ["tutor", "cs", "master"];
        const dashR = roles.find((r) => staffRoles.includes(r)) ?? "none";
        setDashRole(dashR);
        setOriginalDashRole(dashR);
      });
  }, [open, user?.user_id]);

  const handleOpenChange = (isOpen: boolean) => {
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
      isMentorado !== user.is_mentorado ||
      isW3Client !== user.is_w3_client ||
      isAdmin !== (user.isAdmin || false) ||
      revenueGoal !== (user.revenue_goal?.toString() || "") ||
      dashRole !== originalDashRole ||
      isClienteW3 !== originalClienteW3 ||
      isClienteAmes !== originalClienteAmes
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (fullName !== (user.full_name || "")) {
        const { error } = await supabase.rpc("admin_update_user_name", { target_user_id: user.user_id, new_name: fullName.trim() });
        if (error) throw error;
      }
      if (accessStatus !== user.access_status) {
        const { error } = await supabase.rpc("admin_update_user_status", { target_user_id: user.user_id, new_status: accessStatus });
        if (error) throw error;
      }
      if (expirationDate !== (user.access_expires_at?.split("T")[0] || "")) {
        const expDate = expirationDate ? new Date(expirationDate).toISOString() : null;
        const { error } = await supabase.rpc("admin_set_expiration", { target_user_id: user.user_id, expiration_date: expDate });
        if (error) throw error;
      }
      if (isAdmin !== (user.isAdmin || false)) {
        const { error } = await supabase.rpc("admin_update_role", { target_user_id: user.user_id, make_admin: isAdmin });
        if (error) throw error;
      }
      if (revenueGoal !== (user.revenue_goal?.toString() || "")) {
        const goalValue = revenueGoal ? parseFloat(revenueGoal) : null;
        const { error } = await supabase.rpc("admin_update_revenue_goal", { target_user_id: user.user_id, new_goal: goalValue });
        if (error) throw error;
      }
      // Product roles (new system)
      if (isClienteW3 !== originalClienteW3) {
        const { error } = await supabase.rpc("admin_set_client_role" as any, { target_user_id: user.user_id, p_role: "cliente_w3", p_grant: isClienteW3 });
        if (error) throw error;
        setOriginalClienteW3(isClienteW3);
      }
      if (isClienteAmes !== originalClienteAmes) {
        const { error } = await supabase.rpc("admin_set_client_role" as any, { target_user_id: user.user_id, p_role: "cliente_ames", p_grant: isClienteAmes });
        if (error) throw error;
        setOriginalClienteAmes(isClienteAmes);
      }
      // Dash role
      if (dashRole !== originalDashRole) {
        const newDashRole = dashRole === "none" ? null : dashRole;
        const { error } = await supabase.rpc("admin_set_dash_role" as any, { target_user_id: user.user_id, new_role: newDashRole });
        if (error) throw error;
        setOriginalDashRole(dashRole);
      }
      // Legacy flags
      if (planType !== user.plan_type) {
        const { error } = await supabase.rpc("admin_update_user_plan", { target_user_id: user.user_id, new_plan: planType });
        if (error) throw error;
      }
      if (isMentorado !== user.is_mentorado) {
        const { error } = await supabase.rpc("admin_update_user_flag", { target_user_id: user.user_id, flag_name: "is_mentorado", flag_value: isMentorado });
        if (error) throw error;
      }
      if (isW3Client !== user.is_w3_client) {
        const { error } = await supabase.rpc("admin_update_user_flag", { target_user_id: user.user_id, flag_name: "is_w3_client", flag_value: isW3Client });
        if (error) throw error;
      }

      toast({ title: "Salvo com sucesso", description: "Todas as alterações foram aplicadas." });
      onRefresh();
      onOpenChange(false);
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
        <SheetContent side="right" className="w-full sm:w-[520px] border-l border-border p-0 flex flex-col">
          <SheetHeader className="px-6 py-5 border-b border-border">
            <SheetTitle className="text-foreground flex items-center gap-2">
              {user.isAdmin && <Shield className="h-4 w-4 text-primary" />}
              Editar Usuário
            </SheetTitle>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome completo</Label>
                <Input id="edit-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nome do usuário" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Cadastro</span>
                  <p className="font-medium">{format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Último login</span>
                  <p className="font-medium">{user.last_login_at ? format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "Nunca"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Business Info */}
            <BusinessInfoSection userId={user.user_id} canEdit={true} />

            <Separator />

            {/* Produto / Acesso */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Produto / Acesso</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-blue-500" />
                    <div>
                      <Label htmlFor="edit-cw3" className="cursor-pointer">Cliente W3</Label>
                      <p className="text-xs text-muted-foreground">Acesso à plataforma</p>
                    </div>
                  </div>
                  <Switch id="edit-cw3" checked={isClienteW3} onCheckedChange={setIsClienteW3} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-amber-500" />
                    <div>
                      <Label htmlFor="edit-cames" className="cursor-pointer">Cliente AMES</Label>
                      <p className="text-xs text-muted-foreground">Desbloqueia W3 Educação</p>
                    </div>
                  </div>
                  <Switch id="edit-cames" checked={isClienteAmes} onCheckedChange={setIsClienteAmes} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Access */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acesso</h3>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={accessStatus} onValueChange={setAccessStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active"><span className="flex items-center gap-2"><Check className="h-3 w-3 text-emerald-500" /> Ativo</span></SelectItem>
                    <SelectItem value="suspended"><span className="flex items-center gap-2"><UserX className="h-3 w-3 text-destructive" /> Suspenso</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-expiration">Data de expiração</Label>
                <Input id="edit-expiration" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
                <p className="text-xs text-muted-foreground">Deixe em branco para acesso sem expiração</p>
              </div>
            </div>

            <Separator />

            {/* Permissões */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Permissões</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <Label htmlFor="edit-admin" className="cursor-pointer">Administrador</Label>
                  </div>
                  <Switch id="edit-admin" checked={isAdmin} onCheckedChange={setIsAdmin} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Dash Admin Role */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Papel no Dash Admin</h3>
              <div className="space-y-1.5">
                <Label>Função de acompanhamento</Label>
                <Select value={dashRole} onValueChange={setDashRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem papel (usuário comum)</SelectItem>
                    <SelectItem value="cs">CS (Customer Success) — vê sua carteira</SelectItem>
                    <SelectItem value="tutor">Tutor — vê carteiras das CSs supervisionadas</SelectItem>
                    <SelectItem value="master">Master — vê todos os mentorados</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  CS vê só sua carteira. Tutor vê union das carteiras das CSs que supervisiona. Master e Admin veem todos.
                </p>
              </div>
            </div>

            {/* Carteira / Time (visible only for cs/tutor) */}
            {(dashRole === "cs" || dashRole === "tutor") && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {dashRole === "cs" ? "Carteira de Mentorados" : "Time de CSs"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {dashRole === "cs"
                      ? "Mentorados atribuídos a este CS. O CS vê apenas estes usuários no Dash Admin."
                      : "CSs que este Tutor supervisiona. O Tutor vê a union das carteiras destas CSs."}
                  </p>
                  <CarteiraSection staffId={user.user_id} mode={dashRole as "cs" | "tutor"} />
                </div>
              </>
            )}

            <Separator />

            {/* Revenue Goal */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-revenue-goal">Meta de faturamento (R$)</Label>
                <Input id="edit-revenue-goal" type="number" min="0" step="100" value={revenueGoal} onChange={(e) => setRevenueGoal(e.target.value)} placeholder="Ex: 50000" />
              </div>
            </div>

            <Separator />

            {/* Legacy (collapsible) */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setLegacyOpen((p) => !p)}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <span>Info de Billing (Legado)</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", legacyOpen && "rotate-180")} />
              </button>
              {legacyOpen && (
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Campos mantidos para rastreio histórico e integração Stripe. Não afetam mais o controle de acesso.
                  </p>
                  <div className="space-y-2">
                    <Label>Plano (Stripe)</Label>
                    <Select value={planType} onValueChange={setPlanType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free (Gratuito)</SelectItem>
                        <SelectItem value="paid">Paid (Pago)</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        <Label htmlFor="edit-mentorado-legacy" className="cursor-pointer">is_mentorado</Label>
                      </div>
                      <Switch id="edit-mentorado-legacy" checked={isMentorado} onCheckedChange={setIsMentorado} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <Label htmlFor="edit-w3client-legacy" className="cursor-pointer">is_w3_client</Label>
                      </div>
                      <Switch id="edit-w3client-legacy" checked={isW3Client} onCheckedChange={setIsW3Client} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</h3>
              {onViewCRM && (
                <Button variant="outline" className="w-full justify-start" onClick={() => { onViewCRM(user); onOpenChange(false); }}>
                  <Users className="mr-2 h-4 w-4" /> Dados do Cliente (CRM)
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start" onClick={() => { onViewPlano(user); onOpenChange(false); }}>
                <ClipboardList className="mr-2 h-4 w-4" /> Ver Plano de Ação
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setResetPasswordOpen(true)}>
                <Key className="mr-2 h-4 w-4" /> Resetar Senha
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Remover Usuário
              </Button>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges()} className="min-w-[120px]">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar</>}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
            <AlertDialogDescription>Defina uma senha temporária para <strong>{user.email}</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="temp-pwd">Senha temporária</Label>
            <Input id="temp-pwd" type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="mt-2" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword} disabled={resettingPassword || tempPassword.length < 6}>
              {resettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Resetar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{user.email}</strong>?<br />Esta ação irá remover o perfil e dados associados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
