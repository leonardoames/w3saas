import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Lock, AlertTriangle, LayoutDashboard, Columns3 } from "lucide-react";
import { CRMClientDrawer, CRM_STAGES } from "@/components/crm/CRMClientDrawer";
import { CRMDashboardView } from "@/components/crm/CRMDashboardView";

interface CRMCard {
  userId: string;
  crmId: string | null;
  stage: string;
  stageUpdatedAt: string | null;
  fullName: string | null;
  email: string | null;
  nomeLoja: string | null;
  site: string | null;
  csName: string | null;
  csId: string | null;
  totalTasks: number;
  completedTasks: number;
  accessExpiresAt: string | null;
  createdAt: string | null;
}

function daysInStage(d: string | null) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function CRMCardItem({ card, onClick, isDragging }: { card: CRMCard; onClick: () => void; isDragging: boolean }) {
  const days = daysInStage(card.stageUpdatedAt);
  const taskPct = card.totalTasks > 0 ? (card.completedTasks / card.totalTasks) * 100 : 0;

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border bg-background p-3 cursor-pointer hover:shadow-md transition-all select-none group ${isDragging ? "opacity-40 shadow-lg rotate-1" : ""}`}
    >
      {/* Brand / client name */}
      <div className="flex items-start gap-1.5 mb-1.5">
        {card.site && (
          <img
            src={`https://www.google.com/s2/favicons?domain=${card.site}&sz=16`}
            alt=""
            className="h-4 w-4 rounded-sm shrink-0 mt-0.5"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <p className="text-sm font-semibold leading-tight truncate flex-1">
          {card.nomeLoja || card.fullName || card.email || "—"}
        </p>
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

      {/* Task progress */}
      {card.totalTasks > 0 && (
        <div className="flex items-center gap-1.5 mb-1.5">
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

      {/* Days in stage */}
      {days !== null && days > 0 && (
        <div className="flex justify-end">
          <span className={`text-[10px] ${days > 30 ? "text-orange-500 font-medium" : "text-muted-foreground/50"}`}>
            {days}d nesta etapa
          </span>
        </div>
      )}
    </div>
  );
}

interface KanbanBoardProps {
  cards: CRMCard[];
  search: string;
  onCardClick: (userId: string) => void;
  onDragStageChange: (userId: string, newStage: string) => void;
}

function KanbanBoard({ cards, search, onCardClick, onDragStageChange }: KanbanBoardProps) {
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
      if (card && card.stage !== stageId) {
        onDragStageChange(draggingId, stageId);
      }
    }
    setDraggingId(null);
    setDragOverStage(null);
  };
  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-6" style={{ minHeight: "calc(100vh - 220px)" }}>
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
              {/* Colored top bar */}
              <div className={`h-1 shrink-0 ${stage.dot}`} />

              {/* Column header */}
              <div className="px-3 pt-2.5 pb-2 border-b bg-muted/30 shrink-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-semibold truncate ${stage.text}`}>{stage.label}</span>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                    {stageCards.length}
                  </Badge>
                </div>
              </div>

              {/* Cards */}
              <div className={`flex-1 p-2 space-y-2 min-h-[200px] transition-colors ${isTarget ? "bg-primary/5" : "bg-muted/10"}`}>
                {stageCards.map(card => (
                  <div
                    key={card.userId}
                    draggable
                    onDragStart={e => handleDragStart(e, card.userId)}
                    onDragEnd={handleDragEnd}
                  >
                    <CRMCardItem
                      card={card}
                      onClick={() => onCardClick(card.userId)}
                      isDragging={draggingId === card.userId}
                    />
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

  const [cards, setCards] = useState<CRMCard[]>([]);
  const [allClientIds, setAllClientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "dashboard">("kanban");
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);

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

      const [crmRes, profilesRes, brandsRes, tasksRes, csRes] = await Promise.all([
        (supabase as any).from("crm_clients").select("id, user_id, stage, stage_updated_at").in("user_id", clientIds),
        supabase.from("profiles").select("user_id, full_name, email, created_at, access_expires_at").in("user_id", clientIds),
        supabase.from("brands").select("user_id, name, website_url").in("user_id", clientIds),
        supabase.from("tarefas").select("user_id, status").in("user_id", clientIds),
        (supabase as any).from("staff_carteiras").select("mentorado_id, staff_id").in("mentorado_id", clientIds),
      ]);

      const crmMap = new Map<string, { id: string; stage: string; stageUpdatedAt: string | null }>();
      (crmRes.data || []).forEach((c: any) => {
        crmMap.set(c.user_id, { id: c.id, stage: c.stage, stageUpdatedAt: c.stage_updated_at });
      });

      const profileMap = new Map<string, { full_name: string | null; email: string | null; created_at: string | null; access_expires_at: string | null }>();
      (profilesRes.data || []).forEach((p: any) => {
        profileMap.set(p.user_id, { full_name: p.full_name, email: p.email, created_at: p.created_at, access_expires_at: p.access_expires_at });
      });

      const brandMap = new Map<string, { name: string | null; website_url: string | null }>();
      (brandsRes.data || []).forEach((b: any) => {
        if (!brandMap.has(b.user_id)) brandMap.set(b.user_id, { name: b.name, website_url: b.website_url });
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

      const newCards: CRMCard[] = clientIds.map(id => {
        const crm = crmMap.get(id);
        const profile = profileMap.get(id);
        const brand = brandMap.get(id);
        const tasks = taskMap.get(id) || { total: 0, completed: 0 };
        const csId = csAssignMap.get(id) || null;
        return {
          userId: id,
          crmId: crm?.id ?? null,
          stage: crm?.stage ?? "onboarding",
          stageUpdatedAt: crm?.stageUpdatedAt ?? null,
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
        };
      });

      setCards(newCards);
    } catch (err) {
      console.error("CRM load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Called by drawer (after DB update already done) — just sync local state
  const handleStageSync = (userId: string, newStage: string) => {
    setCards(prev => prev.map(c =>
      c.userId === userId ? { ...c, stage: newStage, stageUpdatedAt: new Date().toISOString() } : c
    ));
  };

  // Called by drag-and-drop — does DB update + log
  const handleDragStageChange = async (userId: string, newStage: string) => {
    const card = cards.find(c => c.userId === userId);
    if (!card) return;
    const oldStage = card.stage;

    // Optimistic update
    setCards(prev => prev.map(c =>
      c.userId === userId ? { ...c, stage: newStage, stageUpdatedAt: new Date().toISOString() } : c
    ));

    const { data: upserted, error } = await (supabase as any).from("crm_clients").upsert({
      user_id: userId,
      stage: newStage,
      stage_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).select("id").single();

    if (error) {
      // Revert
      setCards(prev => prev.map(c =>
        c.userId === userId ? { ...c, stage: oldStage, stageUpdatedAt: card.stageUpdatedAt } : c
      ));
      return;
    }

    const crmId = upserted?.id || card.crmId;
    if (crmId) {
      setCards(prev => prev.map(c =>
        c.userId === userId ? { ...c, crmId } : c
      ));
      await (supabase as any).from("crm_activity_log").insert({
        crm_client_id: crmId,
        author_id: user?.id,
        event: "stage_changed",
        payload: { from: oldStage, to: newStage },
      });
    }
  };

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
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />
                  Risco/Alerta
                </p>
                <p className="text-2xl font-bold text-orange-500">{atRisk}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Concluídos</p>
              <p className="text-2xl font-bold text-emerald-600">
                {cards.filter(c => c.stage === "concluido").length}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* View toggle + search */}
      <div className="flex items-center gap-3">
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
            variant={view === "dashboard" ? "secondary" : "ghost"}
            className="h-7 px-3 text-xs gap-1.5"
            onClick={() => setView("dashboard")}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Button>
        </div>

        {view === "kanban" && (
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
      ) : view === "dashboard" ? (
        <CRMDashboardView clientIds={allClientIds} />
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-muted-foreground">Nenhum cliente na sua carteira</p>
        </div>
      ) : (
        <KanbanBoard
          cards={cards}
          search={search}
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
