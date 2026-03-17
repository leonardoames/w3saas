import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ClientRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  // Tasks
  total_tasks: number;
  completed_tasks: number;
  // Billing
  faturamento_inicial: number | null;
  faturamento_atual: number | null;
  // Audit
  has_checkpoint_this_month: boolean;
  // CS info
  cs_name: string | null;
  cs_id: string | null;
}

interface InternoTabProps {
  onSelectClient: (userId: string, name: string) => void;
}

function GrowthBadge({ inicial, atual }: { inicial: number | null; atual: number | null }) {
  if (!inicial || !atual) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = ((atual - inicial) / inicial) * 100;
  if (pct > 5) return (
    <Badge className="bg-green-100 text-green-700 border-green-200 gap-1 text-xs font-medium">
      <TrendingUp className="h-3 w-3" />+{pct.toFixed(1)}%
    </Badge>
  );
  if (pct < -5) return (
    <Badge className="bg-red-100 text-red-700 border-red-200 gap-1 text-xs font-medium">
      <TrendingDown className="h-3 w-3" />{pct.toFixed(1)}%
    </Badge>
  );
  return (
    <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" />{pct.toFixed(1)}%
    </Badge>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {completed}/{total}
      </span>
    </div>
  );
}

const formatCurrency = (v: number | null) => {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
};

export function InternoTab({ onSelectClient }: InternoTabProps) {
  const { user, isAdmin, hasRole } = useAuth();
  const isAdminOrMaster = isAdmin || hasRole("master");
  const isTutor = hasRole("tutor");
  const showCS = isAdminOrMaster || isTutor;

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get client IDs for the current staff member
      const { data: idRows, error: idErr } = await supabase.rpc("get_dash_admin_mentorado_ids" as any);
      if (idErr) throw idErr;

      const clientIds: string[] = (idRows || []).map((r: any) => r.mentorado_id).filter(Boolean);
      if (clientIds.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      // 2. Parallel fetch all needed data
      const [profilesRes, tasksRes, billingRes, auditsRes, csRes] = await Promise.all([
        // Profiles
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", clientIds),
        // Tasks: fetch all and aggregate
        supabase.from("tarefas").select("user_id, status").in("user_id", clientIds),
        // Billing
        (supabase as any).from("client_billing").select("user_id, faturamento_inicial, faturamento_atual").in("user_id", clientIds),
        // Current month audit check
        (supabase as any).from("result_audits")
          .select("user_id, mes_referencia")
          .in("user_id", clientIds)
          .gte("mes_referencia", currentMonth + "-01")
          .lte("mes_referencia", currentMonth + "-31"),
        // CS assignments (who is the CS of each client)
        (supabase as any).from("staff_carteiras").select("mentorado_id, staff_id").in("mentorado_id", clientIds),
      ]);

      // 3. Build lookup maps
      const profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      (profilesRes.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      // Task counts per user
      const taskMap: Record<string, { total: number; completed: number }> = {};
      (tasksRes.data || []).forEach((t: any) => {
        if (!taskMap[t.user_id]) taskMap[t.user_id] = { total: 0, completed: 0 };
        if (t.status !== "cancelada") taskMap[t.user_id].total++;
        if (t.status === "concluida") taskMap[t.user_id].completed++;
      });

      const billingMap: Record<string, { faturamento_inicial: number | null; faturamento_atual: number | null }> = {};
      (billingRes.data || []).forEach((b: any) => { billingMap[b.user_id] = b; });

      const checkpointSet = new Set<string>(
        (auditsRes.data || []).map((a: any) => a.user_id)
      );

      // CS name lookup: mentorado_id → cs profile
      const csAssignments: Record<string, string> = {};
      const csIds: string[] = [];
      (csRes.data || []).forEach((a: any) => {
        csAssignments[a.mentorado_id] = a.staff_id;
        if (a.staff_id && !csIds.includes(a.staff_id)) csIds.push(a.staff_id);
      });

      let csProfileMap: Record<string, string> = {};
      if (csIds.length > 0) {
        const { data: csProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", csIds);
        (csProfiles || []).forEach((p: any) => {
          csProfileMap[p.user_id] = p.full_name || p.email || "—";
        });
      }

      // 4. Assemble rows
      const rows: ClientRow[] = clientIds.map(id => {
        const profile = profileMap[id] || { full_name: null, email: null };
        const tasks = taskMap[id] || { total: 0, completed: 0 };
        const billing = billingMap[id] || { faturamento_inicial: null, faturamento_atual: null };
        const csId = csAssignments[id] || null;
        return {
          user_id: id,
          full_name: profile.full_name,
          email: profile.email,
          total_tasks: tasks.total,
          completed_tasks: tasks.completed,
          faturamento_inicial: billing.faturamento_inicial,
          faturamento_atual: billing.faturamento_atual,
          has_checkpoint_this_month: checkpointSet.has(id),
          cs_id: csId,
          cs_name: csId ? (csProfileMap[csId] || null) : null,
        };
      });

      // Sort: no checkpoint first, then by progress asc
      rows.sort((a, b) => {
        if (a.has_checkpoint_this_month !== b.has_checkpoint_this_month)
          return a.has_checkpoint_this_month ? 1 : -1;
        const pctA = a.total_tasks > 0 ? a.completed_tasks / a.total_tasks : 0;
        const pctB = b.total_tasks > 0 ? b.completed_tasks / b.total_tasks : 0;
        return pctA - pctB;
      });

      setClients(rows);
    } catch (err) {
      console.error("InternoTab error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.cs_name?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const currentMonthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum cliente na sua carteira
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Clientes</p>
            <p className="text-2xl font-bold">{clients.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Checkpoint {currentMonthLabel}</p>
            <p className="text-2xl font-bold text-green-600">
              {clients.filter(c => c.has_checkpoint_this_month).length}
              <span className="text-sm text-muted-foreground font-normal">/{clients.length}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Planos com progresso</p>
            <p className="text-2xl font-bold">
              {clients.filter(c => c.total_tasks > 0 && c.completed_tasks > 0).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Fat. crescendo</p>
            <p className="text-2xl font-bold text-green-600">
              {clients.filter(c => c.faturamento_inicial && c.faturamento_atual && c.faturamento_atual > c.faturamento_inicial * 1.05).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente, CS..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Cliente</th>
              {showCS && <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">CS</th>}
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Plano de Ação</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Fat. Inicial</th>
              <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Fat. Atual</th>
              <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Crescimento</th>
              <th className="text-center px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">
                Checkpoint {new Date().toLocaleDateString("pt-BR", { month: "short" })}
              </th>
              <th className="px-4 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const progress = c.total_tasks > 0 ? (c.completed_tasks / c.total_tasks) * 100 : 0;
              return (
                <tr
                  key={c.user_id}
                  className={`border-b last:border-0 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium leading-tight">{c.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </td>
                  {showCS && (
                    <td className="px-4 py-3">
                      {c.cs_name ? (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{c.cs_name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">Sem CS</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {c.total_tasks > 0 ? (
                      <ProgressBar completed={c.completed_tasks} total={c.total_tasks} />
                    ) : (
                      <span className="text-xs text-muted-foreground/50">Sem ações</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    {formatCurrency(c.faturamento_inicial)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium">
                    {formatCurrency(c.faturamento_atual)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <GrowthBadge inicial={c.faturamento_inicial} atual={c.faturamento_atual} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.has_checkpoint_this_month ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onSelectClient(c.user_id, c.full_name || c.email || c.user_id)}
                      title="Ver plano"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
