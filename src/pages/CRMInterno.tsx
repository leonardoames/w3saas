import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Lock, LayoutDashboard, Columns3, List, Minimize2, Maximize2, Activity } from "lucide-react";
import { CRMClientDrawer, CRM_STAGES } from "@/components/crm/CRMClientDrawer";
import { CRMDashboardView } from "@/components/crm/CRMDashboardView";
import { CRMAlerts } from "@/components/crm/CRMAlerts";
import { CRMListView } from "@/components/crm/CRMListView";
import { CRMActivitiesView } from "@/components/crm/CRMActivitiesView";
import { HealthScoreBadge, computeHealthScore, getHealthScoreInfo } from "@/components/crm/HealthScoreBadge";
import { MiniSparkline } from "@/components/crm/MiniSparkline";
import type { CRMCardExtended } from "@/components/crm/types";

// SLA limits per stage (days). null = no limit.
const SLA_LIMITS: Record<string, number | null> = {
  onboarding: 60,
  engajado:   null,
  risco:      21,
  alerta:     14,
  congelado:  90,
};

function computeSLA(stage: string, stageUpdatedAt: string | null): { exceeded: boolean; label: string | null; limitDays: number | null } {
  const limit = SLA_LIMITS[stage] ?? null;
  if (limit === null || !stageUpdatedAt) return { exceeded: false, label: null, limitDays: null };
  const days = Math.floor((Date.now() - new Date(stageUpdatedAt).getTime()) / 86400000);
  return {
    exceeded: days > limit,
    label: `${days}d / ${limit}d`,
    limitDays: limit,
  };
}

// Compact card: 48px, favicon + name + health badge + SLA dot
function CompactCard({ card, onClick }: { card: CRMCardExtended; onClick: () => void }) {
  const info = getHealthScoreInfo(card.healthScore);
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 h-12 rounded-lg border bg-card px-2.5 cursor-pointer hover:shadow-md transition-all select-none border-l-[3px] ${info.borderColor}`}
    >
      {card.site && (
        <img
          src={`https://www.google.com/s2/favicons?domain=${card.site}&sz=16`}
          alt="" className="h-4 w-4 rounded-sm shrink-0"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <p className="text-xs font-semibold truncate flex-1">
        {card.nomeLoja || card.fullName || card.email || "—"}
      </p>
      {card.csName && (
        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-medium truncate max-w-[72px] shrink-0 hidden sm:block">
          {card.csName.split(" ")[0]}
        </span>
      )}
      {card.slaExceeded && (
        <span className="h-2 w-2 rounded-full bg-destructive shrink-0" title="SLA excedido" />
      )}
      <HealthScoreBadge score={card.healthScore} size="sm" />
    </div>
  );
}

