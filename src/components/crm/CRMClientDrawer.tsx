import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, Target, DollarSign, FileText, Lightbulb, ExternalLink,
  Send, CheckCircle2, Star, Clock, User2, TrendingUp, TrendingDown, Minus, Save,
  BarChart2, ShoppingCart, MousePointerClick, Package, Plus, Trash2,
  Calendar, StickyNote, GitBranch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { HealthScoreBadge, computeHealthScore } from "./HealthScoreBadge";
import { BusinessInfoSection } from "@/components/admin/BusinessInfoSection";
import { ACTIVITY_TYPES, type ScheduledActivity } from "./CRMActivitiesView";

type ActivityGroup = "Atrasadas" | "Hoje" | "Esta semana" | "Próximas" | "Concluídas";
const ACTIVITY_GROUP_ORDER: ActivityGroup[] = ["Atrasadas", "Hoje", "Esta semana", "Próximas", "Concluídas"];

interface UnifiedItem {
  id: string;
  source: "scheduled" | "cs_task";
  title: string;
  type: string;
  dueDate: string | null;
  assignedName: string | null;
  completedAt: string | null;
}

function getActivityGroup(dueDate: string | null, completedAt: string | null): ActivityGroup {
  if (completedAt) return "Concluídas";
  if (!dueDate) return "Próximas";
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dueDate + "T00:00:00"); d.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return "Atrasadas";
  if (diff === 0) return "Hoje";
  if (diff <= 7) return "Esta semana";
  return "Próximas";
}

