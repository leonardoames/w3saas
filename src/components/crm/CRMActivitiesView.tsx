import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Phone, Users, Mail, CheckSquare, HelpCircle, CheckCircle2, User, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CRMCardExtended } from "@/components/crm/types";
import { useToast } from "@/hooks/use-toast";

export const ACTIVITY_TYPES = [
  { id: "call",    label: "Ligação",  icon: Phone,       color: "text-blue-500" },
  { id: "meeting", label: "Reunião",  icon: Users,       color: "text-violet-500" },
  { id: "email",   label: "Email",    icon: Mail,        color: "text-amber-500" },
  { id: "task",    label: "Tarefa",   icon: CheckSquare, color: "text-emerald-500" },
  { id: "other",   label: "Outro",    icon: HelpCircle,  color: "text-muted-foreground" },
];

export interface ScheduledActivity {
  id: string;
  crm_client_id: string;
  client_user_id: string;
  title: string;
  type: string;
  scheduled_for: string;
  assigned_to: string | null;
  assigned_name: string | null;
  created_by: string | null;
  completed_at: string | null;
  clientName: string;
}

type GroupKey = "Atrasadas" | "Hoje" | "Esta semana" | "Próximas" | "Concluídas";

function getGroup(date: string, completed: boolean): GroupKey {
  if (completed) return "Concluídas";
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(date + "T00:00:00"); d.setHours(0,0,0,0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "Atrasadas";
  if (diff === 0) return "Hoje";
  if (diff <= 7) return "Esta semana";
  return "Próximas";
}

const GROUP_ORDER: GroupKey[] = ["Atrasadas", "Hoje", "Esta semana", "Próximas", "Concluídas"];

interface CRMActivitiesViewProps {
  cards: CRMCardExtended[];
  onCardClick: (userId: string) => void;
}

export function CRMActivitiesView({ cards, onCardClick }: CRMActivitiesViewProps) {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ScheduledActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (cards.length === 0) { setLoading(false); return; }
    loadActivities();
  }, [cards]);

  const loadActivities = async () => {
    setLoading(true);
    const clientIds = cards.map(c => c.userId);

    const { data, error } = await (supabase as any)
      .from("crm_scheduled_activities")
      .select("id, crm_client_id, client_user_id, title, type, scheduled_for, assigned_to, created_by, completed_at")
      .in("client_user_id", clientIds)
      .order("scheduled_for", { ascending: true });

    if (error) { setLoading(false); return; }

    const assigneeIds = [...new Set((data || []).map((a: any) => a.assigned_to).filter(Boolean))];
    const assigneeMap = new Map<string, string>();
    if (assigneeIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("user_id, full_name, email").in("user_id", assigneeIds);
      (profiles || []).forEach((p: any) => assigneeMap.set(p.user_id, p.full_name || p.email || "—"));
    }

    const clientName = (uid: string) => {
      const c = cards.find(x => x.userId === uid);
      return c?.nomeLoja || c?.fullName || c?.email || "—";
    };

    const items: ScheduledActivity[] = (data || []).map((a: any) => ({
      ...a,
      assigned_name: a.assigned_to ? (assigneeMap.get(a.assigned_to) || "—") : null,
      clientName: clientName(a.client_user_id),
    }));

    setActivities(items);

    // Build staff list from assignees
    const seen = new Map<string, string>();
    items.forEach(a => { if (a.assigned_to && !seen.has(a.assigned_to)) seen.set(a.assigned_to, a.assigned_name || "—"); });
    setStaffList(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
    setLoading(false);
  };

  const handleComplete = async (id: string) => {
    const now = new Date().toISOString();
    await (supabase as any).from("crm_scheduled_activities").update({ completed_at: now }).eq("id", id);
    setActivities(prev => prev.map(a => a.id === id ? { ...a, completed_at: now } : a));
    toast({ title: "Atividade concluída" });
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("crm_scheduled_activities").delete().eq("id", id);
    setActivities(prev => prev.filter(a => a.id !== id));
    toast({ title: "Atividade removida" });
  };

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (!showCompleted && a.completed_at) return false;
      if (staffFilter && a.assigned_to !== staffFilter) return false;
      return true;
    });
  }, [activities, staffFilter, showCompleted]);

  const grouped = useMemo(() => {
    const map = new Map<GroupKey, ScheduledActivity[]>();
    GROUP_ORDER.forEach(k => map.set(k, []));
    filtered.forEach(a => {
      const g = getGroup(a.scheduled_for, !!a.completed_at);
      map.get(g)!.push(a);
    });
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [filtered]);

  const pendingCount = activities.filter(a => !a.completed_at).length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
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
                !staffFilter ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
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
                  staffFilter === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                }`}
              >
                {s.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowCompleted(v => !v)}
          className={`ml-auto text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
            showCompleted ? "bg-muted text-foreground border-border" : "text-muted-foreground border-transparent hover:border-border"
          }`}
        >
          {showCompleted ? "Ocultar concluídas" : "Ver concluídas"}
        </button>

        <span className="text-xs text-muted-foreground">{pendingCount} pendentes</span>
      </div>

      {/* Groups */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma atividade agendada</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Abra um cliente e agende atividades na aba Atividade</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([group, items]) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-2">
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  group === "Atrasadas" ? "text-destructive" :
                  group === "Hoje" ? "text-primary" :
                  "text-muted-foreground"
                }`}>{group}</p>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{items.length}</Badge>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-1">
                {items.map(a => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    isOverdue={group === "Atrasadas"}
                    onComplete={() => handleComplete(a.id)}
                    onDelete={() => handleDelete(a.id)}
                    onClientClick={() => onCardClick(a.client_user_id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityCard({ activity, isOverdue, onComplete, onDelete, onClientClick }: {
  activity: ScheduledActivity;
  isOverdue: boolean;
  onComplete: () => void;
  onDelete: () => void;
  onClientClick: () => void;
}) {
  const typeInfo = ACTIVITY_TYPES.find(t => t.id === activity.type) || ACTIVITY_TYPES[4];
  const Icon = typeInfo.icon;
  const isCompleted = !!activity.completed_at;
  const dateLabel = new Date(activity.scheduled_for + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short",
  });

  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 group transition-colors ${
      isCompleted ? "bg-muted/20 opacity-60" :
      isOverdue ? "border-destructive/30 bg-destructive/5" :
      "bg-card hover:bg-muted/30"
    }`}>
      <Icon className={`h-4 w-4 shrink-0 ${isCompleted ? "text-muted-foreground" : typeInfo.color}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
            {activity.title}
          </span>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{typeInfo.label}</Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <button type="button" onClick={onClientClick} className="text-xs text-primary hover:underline font-medium truncate max-w-[130px]">
            {activity.clientName}
          </button>
          {activity.assigned_name && (
            <span className="text-[10px] text-muted-foreground truncate">· {activity.assigned_name.split(" ")[0]}</span>
          )}
        </div>
      </div>

      <span className={`text-xs shrink-0 font-medium ${isOverdue && !isCompleted ? "text-destructive" : "text-muted-foreground"}`}>
        {dateLabel}
      </span>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isCompleted && (
          <button type="button" onClick={onComplete} title="Marcar como concluída" className="text-muted-foreground hover:text-emerald-500 transition-colors">
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onDelete} title="Remover" className="text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