// Normal card
function CRMCardItem({ card, onClick, isDragging }: { card: CRMCardExtended; onClick: () => void; isDragging: boolean }) {
  const info = getHealthScoreInfo(card.healthScore);
  const taskPct = card.totalTasks > 0 ? (card.completedTasks / card.totalTasks) * 100 : 0;
  const today = new Date().toISOString().split("T")[0];
  const contactOverdue = card.nextContactDate && card.nextContactDate < today;

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border bg-card p-3 cursor-pointer hover:shadow-md transition-all select-none group border-l-[3px] ${info.borderColor} ${isDragging ? "opacity-40 shadow-lg rotate-1" : ""}`}
    >
      {/* Brand / client name + health */}
      <div className="flex items-start gap-1.5 mb-1.5">
        {card.site && (
          <img
            src={`https://www.google.com/s2/favicons?domain=${card.site}&sz=16`}
            alt="" className="h-4 w-4 rounded-sm shrink-0 mt-0.5"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <p className="text-sm font-semibold leading-tight truncate flex-1">
          {card.nomeLoja || card.fullName || card.email || "—"}
        </p>
        <HealthScoreBadge score={card.healthScore} size="sm" />
      </div>

      {/* Client name if differs from brand */}
      {card.nomeLoja && card.fullName && (
        <p className="text-xs text-muted-foreground mb-1.5 truncate">{card.fullName}</p>
      )}

      {/* CS + dates */}
      <div className="flex flex-wrap gap-1 mb-2">
        {card.csName && (
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full font-medium truncate max-w-[90px]">
            {card.csName}
          </span>
        )}
        {card.createdAt && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(card.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
          </span>
        )}
        {card.accessExpiresAt && (
          <span className={`text-[10px] ${new Date(card.accessExpiresAt) < new Date() ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            → {new Date(card.accessExpiresAt).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}
          </span>
        )}
      </div>

      {/* Task progress + sparkline */}
      <div className="flex items-center gap-2 mb-1.5">
        {card.totalTasks > 0 && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${taskPct === 100 ? "bg-green-500" : "bg-primary"}`}
                style={{ width: `${taskPct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {card.completedTasks}/{card.totalTasks}
            </span>
          </div>
        )}
        {card.sparkline.length >= 2 && (
          <MiniSparkline values={card.sparkline} />
        )}
      </div>

      {/* Next contact + SLA */}
      <div className="flex items-center justify-between">
        {contactOverdue ? (
          <span className="text-[10px] text-destructive font-medium">
            Contato atrasado
          </span>
        ) : card.nextContactDate ? (
          <span className="text-[10px] text-muted-foreground">
            Contato: {new Date(card.nextContactDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        ) : <span />}

        {card.slaLabel && (
          <span className={`text-[10px] font-medium ${card.slaExceeded ? "text-destructive" : "text-muted-foreground/50"}`}>
            {card.slaLabel}
          </span>
        )}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  cards: CRMCardExtended[];
  search: string;
  compact: boolean;
  onCardClick: (userId: string) => void;
  onDragStageChange: (userId: string, newStage: string) => void;
}

function KanbanBoard({ cards, search, compact, onCardClick, onDragStageChange }: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase();
    return cards.filter(c =>
      c.nomeLoja?.toLowerCase().includes(q) ||
      c.fullName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.csName?.toLowerCase().includes(q)
    );
  }, [cards, search]);

  const handleDragStart = (e: React.DragEvent, userId: string) => {
    setDraggingId(userId);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stageId);
  };
  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggingId) {
      const card = cards.find(c => c.userId === draggingId);
      if (card && card.stage !== stageId) onDragStageChange(draggingId, stageId);
    }
    setDraggingId(null);
    setDragOverStage(null);
  };
  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-6" style={{ minHeight: "calc(100vh - 280px)" }}>
      {CRM_STAGES.map(stage => {
        const stageCards = filtered.filter(c => c.stage === stage.id);
        const isTarget = dragOverStage === stage.id;
        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-[210px] flex flex-col"
            onDragOver={e => handleDragOver(e, stage.id)}
            onDrop={e => handleDrop(e, stage.id)}
            onDragLeave={() => setDragOverStage(null)}
          >
            <div
              className={`flex-1 rounded-xl border overflow-hidden flex flex-col transition-all duration-150 ${
                isTarget ? "ring-2 ring-primary ring-offset-2 scale-[1.01]" : ""
              }`}
            >
              <div className={`h-1 shrink-0 ${stage.dot}`} />
              <div className="px-3 pt-2.5 pb-2 border-b bg-muted/30 shrink-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-semibold truncate ${stage.text}`}>{stage.label}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                    {stageCards.length}
                  </Badge>
                </div>
              </div>
              <div className={`flex-1 p-2 min-h-[200px] transition-colors ${compact ? "space-y-1" : "space-y-2"} ${isTarget ? "bg-primary/5" : "bg-muted/10"}`}>
                {stageCards.map(card => (
                  <div
                    key={card.userId}
                    draggable
                    onDragStart={e => handleDragStart(e, card.userId)}
                    onDragEnd={handleDragEnd}
                  >
                    {compact ? (
                      <CompactCard card={card} onClick={() => onCardClick(card.userId)} />
                    ) : (
                      <CRMCardItem
                        card={card}
                        onClick={() => onCardClick(card.userId)}
                        isDragging={draggingId === card.userId}
                      />
                    )}
                  </div>
                ))}
                {stageCards.length === 0 && !isTarget && (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-xs text-muted-foreground/30">Vazio</p>
                  </div>
                )}
                {isTarget && (
                  <div className="flex items-center justify-center py-8 rounded-lg border-2 border-dashed border-primary/40">
                    <p className="text-xs text-primary/60">Soltar aqui</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CRMInterno() {
  const { user, isAdmin, hasRole } = useAuth();
  const isStaff = isAdmin || ["master", "tutor", "cs"].some(r => hasRole(r));

  const [cards, setCards] = useState<CRMCardExtended[]>([]);
  const [allClientIds, setAllClientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "lista" | "dashboard" | "atividades">("kanban");
  const [compact, setCompact] = useState(false);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [alertFilter, setAlertFilter] = useState<{ fn: (c: CRMCardExtended) => boolean; label: string } | null>(null);

  useEffect(() => {
    if (isStaff) loadData();
    else setLoading(false);
  }, [isStaff]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: idRows, error: idErr } = await supabase.rpc("get_dash_admin_mentorado_ids" as any);
      if (idErr) throw idErr;

      const clientIds: string[] = (idRows || []).map((r: any) => r.mentorado_id).filter(Boolean);
      if (clientIds.length === 0) {
        setCards([]);
        setAllClientIds([]);
        setLoading(false);
        return;
      }
      setAllClientIds(clientIds);

      const [crmRes, profilesRes, brandsRes, tasksRes, csRes, auditsRes] = await Promise.all([
        (supabase as any).from("crm_clients")
          .select("id, user_id, stage, stage_updated_at, next_contact_date, quick_note, valor_contrato, data_fim_contrato")
          .in("user_id", clientIds),
        supabase.from("profiles")
          .select("user_id, full_name, email, created_at, access_expires_at, last_login_at")
          .in("user_id", clientIds),
        supabase.from("brands").select("user_id, name, website_url").in("user_id", clientIds),
        supabase.from("tarefas").select("user_id, status").in("user_id", clientIds),
        (supabase as any).from("staff_carteiras").select("mentorado_id, staff_id").in("mentorado_id", clientIds),
        // Fetch last 4 audits for sparklines
        (supabase as any).from("result_audits")
          .select("user_id, mes_referencia, faturamento")
          .in("user_id", clientIds)
          .order("mes_referencia", { ascending: false }),
      ]);

      const crmMap = new Map<string, any>();
      (crmRes.data || []).forEach((c: any) => crmMap.set(c.user_id, c));

      const profileMap = new Map<string, any>();
      (profilesRes.data || []).forEach((p: any) => profileMap.set(p.user_id, p));

      const brandMap = new Map<string, any>();
      (brandsRes.data || []).forEach((b: any) => {
        if (!brandMap.has(b.user_id)) brandMap.set(b.user_id, b);
      });

      const taskMap = new Map<string, { total: number; completed: number }>();
      (tasksRes.data || []).forEach((t: any) => {
        const curr = taskMap.get(t.user_id) || { total: 0, completed: 0 };
        if (t.status !== "cancelada") curr.total++;
        if (t.status === "concluida") curr.completed++;
        taskMap.set(t.user_id, curr);
      });

      const csAssignMap = new Map<string, string>();
      const csIds: string[] = [];
      (csRes.data || []).forEach((a: any) => {
        csAssignMap.set(a.mentorado_id, a.staff_id);
        if (a.staff_id && !csIds.includes(a.staff_id)) csIds.push(a.staff_id);
      });

      const csNameMap = new Map<string, string>();
      if (csIds.length > 0) {
        const { data: csProfiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", csIds);
        (csProfiles || []).forEach((p: any) => {
          csNameMap.set(p.user_id, p.full_name || p.email || "—");
        });
      }

      // Build sparkline map: userId -> last 4 faturamento values (oldest→newest)
      const auditsByUser = new Map<string, number[]>();
      (auditsRes.data || []).forEach((a: any) => {
        if (a.faturamento !== null) {
          const list = auditsByUser.get(a.user_id) || [];
          list.push(a.faturamento);
          auditsByUser.set(a.user_id, list);
        }
      });
      // Since ordered desc, reverse to get oldest→newest, take last 4
      auditsByUser.forEach((vals, uid) => {
        auditsByUser.set(uid, vals.slice(0, 4).reverse());
      });

      const newCards: CRMCardExtended[] = clientIds.map(id => {
        const crm = crmMap.get(id);
        const profile = profileMap.get(id);
        const brand = brandMap.get(id);
        const tasks = taskMap.get(id) || { total: 0, completed: 0 };
        const csId = csAssignMap.get(id) || null;
        const sparkline = auditsByUser.get(id) || [];
        const stage = crm?.stage ?? "onboarding";
        const stageUpdatedAt = crm?.stage_updated_at ?? null;

        const lastLoginDaysAgo = profile?.last_login_at
          ? Math.floor((Date.now() - new Date(profile.last_login_at).getTime()) / 86400000)
          : null;

        const healthScore = computeHealthScore({
          lastLoginDaysAgo,
          completedTasks: tasks.completed,
          totalTasks: tasks.total,
          sparkline,
          stage,
        });

        const sla = computeSLA(stage, stageUpdatedAt);

        return {
          userId: id,
          crmId: crm?.id ?? null,
          stage,
          stageUpdatedAt,
          fullName: profile?.full_name ?? null,
          email: profile?.email ?? null,
          nomeLoja: brand?.name ?? null,
          site: brand?.website_url ?? null,
          csName: csId ? (csNameMap.get(csId) ?? null) : null,
          csId,
          totalTasks: tasks.total,
          completedTasks: tasks.completed,
          accessExpiresAt: profile?.access_expires_at ?? null,
          createdAt: profile?.created_at ?? null,
          healthScore,
          slaExceeded: sla.exceeded,
          slaLabel: sla.label,
          slaLimitDays: sla.limitDays,
          sparkline,
          nextContactDate: crm?.next_contact_date ?? null,
          quickNote: crm?.quick_note ?? null,
          lastLoginDaysAgo,
          valorContrato: crm?.valor_contrato ?? null,
          dataFimContrato: crm?.data_fim_contrato ?? null,
          lastAuditFaturamento: sparkline.length > 0 ? sparkline[sparkline.length - 1] : null,
        };
      });

      setCards(newCards);
    } catch (err) {
      console.error("CRM load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageSync = (userId: string, newStage: string) => {
    setCards(prev => prev.map(c => {
      if (c.userId !== userId) return c;
      const sla = computeSLA(newStage, new Date().toISOString());
      return { ...c, stage: newStage, stageUpdatedAt: new Date().toISOString(), slaExceeded: sla.exceeded, slaLabel: sla.label, slaLimitDays: sla.limitDays };
    }));
  };

  const handleDragStageChange = async (userId: string, newStage: string) => {
    const card = cards.find(c => c.userId === userId);
    if (!card) return;
    const oldStage = card.stage;

    setCards(prev => prev.map(c => {
      if (c.userId !== userId) return c;
      const sla = computeSLA(newStage, new Date().toISOString());
      return { ...c, stage: newStage, stageUpdatedAt: new Date().toISOString(), slaExceeded: sla.exceeded, slaLabel: sla.label, slaLimitDays: sla.limitDays };
    }));

    const { data: upserted, error } = await (supabase as any).from("crm_clients").upsert({
      user_id: userId,
      stage: newStage,
      stage_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select("id").single();

    if (error) {
      setCards(prev => prev.map(c =>
        c.userId === userId ? { ...c, stage: oldStage, stageUpdatedAt: card.stageUpdatedAt } : c
      ));
      return;
    }

    const crmId = upserted?.id || card.crmId;
    if (crmId) {
      setCards(prev => prev.map(c => c.userId === userId ? { ...c, crmId } : c));
      await (supabase as any).from("crm_activity_log").insert({
        crm_client_id: crmId,
        author_id: user?.id,
        event: "stage_changed",
        payload: { from: oldStage, to: newStage },
      });
    }
  };

  const handleAlertFilter = (fn: (c: CRMCardExtended) => boolean, label: string) => {
    setAlertFilter({ fn, label });
    if (view === "dashboard") setView("lista");
    else if (view !== "lista") setView("kanban");
  };

  const clearAlertFilter = () => setAlertFilter(null);

  const displayedCards = alertFilter ? cards.filter(alertFilter.fn) : cards;

  if (!isStaff && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock className="h-10 w-10 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">Acesso Restrito</h2>
        <p className="text-sm text-muted-foreground mt-1">Este módulo é exclusivo para o time interno.</p>
      </div>
    );
  }

  const atRisk = cards.filter(c => c.stage === "risco" || c.stage === "alerta").length;
  const healthAvg = cards.length > 0 ? Math.round(cards.reduce((s, c) => s + c.healthScore, 0) / cards.length) : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">CRM Interno</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento de CS & Tutores</p>
        </div>

        {!loading && cards.length > 0 && (
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Clientes</p>
              <p className="text-2xl font-bold">{cards.length}</p>
            </div>
            {atRisk > 0 && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Risco/Alerta</p>
                <p className="text-2xl font-bold text-orange-500 dark:text-orange-400">{atRisk}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Health Médio</p>
              <p className={`text-2xl font-bold ${getHealthScoreInfo(healthAvg).textColor}`}>{healthAvg}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Concluídos</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {cards.filter(c => c.stage === "concluido").length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {!loading && cards.length > 0 && (
        <CRMAlerts cards={cards} onFilter={handleAlertFilter} />
      )}

      {/* Active filter banner */}
      {alertFilter && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
          <span className="font-medium text-primary">Filtro ativo:</span>
          <span className="text-muted-foreground flex-1 truncate">{alertFilter.label}</span>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2 shrink-0" onClick={clearAlertFilter}>
            Limpar
          </Button>
        </div>
      )}

      {/* View toggle + compact + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border p-0.5 gap-0.5">
          <Button
            size="sm"
            variant={view === "kanban" ? "secondary" : "ghost"}
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setView("kanban")}
          >
            <Columns3 className="h-3.5 w-3.5" />
            Kanban
          </Button>
          <Button
            size="sm"
            variant={view === "lista" ? "secondary" : "ghost"}
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setView("lista")}
          >
            <List className="h-3.5 w-3.5" />
            Lista
          </Button>
          <Button
            size="sm"
            variant={view === "dashboard" ? "secondary" : "ghost"}
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setView("dashboard")}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Button>
          <Button
            size="sm"
            variant={view === "atividades" ? "secondary" : "ghost"}
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setView("atividades")}
          >
            <Activity className="h-3.5 w-3.5" />
            Atividades
          </Button>
        </div>

        {view === "kanban" && view !== "atividades" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setCompact(v => !v)}
            title={compact ? "Modo normal" : "Modo compacto"}
          >
            {compact ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            {compact ? "Normal" : "Compacto"}
          </Button>
        )}

        {(view === "kanban" || view === "lista") && view !== "atividades" && (
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, loja, CS..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : view === "atividades" ? (
        <CRMActivitiesView cards={cards} onCardClick={setDrawerUserId} />
      ) : view === "dashboard" ? (
        <CRMDashboardView clientIds={allClientIds} cards={cards} />
      ) : view === "lista" ? (
        <CRMListView cards={displayedCards} search={search} onCardClick={setDrawerUserId} />
      ) : displayedCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">Nenhum cliente na sua carteira</p>
        </div>
      ) : (
        <KanbanBoard
          cards={displayedCards}
          search={search}
          compact={compact}
          onCardClick={setDrawerUserId}
          onDragStageChange={handleDragStageChange}
        />
      )}

      {/* Drawer */}
      <CRMClientDrawer
        userId={drawerUserId}
        open={!!drawerUserId}
        onClose={() => setDrawerUserId(null)}
        onStageChange={handleStageSync}
      />
    </div>
  );
}