export const CRM_STAGES = [
  { id: "onboarding",  label: "Onboarding",   dot: "bg-blue-500",    text: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  { id: "engajado",    label: "Engajado",      dot: "bg-green-500",   text: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-950/30" },
  { id: "alerta",      label: "Alerta",        dot: "bg-red-500",     text: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-950/30" },
  { id: "risco",       label: "Risco",         dot: "bg-orange-500",  text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { id: "congelado",   label: "Congelado",     dot: "bg-slate-400",   text: "text-slate-500 dark:text-slate-400",  bg: "bg-slate-50 dark:bg-slate-900/40" },
  { id: "cancelado",   label: "Cancelado",     dot: "bg-rose-700",    text: "text-rose-700 dark:text-rose-400",    bg: "bg-rose-50 dark:bg-rose-950/30" },
  { id: "reembolsado", label: "Reembolsado",   dot: "bg-purple-500",  text: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { id: "concluido",   label: "Concluído",     dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
];

const formatCurrency = (v: number | null) => {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
};
const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};
const daysAgo = (d: string | null) => {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
};

interface CSTask {
  id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  cs_id: string;
  responsible_id: string | null;
  responsible_name: string | null;
}

interface DrawerData {
  crmClientId: string | null;
  stage: string;
  stageUpdatedAt: string | null;
  valorContrato: number | null;
  dataInicioContrato: string | null;
  dataFimContrato: string | null;
  nextContactDate: string | null;
  quickNote: string | null;
  profile: { full_name: string | null; email: string | null; created_at: string | null; access_expires_at: string | null; access_status: string | null; plan_type: string | null; last_login_at: string | null } | null;
  brand: { name: string | null; website_url: string | null } | null;
  diag: { objetivo_principal: string | null; observacoes: string | null; pontos_diagnostico: string | null; faturamento_inicial: number | null; faturamento_ideal: number | null } | null;
  audits: { id: string; mes_referencia: string; faturamento: number | null; comentario: string | null }[];
  tasks: { id: string; title: string; status: string; section: string | null; sprint: number | null; due_date: string | null; priority: string | null; is_next_action: boolean }[];
  csTasks: CSTask[];
  ecommerce: { total_faturamento: number; total_sessoes: number; total_investimento: number; total_pedidos: number; revenue_this_month: number; revenue_last_month: number };
  csName: string | null;
  comments: { id: string; content: string; created_at: string; author_name: string; author_id: string }[];
  activityLog: { id: string; event: string; payload: any; created_at: string; author_name: string }[];
}

interface CRMClientDrawerProps {
  userId: string | null;
  open: boolean;
  onClose: () => void;
  onStageChange: (userId: string, newStage: string) => void;
}

export function CRMClientDrawer({ userId, open, onClose, onStageChange }: CRMClientDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<DrawerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [comment, setComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [contractDraft, setContractDraft] = useState({ valor: "", inicio: "", fim: "" });
  const [savingContract, setSavingContract] = useState(false);
  // CRM quick fields
  const [nextContact, setNextContact] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [savingQuick, setSavingQuick] = useState(false);
  // CS Tasks
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskResponsible, setNewTaskResponsible] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [staffList, setStaffList] = useState<{ user_id: string; name: string }[]>([]);
  // Scheduled Activities
  const [showCompleted, setShowCompleted] = useState(false);
  const [scheduledActivities, setScheduledActivities] = useState<ScheduledActivity[]>([]);
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityType, setNewActivityType] = useState("task");
  const [newActivityDate, setNewActivityDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newActivityAssigned, setNewActivityAssigned] = useState("");
  const [addingActivity, setAddingActivity] = useState(false);

  useEffect(() => {
    if (open && userId) {
      loadData(userId);
    } else if (!open) {
      setData(null);
      setComment("");
      setScheduledActivities([]);
    }
  }, [open, userId]);

  const loadData = async (uid: string) => {
    setLoading(true);
    try {
      const [crmRes, profileRes, brandRes, diagRes, auditsRes, tasksRes, csRes, dailyRes, metricsRes, csTasksRes, scheduledActivitiesRes] = await Promise.all([
        (supabase as any).from("crm_clients").select("id, stage, stage_updated_at, responsible_cs_id, valor_contrato, data_inicio_contrato, data_fim_contrato, next_contact_date, quick_note").eq("user_id", uid).maybeSingle(),
        supabase.from("profiles").select("full_name, email, created_at, access_expires_at, access_status, plan_type, last_login_at").eq("user_id", uid).maybeSingle(),
        supabase.from("brands").select("name, website_url").eq("user_id", uid).maybeSingle(),
        (supabase as any).from("diagnostico_360").select("objetivo_principal, observacoes, pontos_diagnostico, faturamento_inicial, faturamento_ideal").eq("user_id", uid).maybeSingle(),
        (supabase as any).from("result_audits").select("id, mes_referencia, faturamento, comentario").eq("user_id", uid).order("mes_referencia", { ascending: false }),
        supabase.from("tarefas").select("id, title, status, section, sprint, due_date, priority, is_next_action").eq("user_id", uid).order("sprint", { ascending: true, nullsFirst: false }),
        (supabase as any).from("staff_carteiras").select("staff_id").eq("mentorado_id", uid).maybeSingle(),
        supabase.from("daily_results").select("receita_paga, sessoes, investimento, pedidos_pagos, data").eq("user_id", uid),
        supabase.from("metrics_diarias").select("faturamento, sessoes, investimento_trafego, vendas_quantidade, vendas_valor, data").eq("user_id", uid),
        (supabase as any).from("cs_tasks").select("id, title, due_date, completed_at, cs_id, responsible_id").eq("client_user_id", uid).order("created_at", { ascending: true }),
        (supabase as any).from("crm_scheduled_activities").select("id, crm_client_id, client_user_id, title, type, scheduled_for, assigned_to, completed_at").eq("client_user_id", uid).order("scheduled_for", { ascending: true }),
      ]);

      const crmClientId: string | null = crmRes.data?.id ?? null;
      const stage = crmRes.data?.stage ?? "onboarding";
      const stageUpdatedAt = crmRes.data?.stage_updated_at ?? null;
      const valorContrato: number | null = crmRes.data?.valor_contrato ?? null;
      const dataInicioContrato: string | null = crmRes.data?.data_inicio_contrato ?? null;
      const dataFimContrato: string | null = crmRes.data?.data_fim_contrato ?? null;
      const nextContactDate: string | null = crmRes.data?.next_contact_date ?? null;
      const quick: string | null = crmRes.data?.quick_note ?? null;

      // E-commerce metrics
      const ecNow = new Date();
      const ecThisMonth = `${ecNow.getFullYear()}-${String(ecNow.getMonth() + 1).padStart(2, "0")}`;
      const ecLastMonthDate = new Date(ecNow.getFullYear(), ecNow.getMonth() - 1, 1);
      const ecLastMonth = `${ecLastMonthDate.getFullYear()}-${String(ecLastMonthDate.getMonth() + 1).padStart(2, "0")}`;
      let ecFat = 0, ecSes = 0, ecInv = 0, ecPed = 0, ecThis = 0, ecLast = 0;
      for (const r of (dailyRes.data || []) as any[]) {
        ecFat += r.receita_paga || 0; ecSes += r.sessoes || 0;
        ecInv += r.investimento || 0; ecPed += r.pedidos_pagos || 0;
        const mo = (r.data || "").substring(0, 7);
        if (mo === ecThisMonth) ecThis += r.receita_paga || 0;
        if (mo === ecLastMonth) ecLast += r.receita_paga || 0;
      }
      for (const m of (metricsRes.data || []) as any[]) {
        const mf = (m.faturamento || 0) + (m.vendas_valor || 0);
        ecFat += mf; ecSes += m.sessoes || 0;
        ecInv += m.investimento_trafego || 0; ecPed += m.vendas_quantidade || 0;
        const mo = (m.data || "").substring(0, 7);
        if (mo === ecThisMonth) ecThis += mf;
        if (mo === ecLastMonth) ecLast += mf;
      }

      let csName: string | null = null;
      if (csRes.data?.staff_id) {
        const { data: csProfile } = await supabase.from("profiles").select("full_name, email").eq("user_id", csRes.data.staff_id).maybeSingle();
        csName = (csProfile as any)?.full_name || (csProfile as any)?.email || null;
      }

      // Load staff list for responsible selector
      const { data: staffRoles } = await (supabase as any)
        .from("user_roles")
        .select("user_id")
        .in("role", ["cs", "tutor", "admin"]);
      const staffIds = [...new Set((staffRoles || []).map((r: any) => r.user_id).filter(Boolean))];
      let staffMap: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: staffProfiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", staffIds as string[]);
        (staffProfiles || []).forEach((p: any) => {
          staffMap[p.user_id] = p.full_name || p.email || "—";
        });
      }
      setStaffList(Object.entries(staffMap).map(([user_id, name]) => ({ user_id, name })));

      // Resolve assigned_to names for scheduled activities (uses staffMap)
      // Also add any assigned_to IDs to staffMap if not already present
      const assignedIds = [...new Set((scheduledActivitiesRes.data || []).map((a: any) => a.assigned_to).filter(Boolean))];
      const missingIds = assignedIds.filter((id: string) => !staffMap[id]);
      if (missingIds.length > 0) {
        const { data: extraProfiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", missingIds);
        (extraProfiles || []).forEach((p: any) => { staffMap[p.user_id] = p.full_name || p.email || "—"; });
      }
      setScheduledActivities((scheduledActivitiesRes.data || []).map((a: any) => ({
        ...a,
        assigned_name: a.assigned_to ? (staffMap[a.assigned_to] || "—") : null,
        clientName: "",
      })));

      // Resolve responsible names for cs_tasks
      const rawCsTasks = csTasksRes.data || [];
      const responsibleIds = [...new Set(rawCsTasks.map((t: any) => t.responsible_id).filter(Boolean))];
      if (responsibleIds.length > 0) {
        const { data: rProfiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", responsibleIds);
        (rProfiles || []).forEach((p: any) => { staffMap[p.user_id] = p.full_name || p.email || "—"; });
      }

      let comments: DrawerData["comments"] = [];
      let activityLog: DrawerData["activityLog"] = [];

      if (crmClientId) {
        const [commentsRes, logsRes] = await Promise.all([
          (supabase as any).from("crm_comments").select("id, content, created_at, author_id").eq("crm_client_id", crmClientId).order("created_at", { ascending: false }),
          (supabase as any).from("crm_activity_log").select("id, event, payload, created_at, author_id").eq("crm_client_id", crmClientId).order("created_at", { ascending: false }).limit(50),
        ]);

        const allAuthorIds = [...new Set([
          ...(commentsRes.data || []).map((c: any) => c.author_id),
          ...(logsRes.data || []).map((l: any) => l.author_id),
        ])].filter(Boolean) as string[];

        const authorMap: Record<string, string> = {};
        if (allAuthorIds.length > 0) {
          const { data: authorProfiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", allAuthorIds);
          (authorProfiles || []).forEach((p: any) => {
            authorMap[p.user_id] = p.full_name || p.email || "—";
          });
        }

        comments = (commentsRes.data || []).map((c: any) => ({
          id: c.id, content: c.content, created_at: c.created_at,
          author_name: authorMap[c.author_id] || "—", author_id: c.author_id,
        }));
        activityLog = (logsRes.data || []).map((l: any) => ({
          id: l.id, event: l.event, payload: l.payload || {},
          created_at: l.created_at, author_name: authorMap[l.author_id] || "—",
        }));
      }

      setContractDraft({
        valor: valorContrato !== null ? String(valorContrato) : "",
        inicio: dataInicioContrato ?? "",
        fim: dataFimContrato ?? "",
      });
      setNextContact(nextContactDate ?? "");
      setQuickNote(quick ?? "");

      setData({
        crmClientId, stage, stageUpdatedAt, valorContrato,
        dataInicioContrato, dataFimContrato, nextContactDate, quickNote: quick,
        ecommerce: { total_faturamento: ecFat, total_sessoes: ecSes, total_investimento: ecInv, total_pedidos: ecPed, revenue_this_month: ecThis, revenue_last_month: ecLast },
        profile: profileRes.data as any,
        brand: brandRes.data as any,
        diag: diagRes.data as any,
        audits: auditsRes.data || [],
        tasks: (tasksRes.data || []).map((t: any) => ({
          id: t.id, title: t.title, status: t.status, section: t.section,
          sprint: t.sprint, due_date: t.due_date, priority: t.priority, is_next_action: t.is_next_action ?? false,
        })),
        csTasks: rawCsTasks.map((t: any) => ({
          ...t,
          responsible_name: t.responsible_id ? (staffMap[t.responsible_id] || null) : null,
        })),
        csName, comments, activityLog,
      });
    } catch (err) {
      console.error("CRM drawer error:", err);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!userId || !data || newStage === data.stage) return;
    setSavingStage(true);
    const oldStage = data.stage;

    const { data: upserted, error } = await (supabase as any).from("crm_clients").upsert({
      user_id: userId, stage: newStage,
      stage_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select("id").single();

    if (error) {
      toast({ title: "Erro ao atualizar etapa", variant: "destructive" });
      setSavingStage(false);
      return;
    }

    const crmId = upserted?.id || data.crmClientId;
    if (crmId) {
      await (supabase as any).from("crm_activity_log").insert({
        crm_client_id: crmId, author_id: user?.id,
        event: "stage_changed", payload: { from: oldStage, to: newStage },
      });
    }

    setSavingStage(false);
    toast({ title: "Etapa atualizada" });
    onStageChange(userId, newStage);
    loadData(userId);
  };

  const handleSendComment = async () => {
    if (!comment.trim() || !userId) return;
    setSendingComment(true);

    let crmId = data?.crmClientId;
    if (!crmId) {
      const { data: upserted } = await (supabase as any).from("crm_clients").upsert({
        user_id: userId, stage: data?.stage || "onboarding",
        stage_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).select("id").single();
      crmId = upserted?.id;
    }

    if (!crmId) { toast({ title: "Erro ao enviar comentário", variant: "destructive" }); setSendingComment(false); return; }

    const { error } = await (supabase as any).from("crm_comments").insert({
      crm_client_id: crmId, author_id: user?.id, content: comment.trim(),
    });

    if (error) {
      toast({ title: "Erro ao enviar comentário", description: error.message, variant: "destructive" });
    } else {
      await (supabase as any).from("crm_activity_log").insert({
        crm_client_id: crmId, author_id: user?.id, event: "commented", payload: {},
      });
      setComment("");
      loadData(userId);
    }
    setSendingComment(false);
  };

  const handleSaveContract = async () => {
    if (!userId) return;
    setSavingContract(true);

    let crmId = data?.crmClientId;
    if (!crmId) {
      const { data: upserted } = await (supabase as any).from("crm_clients").upsert({
        user_id: userId, stage: data?.stage || "onboarding",
        stage_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).select("id").single();
      crmId = upserted?.id;
    }

    const { error } = await (supabase as any).from("crm_clients").update({
      valor_contrato: contractDraft.valor ? parseFloat(contractDraft.valor) : null,
      data_inicio_contrato: contractDraft.inicio || null,
      data_fim_contrato: contractDraft.fim || null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    setSavingContract(false);
    if (error) {
      toast({ title: "Erro ao salvar contrato", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dados do contrato salvos" });
      setData(d => d ? { ...d, valorContrato: contractDraft.valor ? parseFloat(contractDraft.valor) : null, dataInicioContrato: contractDraft.inicio || null, dataFimContrato: contractDraft.fim || null } : d);
    }
  };

  const handleSaveQuick = async () => {
    if (!userId) return;
    setSavingQuick(true);

    let crmId = data?.crmClientId;
    if (!crmId) {
      const { data: upserted } = await (supabase as any).from("crm_clients").upsert({
        user_id: userId, stage: data?.stage || "onboarding",
        stage_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).select("id").single();
      crmId = upserted?.id;
    }

    const { error } = await (supabase as any).from("crm_clients").update({
      next_contact_date: nextContact || null,
      quick_note: quickNote || null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    setSavingQuick(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Informações salvas" });
      setData(d => d ? { ...d, nextContactDate: nextContact || null, quickNote: quickNote || null } : d);
    }
  };

  const handleAddCSTask = async () => {
    if (!newTaskTitle.trim() || !userId || !user?.id) return;
    setAddingTask(true);

    const { data: inserted, error } = await (supabase as any).from("cs_tasks").insert({
      cs_id: user.id,
      client_user_id: userId,
      title: newTaskTitle.trim(),
      due_date: newTaskDue || null,
      responsible_id: newTaskResponsible || null,
    }).select("id, title, due_date, completed_at, cs_id, responsible_id").single();

    setAddingTask(false);
    if (error) {
      toast({ title: "Erro ao adicionar tarefa", variant: "destructive" });
    } else {
      const respName = newTaskResponsible ? (staffList.find(s => s.user_id === newTaskResponsible)?.name || null) : null;
      setNewTaskTitle("");
      setNewTaskDue("");
      setNewTaskResponsible("");
      setData(d => d ? { ...d, csTasks: [...d.csTasks, { ...inserted, responsible_name: respName }] } : d);
    }
  };

  const handleToggleCSTask = async (taskId: string, currentlyDone: boolean) => {
    const newValue = currentlyDone ? null : new Date().toISOString();
    await (supabase as any).from("cs_tasks").update({ completed_at: newValue }).eq("id", taskId);
    setData(d => d ? {
      ...d,
      csTasks: d.csTasks.map(t => t.id === taskId ? { ...t, completed_at: newValue } : t),
    } : d);
  };

  const handleDeleteCSTask = async (taskId: string) => {
    await (supabase as any).from("cs_tasks").delete().eq("id", taskId);
    setData(d => d ? { ...d, csTasks: d.csTasks.filter(t => t.id !== taskId) } : d);
  };

  const handleAddActivity = async () => {
    if (!newActivityTitle.trim() || !userId || !user?.id) return;
    setAddingActivity(true);
    let crmId = data?.crmClientId;
    if (!crmId) {
      const { data: upserted, error: upsertError } = await (supabase as any).from("crm_clients").upsert({
        user_id: userId, stage: data?.stage || "onboarding",
        stage_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" }).select("id").single();
      if (upsertError) console.error("[CRM] upsert error:", upsertError);
      crmId = upserted?.id;
      if (crmId) setData(d => d ? { ...d, crmClientId: crmId } : d);
    }
    if (!crmId) {
      toast({ title: "Erro ao criar registro CRM", description: "Não foi possível obter o ID do cliente CRM.", variant: "destructive" });
      setAddingActivity(false);
      return;
    }
    const { data: inserted, error } = await (supabase as any).from("crm_scheduled_activities").insert({
      crm_client_id: crmId,
      client_user_id: userId,
      title: newActivityTitle.trim(),
      type: newActivityType,
      scheduled_for: newActivityDate,
      assigned_to: newActivityAssigned || null,
      created_by: user.id,
    }).select("id, crm_client_id, client_user_id, title, type, scheduled_for, assigned_to, completed_at").single();
    setAddingActivity(false);
    if (error) {
      toast({ title: "Erro ao agendar atividade", description: error.message, variant: "destructive" });
      return;
    }
    if (inserted) {
      const assignedName = newActivityAssigned ? (staffList.find(s => s.user_id === newActivityAssigned)?.name || null) : null;
      setScheduledActivities(prev => [...prev, { ...inserted, assigned_name: assignedName, clientName: "" }]);
      setNewActivityTitle("");
      setNewActivityDate(new Date().toISOString().split("T")[0]);
      setNewActivityAssigned("");
      setNewActivityType("task");
      toast({ title: "Atividade agendada" });
    }
  };

  const handleCompleteUnified = async (id: string, source: "scheduled" | "cs_task") => {
    const now = new Date().toISOString();
    if (source === "scheduled") {
      await (supabase as any).from("crm_scheduled_activities").update({ completed_at: now }).eq("id", id);
      setScheduledActivities(prev => prev.map(a => a.id === id ? { ...a, completed_at: now } : a));
    } else {
      await (supabase as any).from("cs_tasks").update({ completed_at: now }).eq("id", id);
      setData(d => d ? { ...d, csTasks: d.csTasks.map(t => t.id === id ? { ...t, completed_at: now } : t) } : d);
    }
    toast({ title: "Atividade concluída" });
  };

  const handleUncompleteUnified = async (id: string, source: "scheduled" | "cs_task") => {
    if (source === "scheduled") {
      await (supabase as any).from("crm_scheduled_activities").update({ completed_at: null }).eq("id", id);
      setScheduledActivities(prev => prev.map(a => a.id === id ? { ...a, completed_at: null } : a));
    } else {
      await (supabase as any).from("cs_tasks").update({ completed_at: null }).eq("id", id);
      setData(d => d ? { ...d, csTasks: d.csTasks.map(t => t.id === id ? { ...t, completed_at: null } : t) } : d);
    }
  };

  const handleDeleteUnified = async (id: string, source: "scheduled" | "cs_task") => {
    if (source === "scheduled") {
      await (supabase as any).from("crm_scheduled_activities").delete().eq("id", id);
      setScheduledActivities(prev => prev.filter(a => a.id !== id));
    } else {
      await (supabase as any).from("cs_tasks").delete().eq("id", id);
      setData(d => d ? { ...d, csTasks: d.csTasks.filter(t => t.id !== id) } : d);
    }
  };

  // Compute health score for drawer header
  const healthScore = data ? computeHealthScore({
    lastLoginDaysAgo: data.profile?.last_login_at ? Math.floor((Date.now() - new Date(data.profile.last_login_at).getTime()) / 86400000) : null,
    completedTasks: data.tasks.filter(t => t.status === "concluida").length,
    totalTasks: data.tasks.filter(t => t.status !== "cancelada").length,
    sparkline: data.audits.slice(0, 4).reverse().map(a => a.faturamento),
    stage: data.stage,
  }) : 0;

  const stageInfo = CRM_STAGES.find(s => s.id === (data?.stage || "onboarding")) || CRM_STAGES[0];
  const today = new Date().toISOString().split("T")[0];

  // Unified activity items (crm_scheduled_activities + cs_tasks)
  const unifiedItems: UnifiedItem[] = [
    ...scheduledActivities.map(a => ({
      id: a.id,
      source: "scheduled" as const,
      title: a.title,
      type: a.type,
      dueDate: a.scheduled_for,
      assignedName: a.assigned_name,
      completedAt: a.completed_at,
    })),
    ...(data?.csTasks || []).map(t => ({
      id: t.id,
      source: "cs_task" as const,
      title: t.title,
      type: "task",
      dueDate: t.due_date,
      assignedName: t.responsible_name,
      completedAt: t.completed_at,
    })),
  ];
  const groupedUnified = new Map<ActivityGroup, UnifiedItem[]>();
  ACTIVITY_GROUP_ORDER.forEach(g => groupedUnified.set(g, []));
  unifiedItems.forEach(item => groupedUnified.get(getActivityGroup(item.dueDate, item.completedAt))!.push(item));

  // Build timeline items (comments + activity + cs_tasks completions)
  const timelineItems = data ? [
    ...data.comments.map(c => ({ id: c.id, type: "comment" as const, date: c.created_at, author: c.author_name, content: c.content, payload: null })),
    ...data.activityLog.map(l => ({ id: l.id, type: "log" as const, date: l.created_at, author: l.author_name, content: "", payload: l.payload, event: l.event })),
    ...data.csTasks
      .filter(t => t.completed_at)
      .map(t => ({ id: `cs-done-${t.id}`, type: "cs_task_done" as const, date: t.completed_at!, author: "CS", content: t.title, payload: null })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col" side="right">
        {loading || !data ? (
          <div className="flex justify-center items-center flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {data.brand?.name ? (
                    <div className="flex items-center gap-2 mb-1">
                      {data.brand.website_url && (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${data.brand.website_url}&sz=16`}
                          alt="" className="h-4 w-4 rounded-sm shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                      <h2 className="text-lg font-bold truncate">{data.brand.name}</h2>
                      {data.brand.website_url && (
                        <a
                          href={data.brand.website_url.startsWith("http") ? data.brand.website_url : `https://${data.brand.website_url}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <h2 className="text-lg font-bold">{data.profile?.full_name || data.profile?.email || "—"}</h2>
                  )}
                  {data.brand?.name && (
                    <p className="text-sm text-muted-foreground truncate">
                      {data.profile?.full_name} · {data.profile?.email}
                    </p>
                  )}
                  {!data.brand?.name && (
                    <p className="text-sm text-muted-foreground">{data.profile?.email}</p>
                  )}
                </div>

                <div className="flex items-start gap-2 shrink-0">
                  <HealthScoreBadge score={healthScore} size="md" />
                  {/* Stage selector */}
                  <div className="text-right">
                    <Select value={data.stage} onValueChange={handleStageChange} disabled={savingStage}>
                      <SelectTrigger className={`h-8 text-xs font-semibold border-0 shadow-none ${stageInfo.bg} ${stageInfo.text} min-w-[110px]`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${stageInfo.dot}`} />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {CRM_STAGES.map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            <span className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {data.stageUpdatedAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {daysAgo(data.stageUpdatedAt)}d nesta etapa
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                {data.csName && (
                  <span className="flex items-center gap-1">
                    <User2 className="h-3 w-3" />
                    CS: <span className="font-medium text-foreground ml-0.5">{data.csName}</span>
                  </span>
                )}
                {data.profile?.access_status && (
                  <Badge variant={data.profile.access_status === "active" ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
                    {data.profile.access_status === "active" ? "Ativo" : data.profile.access_status}
                  </Badge>
                )}
                {data.profile?.plan_type && (
                  <span className="text-muted-foreground">{data.profile.plan_type}</span>
                )}
                {data.profile?.created_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Desde {formatDate(data.profile.created_at)}
                  </span>
                )}
                {data.profile?.last_login_at && (
                  <span className="flex items-center gap-1">
                    Último acesso: {daysAgo(data.profile.last_login_at)}d atrás
                  </span>
                )}
                {data.profile?.access_expires_at && (
                  <span className={`flex items-center gap-1 ${new Date(data.profile.access_expires_at) < new Date() ? "text-destructive" : ""}`}>
                    Acesso até {formatDate(data.profile.access_expires_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0">
              <TabsList className="mx-5 mt-3 h-8 w-auto shrink-0 self-start flex-wrap">
                <TabsTrigger value="overview" className="text-xs h-7">Visão Geral</TabsTrigger>
                <TabsTrigger value="financial" className="text-xs h-7">Financeiro</TabsTrigger>
                <TabsTrigger value="plan" className="text-xs h-7">Plano de Ação</TabsTrigger>
                <TabsTrigger value="ecommerce" className="text-xs h-7">E-commerce</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs h-7">Atividade</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                {/* Visão Geral */}
                <TabsContent value="overview" className="p-5 space-y-3 mt-0">
                  {data.diag ? (
                    <>
                      <div className={`rounded-lg p-4 ${stageInfo.bg}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className={`h-4 w-4 ${stageInfo.text}`} />
                          <span className={`text-xs font-semibold uppercase tracking-wide ${stageInfo.text}`}>
                            Objetivo Principal
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {data.diag.objetivo_principal || (
                            <span className="italic text-muted-foreground">Não preenchido</span>
                          )}
                        </p>
                      </div>

                      {data.diag.observacoes && (
                        <div className="rounded-lg p-4 bg-muted/40">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observações</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{data.diag.observacoes}</p>
                        </div>
                      )}

                      {data.diag.pontos_diagnostico && (
                        <div className="rounded-lg p-4 bg-muted/40">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pontos do Diagnóstico</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{data.diag.pontos_diagnostico}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Diagnóstico 360 ainda não preenchido
                    </div>
                  )}

                  {/* Business Info */}
                  <div className="rounded-lg border p-4">
                    <BusinessInfoSection userId={userId} canEdit={true} compact />
                  </div>

                  {/* Nota Interna */}
                  <div className="rounded-lg border p-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <StickyNote className="h-3.5 w-3.5" />
                      Nota Interna
                    </p>
                    <Textarea
                      value={quickNote}
                      onChange={e => setQuickNote(e.target.value)}
                      placeholder="Observações internas sobre este cliente..."
                      rows={2}
                      className="text-sm resize-none"
                    />
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={handleSaveQuick} disabled={savingQuick}>
                        {savingQuick ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                        Salvar
                      </Button>
                    </div>
                  </div>

                  {/* Contract fields */}
                  <div className="rounded-lg border p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      Dados do Contrato
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Valor do Contrato (R$)</Label>
                        <Input
                          type="number"
                          value={contractDraft.valor}
                          onChange={e => setContractDraft(d => ({ ...d, valor: e.target.value }))}
                          placeholder="Ex: 3500"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Início do contrato</Label>
                        <Input type="date" value={contractDraft.inicio} onChange={e => setContractDraft(d => ({ ...d, inicio: e.target.value }))} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fim / encerramento</Label>
                        <Input type="date" value={contractDraft.fim} onChange={e => setContractDraft(d => ({ ...d, fim: e.target.value }))} className="h-8 text-sm" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={handleSaveContract} disabled={savingContract}>
                        {savingContract ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                        Salvar contrato
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Financeiro */}
                <TabsContent value="financial" className="p-5 space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border bg-muted/40 p-4 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Fat. Inicial</p>
                      <p className="text-xl font-bold">{formatCurrency(data.diag?.faturamento_inicial ?? null)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ao entrar na mentoria</p>
                    </div>
                    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-center">
                      <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-1">Meta Mensal</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(data.diag?.faturamento_ideal ?? null)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Faturamento ideal</p>
                    </div>
                  </div>

                  {data.audits.length > 0 && data.diag?.faturamento_inicial && data.audits[0].faturamento && (() => {
                    const pct = ((data.audits[0].faturamento - data.diag!.faturamento_inicial!) / data.diag!.faturamento_inicial!) * 100;
                    const isGrowing = pct > 5; const isDeclining = pct < -5;
                    return (
                      <div className={`flex items-center gap-3 rounded-lg p-3 ${isGrowing ? "bg-green-50 dark:bg-green-950/30" : isDeclining ? "bg-red-50 dark:bg-red-950/30" : "bg-muted/30"}`}>
                        {isGrowing ? <TrendingUp className="h-5 w-5 text-green-600 shrink-0" /> : isDeclining ? <TrendingDown className="h-5 w-5 text-red-600 shrink-0" /> : <Minus className="h-5 w-5 text-muted-foreground shrink-0" />}
                        <div>
                          <p className="text-xs text-muted-foreground">Último vs. Inicial</p>
                          <p className={`text-sm font-bold ${isGrowing ? "text-green-600" : isDeclining ? "text-red-600" : ""}`}>
                            {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                          </p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-xs text-muted-foreground">Último auditado</p>
                          <p className="text-sm font-bold">{formatCurrency(data.audits[0].faturamento)}</p>
                        </div>
                      </div>
                    );
                  })()}

                  {data.audits.length > 0 ? (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Auditorias</h4>
                      <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Mês</th>
                              <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Faturamento</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Comentário</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.audits.map((a, i) => (
                              <tr key={a.id} className={`border-t ${i % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>
                                <td className="px-3 py-2 font-medium capitalize text-xs">
                                  {new Date(a.mes_referencia + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                                </td>
                                <td className="px-3 py-2 text-right text-xs font-medium">{formatCurrency(a.faturamento)}</td>
                                <td className="px-3 py-2 text-muted-foreground text-xs hidden sm:table-cell max-w-xs truncate">{a.comentario || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Nenhuma auditoria registrada
                    </div>
                  )}
                </TabsContent>

                {/* Plano de Ação */}
                <TabsContent value="plan" className="p-5 mt-0">
                  {data.tasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Nenhuma ação no plano
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                          { label: "Total", value: data.tasks.filter(t => t.status !== "cancelada").length },
                          { label: "Concluídas", value: data.tasks.filter(t => t.status === "concluida").length, color: "text-green-600" },
                          { label: "Atrasadas", value: data.tasks.filter(t => t.due_date && t.due_date < today && t.status !== "concluida" && t.status !== "cancelada").length, color: "text-destructive" },
                        ].map(s => (
                          <div key={s.label} className="rounded-lg border bg-muted/30 p-3 text-center">
                            <p className="text-xs text-muted-foreground">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        {data.tasks.map(task => {
                          const isOverdue = task.due_date && task.due_date < today && task.status !== "concluida" && task.status !== "cancelada";
                          return (
                            <div key={task.id} className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${task.status === "concluida" ? "bg-muted/20 text-muted-foreground" : "bg-card border"}`}>
                              {task.status === "concluida" ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              ) : task.is_next_action ? (
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                              ) : (
                                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${task.status === "em_andamento" ? "bg-blue-500" : "bg-muted-foreground/30"}`} />
                              )}
                              <span className={`flex-1 truncate ${task.status === "concluida" ? "line-through" : ""}`}>{task.title}</span>
                              {task.sprint !== null && task.sprint !== undefined && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded shrink-0 text-muted-foreground">S{task.sprint}</span>
                              )}
                              {isOverdue && <span className="text-[10px] text-destructive font-medium shrink-0">Atrasada</span>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* E-commerce */}
                <TabsContent value="ecommerce" className="p-5 mt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Faturamento Total", value: formatCurrency(data.ecommerce.total_faturamento), icon: TrendingUp, color: "text-green-600" },
                      { label: "Investimento Total", value: formatCurrency(data.ecommerce.total_investimento), icon: BarChart2, color: "text-blue-600" },
                      { label: "Sessões Totais", value: data.ecommerce.total_sessoes.toLocaleString("pt-BR"), icon: MousePointerClick, color: "text-purple-600" },
                      { label: "Pedidos Totais", value: data.ecommerce.total_pedidos.toLocaleString("pt-BR"), icon: Package, color: "text-amber-600" },
                      { label: "Fat. Este Mês", value: formatCurrency(data.ecommerce.revenue_this_month), icon: ShoppingCart, color: "text-emerald-600" },
                      { label: "Fat. Mês Passado", value: formatCurrency(data.ecommerce.revenue_last_month), icon: ShoppingCart, color: "text-slate-600" },
                    ].map(card => {
                      const Icon = card.icon;
                      return (
                        <div key={card.label} className="rounded-lg border bg-muted/30 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                          </div>
                          <p className="text-xl font-bold">{card.value}</p>
                        </div>
                      );
                    })}
                  </div>
                  {data.ecommerce.revenue_this_month > 0 && data.ecommerce.revenue_last_month > 0 && (() => {
                    const pct = ((data.ecommerce.revenue_this_month - data.ecommerce.revenue_last_month) / data.ecommerce.revenue_last_month) * 100;
                    const isUp = pct > 0;
                    return (
                      <div className={`flex items-center gap-3 rounded-lg p-3 ${isUp ? "bg-green-50 dark:bg-green-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
                        {isUp ? <TrendingUp className="h-4 w-4 text-green-600 shrink-0" /> : <TrendingDown className="h-4 w-4 text-red-600 shrink-0" />}
                        <div>
                          <p className="text-xs text-muted-foreground">Variação mês atual vs. anterior</p>
                          <p className={`text-sm font-bold ${isUp ? "text-green-600" : "text-red-600"}`}>{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</p>
                        </div>
                      </div>
                    );
                  })()}
                  {data.ecommerce.total_faturamento === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Sem dados de e-commerce registrados
                    </div>
                  )}
                </TabsContent>

                {/* Atividade */}
                <TabsContent value="activity" className="p-5 mt-0 space-y-5">

                  {/* Próximo Contato — compact CRM field */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 shrink-0">
                      <Calendar className="h-3 w-3" />
                      Próximo contato:
                    </span>
                    <Input
                      type="date"
                      value={nextContact}
                      onChange={e => setNextContact(e.target.value)}
                      onBlur={handleSaveQuick}
                      className="h-6 text-xs w-36"
                    />
                    {nextContact && (
                      <span className={`text-xs shrink-0 ${nextContact < today ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                        {new Date(nextContact + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>

                  {/* Unified Activity List */}
                  <div>
                    {/* Groups */}
                    <div className="space-y-4">
                      {ACTIVITY_GROUP_ORDER.map(group => {
                        const items = groupedUnified.get(group) || [];
                        if (items.length === 0) return null;
                        if (group === "Concluídas" && !showCompleted) return null;
                        return (
                          <div key={group}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                                group === "Atrasadas" ? "text-destructive" :
                                group === "Hoje" ? "text-primary" :
                                "text-muted-foreground"
                              }`}>{group}</span>
                              <div className="flex-1 h-px bg-border" />
                              <span className="text-[10px] text-muted-foreground">{items.length}</span>
                            </div>
                            <div className="space-y-1">
                              {items.map(item => {
                                const typeInfo = ACTIVITY_TYPES.find(t => t.id === item.type) || ACTIVITY_TYPES[4];
                                const Icon = typeInfo.icon;
                                const isCompleted = !!item.completedAt;
                                const isOverdue = group === "Atrasadas";
                                return (
                                  <div key={`${item.source}-${item.id}`} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 group transition-colors ${
                                    isCompleted ? "bg-muted/20 opacity-60" :
                                    isOverdue ? "border-destructive/30 bg-destructive/5" :
                                    "bg-card hover:bg-muted/30"
                                  }`}>
                                    <button
                                      type="button"
                                      onClick={() => isCompleted
                                        ? handleUncompleteUnified(item.id, item.source)
                                        : handleCompleteUnified(item.id, item.source)
                                      }
                                      className="shrink-0"
                                    >
                                      {isCompleted
                                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        : <div className={`h-4 w-4 rounded-full border-2 transition-colors ${isOverdue ? "border-destructive" : "border-muted-foreground/30 group-hover:border-muted-foreground"}`} />
                                      }
                                    </button>
                                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isCompleted ? "text-muted-foreground" : typeInfo.color}`} />
                                    <div className="flex-1 min-w-0">
                                      <span className={`text-sm ${isCompleted ? "line-through text-muted-foreground" : ""}`}>{item.title}</span>
                                      {item.assignedName && (
                                        <span className="text-[10px] text-muted-foreground block leading-tight">{item.assignedName.split(" ")[0]}</span>
                                      )}
                                    </div>
                                    {item.dueDate && (
                                      <span className={`text-xs shrink-0 font-medium ${isOverdue && !isCompleted ? "text-destructive" : "text-muted-foreground"}`}>
                                        {new Date(item.dueDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUnified(item.id, item.source)}
                                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Empty state */}
                    {unifiedItems.filter(i => !i.completedAt).length === 0 && (
                      <p className="text-xs text-muted-foreground/60 text-center py-4">Nenhuma atividade pendente</p>
                    )}

                    {/* Show completed toggle */}
                    {unifiedItems.some(i => !!i.completedAt) && (
                      <button
                        type="button"
                        onClick={() => setShowCompleted(v => !v)}
                        className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {showCompleted
                          ? "Ocultar concluídas"
                          : `Ver concluídas (${unifiedItems.filter(i => !!i.completedAt).length})`
                        }
                      </button>
                    )}

                    {/* Add activity form */}
                    <div className="mt-4 pt-3 border-t space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={newActivityTitle}
                          onChange={e => setNewActivityTitle(e.target.value)}
                          placeholder="Título da atividade..."
                          className="h-8 text-sm flex-1"
                          onKeyDown={e => { if (e.key === "Enter") handleAddActivity(); }}
                        />
                        <Button size="sm" type="button" className="h-8 px-3 shrink-0" onClick={handleAddActivity} disabled={addingActivity || !newActivityTitle.trim()}>
                          {addingActivity ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                          {!addingActivity && "Adicionar"}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Select value={newActivityType} onValueChange={setNewActivityType}>
                          <SelectTrigger className="h-7 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIVITY_TYPES.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">Data:</span>
                          <Input
                            type="date"
                            value={newActivityDate}
                            onChange={e => setNewActivityDate(e.target.value)}
                            className="h-7 text-xs w-32"
                          />
                        </div>
                        {staffList.length > 0 && (
                          <Select value={newActivityAssigned || "__none__"} onValueChange={v => setNewActivityAssigned(v === "__none__" ? "" : v)}>
                            <SelectTrigger className="h-7 text-xs w-36">
                              <SelectValue placeholder="Responsável" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sem responsável</SelectItem>
                              {staffList.map(s => (
                                <SelectItem key={s.user_id} value={s.user_id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t" />

                  {/* Comment input */}
                  <div className="space-y-2">
                    <Textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Adicionar comentário interno..."
                      rows={2}
                      className="text-sm resize-none"
                      onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSendComment(); }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Cmd+Enter para enviar</span>
                      <Button size="sm" onClick={handleSendComment} disabled={sendingComment || !comment.trim()}>
                        {sendingComment ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                        Comentar
                      </Button>
                    </div>
                  </div>

                  {/* Timeline */}
                  {timelineItems.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                        <GitBranch className="h-3.5 w-3.5" />
                        Histórico
                      </p>
                      <div className="relative pl-5">
                        <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                        <div className="space-y-3">
                          {timelineItems.map(item => (
                            <div key={item.id} className="relative">
                              <div className={`absolute -left-3 top-2 h-3 w-3 rounded-full border-2 border-background ${
                                item.type === "comment" ? "bg-blue-500" :
                                item.type === "cs_task_done" ? "bg-green-500" :
                                "bg-muted-foreground/50"
                              }`} />
                              <div className={`rounded-lg p-3 ${item.type === "comment" ? "bg-muted/40 border" : "bg-muted/15"}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">{item.author}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(item.date).toLocaleDateString("pt-BR", {
                                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                {item.type === "comment" ? (
                                  <p className="text-sm whitespace-pre-wrap">{item.content}</p>
                                ) : item.type === "cs_task_done" ? (
                                  <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    Concluído: {item.content}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">
                                    {(item as any).event === "stage_changed"
                                      ? `Etapa: ${CRM_STAGES.find(s => s.id === (item as any).payload?.from)?.label || (item as any).payload?.from} → ${CRM_STAGES.find(s => s.id === (item as any).payload?.to)?.label || (item as any).payload?.to}`
                                      : (item as any).event === "created"
                                      ? "Cliente adicionado ao CRM"
                                      : (item as any).event === "commented"
                                      ? "Adicionou um comentário"
                                      : (item as any).event}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
