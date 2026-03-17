import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, GitBranch, MessageSquare, CheckSquare, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CRM_STAGES } from "@/components/crm/CRMClientDrawer";
import type { CRMCardExtended } from "@/components/crm/types";

interface ActivityItem {
  id: string;
  type: "stage_change" | "comment" | "cs_task";
  date: string;
  clientName: string;
  clientUserId: string;
  authorId: string | null;
  authorName: string;
  content: string;
  payload?: any;
}

function eventLabel(event: string, payload: any): string {
  if (event === "stage_changed") {
    const from = CRM_STAGES.find(s => s.id === payload?.from)?.label ?? payload?.from ?? "—";
    const to = CRM_STAGES.find(s => s.id === payload?.to)?.label ?? payload?.to ?? "—";
    return `Moveu de ${from} → ${to}`;
  }
  if (event === "commented") return "Adicionou um comentário";
  return event;
}

function groupByDate(items: ActivityItem[]): { label: string; items: ActivityItem[] }[] {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const map = new Map<string, ActivityItem[]>();

  items.forEach(item => {
    const d = new Date(item.date);
    const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const raw = d.toDateString();
    const label = raw === today ? "Hoje" : raw === yesterday ? "Ontem" : key;
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  });

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

interface CRMLogsViewProps {
  cards: CRMCardExtended[];
  onCardClick: (userId: string) => void;
}

export function CRMLogsView({ cards, onCardClick }: CRMLogsViewProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "stage_change" | "comment" | "cs_task">("all");
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (cards.length === 0) { setLoading(false); return; }
    loadActivities();
  }, [cards]);

  const loadActivities = async () => {
    setLoading(true);

    const crmIdToCard = new Map<string, CRMCardExtended>();
    cards.forEach(c => { if (c.crmId) crmIdToCard.set(c.crmId, c); });
    const allCrmIds = Array.from(crmIdToCard.keys());
    const allClientIds = cards.map(c => c.userId);

    if (allCrmIds.length === 0 && allClientIds.length === 0) {
      setActivities([]);
      setLoading(false);
      return;
    }

    const [logsRes, commentsRes, tasksRes] = await Promise.all([
      allCrmIds.length > 0
        ? (supabase as any).from("crm_activity_log")
            .select("id, event, payload, created_at, author_id, crm_client_id")
            .in("crm_client_id", allCrmIds)
            .order("created_at", { ascending: false })
            .limit(300)
        : Promise.resolve({ data: [] }),

      allCrmIds.length > 0
        ? (supabase as any).from("crm_comments")
            .select("id, content, created_at, author_id, crm_client_id")
            .in("crm_client_id", allCrmIds)
            .order("created_at", { ascending: false })
            .limit(300)
        : Promise.resolve({ data: [] }),

      allClientIds.length > 0
        ? (supabase as any).from("cs_tasks")
            .select("id, title, completed_at, cs_id, responsible_id, client_user_id")
            .in("client_user_id", allClientIds)
            .not("completed_at", "is", null)
            .order("completed_at", { ascending: false })
            .limit(300)
        : Promise.resolve({ data: [] }),
    ]);

    const authorIdSet = new Set<string>();
    (logsRes.data || []).forEach((l: any) => l.author_id && authorIdSet.add(l.author_id));
    (commentsRes.data || []).forEach((c: any) => c.author_id && authorIdSet.add(c.author_id));
    (tasksRes.data || []).forEach((t: any) => {
      if (t.responsible_id) authorIdSet.add(t.responsible_id);
      else if (t.cs_id) authorIdSet.add(t.cs_id);
    });

    const authorMap = new Map<string, string>();
    if (authorIdSet.size > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", Array.from(authorIdSet));
      (profiles || []).forEach((p: any) => {
        authorMap.set(p.user_id, p.full_name || p.email || "—");
      });
    }

    const clientName = (userId: string) => {
      const c = cards.find(x => x.userId === userId);
      return c?.nomeLoja || c?.fullName || c?.email || "—";
    };

    const combined: ActivityItem[] = [
      ...(logsRes.data || []).map((l: any) => {
        const card = crmIdToCard.get(l.crm_client_id);
        return {
          id: `log-${l.id}`,
          type: "stage_change" as const,
          date: l.created_at,
          clientName: card ? (card.nomeLoja || card.fullName || card.email || "—") : "—",
          clientUserId: card?.userId ?? "",
          authorId: l.author_id,
          authorName: authorMap.get(l.author_id) || "—",
          content: eventLabel(l.event, l.payload),
          payload: l.payload,
        };
      }),

      ...(commentsRes.data || []).map((c: any) => {
        const card = crmIdToCard.get(c.crm_client_id);
        return {
          id: `comment-${c.id}`,
          type: "comment" as const,
          date: c.created_at,
          clientName: card ? (card.nomeLoja || card.fullName || card.email || "—") : "—",
          clientUserId: card?.userId ?? "",
          authorId: c.author_id,
          authorName: authorMap.get(c.author_id) || "—",
          content: c.content,
        };
      }),

      ...(tasksRes.data || []).map((t: any) => {
        const authorId = t.responsible_id || t.cs_id;
        return {
          id: `task-${t.id}`,
          type: "cs_task" as const,
          date: t.completed_at,
          clientName: clientName(t.client_user_id),
          clientUserId: t.client_user_id,
          authorId,
          authorName: authorId ? (authorMap.get(authorId) || "—") : "—",
          content: t.title,
        };
      }),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setActivities(combined);

    // Build staff list from unique authors
    const seenStaff = new Map<string, string>();
    combined.forEach(a => {
      if (a.authorId && !seenStaff.has(a.authorId)) {
        seenStaff.set(a.authorId, a.authorName);
      }
    });
    setStaffList(Array.from(seenStaff.entries()).map(([id, name]) => ({ id, name })));
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (staffFilter && a.authorId !== staffFilter) return false;
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      return true;
    });
  }, [activities, staffFilter, typeFilter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Type filter */}
        <div className="flex rounded-lg border p-0.5 gap-0.5">
          {([
            { key: "all", label: "Todos" },
            { key: "stage_change", label: "Etapas" },
            { key: "comment", label: "Comentários" },
            { key: "cs_task", label: "Tarefas CS" },
          ] as const).map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTypeFilter(opt.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                typeFilter === opt.key
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Staff filter */}
        {staffList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Responsável:
            </span>
            <button
              type="button"
              onClick={() => setStaffFilter(null)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                !staffFilter
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            {staffList.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStaffFilter(staffFilter === s.id ? null : s.id)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                  staffFilter === s.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                }`}
              >
                {s.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}

        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} atividades</span>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma atividade para os filtros selecionados</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group.label}</p>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-1">
                {group.items.map(item => (
                  <ActivityRow key={item.id} item={item} onClientClick={onCardClick} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ item, onClientClick }: { item: ActivityItem; onClientClick: (id: string) => void }) {
  const time = new Date(item.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const icon = item.type === "stage_change"
    ? <GitBranch className="h-3.5 w-3.5 text-blue-500" />
    : item.type === "comment"
    ? <MessageSquare className="h-3.5 w-3.5 text-violet-500" />
    : <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />;

  const typeBadge = item.type === "stage_change"
    ? <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Etapa</Badge>
    : item.type === "comment"
    ? <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">Comentário</Badge>
    : <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Tarefa CS</Badge>;

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium">{item.authorName}</span>
          {typeBadge}
          {item.clientUserId && (
            <button
              type="button"
              onClick={() => item.clientUserId && onClientClick(item.clientUserId)}
              className="text-xs text-primary hover:underline font-medium truncate max-w-[140px]"
            >
              {item.clientName}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.content}</p>
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{time}</span>
    </div>
  );
}
