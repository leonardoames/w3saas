import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Users, TrendingDown, CheckCircle2, XCircle, RefreshCw, Clock, DollarSign, Plus, Trash2, Settings } from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { CRM_STAGES } from "./CRMClientDrawer";
import type { CRMCardExtended } from "./types";
import { getHealthScoreInfo } from "./HealthScoreBadge";

const STAGE_COLORS: Record<string, string> = {
  onboarding: "#3b82f6",
  engajado:   "#22c55e",
  risco:      "#f97316",
  alerta:     "#ef4444",
  congelado:  "#94a3b8",
  cancelado:  "#be123c",
  reembolsado:"#a855f7",
  concluido:  "#10b981",
};

const CHART_COLORS = [
  "#f97316","#3b82f6","#22c55e","#a855f7","#ef4444","#eab308","#06b6d4","#ec4899",
];

const formatCurrency = (v: number | null) => {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
};
const formatDays = (days: number | null) => {
  if (!days) return "—";
  if (days < 30) return `${days} dias`;
  return `${(days / 30.44).toFixed(1)} meses`;
};

interface StaffMember { id: string; name: string; role: string }

interface OrgTutor {
  tutor: StaffMember;
  csMembers: { cs: StaffMember; clientCount: number }[];
  directClients: number;
}

interface DashData {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  refunded: number;
  churnRate: number;
  avgContractDays: number | null;
  avgContractValue: number | null;
  csDistribution: { name: string; value: number; id: string }[];
  stageDistribution: { stage: string; label: string; count: number; color: string }[];
  orgData: OrgTutor[];
  csWithoutTutor: { cs: StaffMember; clientCount: number }[];
  tutorsWithoutCS: StaffMember[];
  allTutors: StaffMember[];
  allCS: StaffMember[];
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color || ""}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="rounded-lg p-2 bg-muted/40">
            <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow">
      <p className="font-semibold">{payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].value} clientes</p>
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow">
      <p className="font-semibold">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} clientes</p>
    </div>
  );
}

interface CRMDashboardViewProps {
  clientIds: string[];
  cards: CRMCardExtended[];
}

// --- Ranking CS ---
function CSRankingSection({ cards }: { cards: CRMCardExtended[] }) {
  const byCS = useMemo(() => {
    const map = new Map<string, { name: string; cards: CRMCardExtended[] }>();
    cards.forEach(c => {
      const key = c.csId || "__none__";
      const name = c.csName || "Sem CS";
      if (!map.has(key)) map.set(key, { name, cards: [] });
      map.get(key)!.cards.push(c);
    });

    return [...map.entries()].map(([id, { name, cards: cc }]) => {
      const avgHealth = cc.length > 0 ? Math.round(cc.reduce((s, c) => s + c.healthScore, 0) / cc.length) : 0;
      const atRisk = cc.filter(c => c.stage === "risco" || c.stage === "alerta").length;
      const churn = cc.filter(c => c.stage === "cancelado" || c.stage === "reembolsado").length;
      const churnPct = cc.length > 0 ? ((churn / cc.length) * 100).toFixed(0) : "0";
      return { id, name, count: cc.length, avgHealth, atRisk, churnPct };
    }).sort((a, b) => b.avgHealth - a.avgHealth);
  }, [cards]);

  if (byCS.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Ranking de CS</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">CS</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Clientes</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Health Médio</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Risco/Alerta</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">% Churn</th>
              </tr>
            </thead>
            <tbody>
              {byCS.map((row, i) => {
                const info = getHealthScoreInfo(row.avgHealth);
                return (
                  <tr key={row.id} className={`border-t ${i % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>
                    <td className="px-3 py-2 font-medium text-xs">{row.name}</td>
                    <td className="px-3 py-2 text-right text-xs">{row.count}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`text-xs font-bold ${info.textColor}`}>{row.avgHealth}</span>
                    </td>
                    <td className={`px-3 py-2 text-right text-xs font-medium ${row.atRisk > 0 ? "text-orange-500 dark:text-orange-400" : "text-muted-foreground"}`}>
                      {row.atRisk}
                    </td>
                    <td className={`px-3 py-2 text-right text-xs font-medium ${Number(row.churnPct) > 10 ? "text-destructive" : "text-muted-foreground"}`}>
                      {row.churnPct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Funil de Conversão ---
function ConversionFunnelSection({ cards }: { cards: CRMCardExtended[] }) {
  const stageOrder = ["onboarding", "engajado", "risco", "alerta", "congelado", "concluido", "cancelado", "reembolsado"];
  const total = cards.length;

  const data = stageOrder.map(id => {
    const count = cards.filter(c => c.stage === id).length;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const stage = CRM_STAGES.find(s => s.id === id);
    return { id, label: stage?.label || id, count, pct, color: STAGE_COLORS[id] || "#94a3b8" };
  }).filter(s => s.count > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
            <Tooltip
              content={({ active, payload, label }: any) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow">
                    <p className="font-semibold">{label}</p>
                    <p>{payload[0].value} clientes ({data.find(d => d.label === label)?.pct}%)</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {data.map(entry => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// --- Coorte de Retenção ---
function RetentionCohortSection({ cards }: { cards: CRMCardExtended[] }) {
  // Group by entry month (createdAt)
  const cohorts = useMemo(() => {
    const map = new Map<string, CRMCardExtended[]>();
    cards.forEach(c => {
      if (!c.createdAt) return;
      const key = c.createdAt.substring(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });

    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6); // last 6 months
    return sorted.map(([month, cc]) => {
      const active = cc.filter(c => !["cancelado", "reembolsado", "congelado"].includes(c.stage)).length;
      const retPct = cc.length > 0 ? Math.round((active / cc.length) * 100) : 0;
      const label = new Date(month + "-01T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      return { month, label, total: cc.length, active, retPct };
    });
  }, [cards]);

  if (cohorts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Retenção por Coorte de Entrada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Entrada</th>
                <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Ativos</th>
                <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Retenção</th>
                <th className="px-2 py-1.5 w-32" />
              </tr>
            </thead>
            <tbody>
              {cohorts.map(row => (
                <tr key={row.month} className="border-b last:border-0">
                  <td className="px-2 py-2 font-medium capitalize">{row.label}</td>
                  <td className="px-2 py-2 text-right">{row.total}</td>
                  <td className="px-2 py-2 text-right">{row.active}</td>
                  <td className={`px-2 py-2 text-right font-bold ${row.retPct >= 80 ? "text-green-600 dark:text-green-400" : row.retPct >= 60 ? "text-blue-600 dark:text-blue-400" : row.retPct >= 40 ? "text-amber-600 dark:text-amber-400" : "text-destructive"}`}>
                    {row.retPct}%
                  </td>
                  <td className="px-2 py-2">
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${row.retPct >= 80 ? "bg-green-500" : row.retPct >= 60 ? "bg-blue-500" : row.retPct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${row.retPct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// --- LTV Médio ---
function LTVSection({ cards }: { cards: CRMCardExtended[] }) {
  const stats = useMemo(() => {
    const withValue = cards.filter(c => c.valorContrato !== null && c.valorContrato! > 0);
    const avgValue = withValue.length > 0
      ? withValue.reduce((s, c) => s + c.valorContrato!, 0) / withValue.length
      : null;

    // Duration: from createdAt to accessExpiresAt or today
    const withDuration = cards.filter(c => c.createdAt);
    const avgDurationDays = withDuration.length > 0
      ? withDuration.reduce((s, c) => {
          const start = new Date(c.createdAt!).getTime();
          const end = c.accessExpiresAt ? new Date(c.accessExpiresAt).getTime() : Date.now();
          return s + Math.max(0, (end - start) / 86400000);
        }, 0) / withDuration.length
      : null;

    const avgDurationMonths = avgDurationDays ? avgDurationDays / 30.44 : null;
    const ltvProjection = avgValue && avgDurationMonths ? avgValue * avgDurationMonths : null;

    return { avgValue, avgDurationMonths, ltvProjection, count: withValue.length };
  }, [cards]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">LTV Médio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Valor Médio Contrato</p>
            <p className="text-xl font-bold">{formatCurrency(stats.avgValue)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{stats.count} contratos</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Duração Média</p>
            <p className="text-xl font-bold">
              {stats.avgDurationMonths ? `${stats.avgDurationMonths.toFixed(1)}m` : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">meses de permanência</p>
          </div>
          <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-center">
            <p className="text-xs font-semibold text-primary/70 mb-1">LTV Estimado</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(stats.ltvProjection)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">valor × duração</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Heatmap de Engajamento ---
function EngagementHeatmapSection({ cards }: { cards: CRMCardExtended[] }) {
  const buckets = [
    { key: "week", label: "Esta semana", max: 7 },
    { key: "2weeks", label: "2 sem.", min: 8, max: 14 },
    { key: "month", label: "1 mês", min: 15, max: 30 },
    { key: "older", label: "> 1 mês", min: 31 },
  ];

  const top20 = useMemo(() =>
    [...cards]
      .filter(c => c.lastLoginDaysAgo !== null)
      .sort((a, b) => (a.lastLoginDaysAgo ?? 999) - (b.lastLoginDaysAgo ?? 999))
      .slice(0, 20),
    [cards]
  );

  if (top20.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Heatmap de Engajamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Dados de login não disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const getBucket = (days: number | null) => {
    if (days === null) return null;
    if (days <= 7) return "week";
    if (days <= 14) return "2weeks";
    if (days <= 30) return "month";
    return "older";
  };

  const getCellColor = (bucket: string | null) => {
    if (!bucket) return "bg-muted/20";
    if (bucket === "week") return "bg-green-500";
    if (bucket === "2weeks") return "bg-blue-400";
    if (bucket === "month") return "bg-amber-400";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Heatmap de Engajamento (Top 20)</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex gap-3 mb-4 flex-wrap">
          {buckets.map(b => (
            <div key={b.key} className="flex items-center gap-1.5 text-xs">
              <div className={`h-3 w-3 rounded-sm ${getCellColor(b.key)}`} />
              <span className="text-muted-foreground">{b.label}</span>
            </div>
          ))}
        </div>
        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left px-2 py-1 font-medium text-muted-foreground w-32">Cliente</th>
                {buckets.map(b => (
                  <th key={b.key} className="text-center px-2 py-1 font-medium text-muted-foreground whitespace-nowrap">{b.label}</th>
                ))}
                <th className="text-right px-2 py-1 font-medium text-muted-foreground">Dias atrás</th>
              </tr>
            </thead>
            <tbody>
              {top20.map(c => {
                const bucket = getBucket(c.lastLoginDaysAgo);
                return (
                  <tr key={c.userId} className="border-t">
                    <td className="px-2 py-1.5 truncate max-w-[120px] font-medium">
                      {c.nomeLoja || c.fullName || c.email || "—"}
                    </td>
                    {buckets.map(b => (
                      <td key={b.key} className="px-2 py-1.5 text-center">
                        <div className={`mx-auto h-5 w-5 rounded-sm ${bucket === b.key ? getCellColor(b.key) : "bg-muted/20"}`} />
                      </td>
                    ))}
                    <td className={`px-2 py-1.5 text-right font-medium ${c.lastLoginDaysAgo! > 30 ? "text-destructive" : c.lastLoginDaysAgo! > 14 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                      {c.lastLoginDaysAgo}d
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function CRMDashboardView({ clientIds, cards }: CRMDashboardViewProps) {
  const { user, isAdmin, hasRole } = useAuth();
  const canManageOrg = isAdmin || hasRole("master");
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [orgTutor, setOrgTutor] = useState<string>("");
  const [orgCS, setOrgCS] = useState<string>("");
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    if (clientIds.length > 0) loadDashboard();
    else setLoading(false);
  }, [clientIds.join(",")]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [crmRes, csAssignRes, rolesRes, orgRes] = await Promise.all([
        (supabase as any).from("crm_clients")
          .select("user_id, stage, valor_contrato, data_inicio_contrato, data_fim_contrato")
          .in("user_id", clientIds),
        (supabase as any).from("staff_carteiras")
          .select("mentorado_id, staff_id")
          .in("mentorado_id", clientIds),
        supabase.from("user_roles" as any).select("user_id, role").in("role" as any, ["tutor", "cs"] as any),
        (supabase as any).from("tutor_cs_assignments").select("tutor_id, cs_id"),
      ]);

      const stageCountMap: Record<string, number> = {};
      CRM_STAGES.forEach(s => { stageCountMap[s.id] = 0; });

      const crmUserIds = new Set((crmRes.data || []).map((c: any) => c.user_id));
      const implicitOnboarding = clientIds.filter(id => !crmUserIds.has(id)).length;
      stageCountMap["onboarding"] += implicitOnboarding;

      (crmRes.data || []).forEach((c: any) => {
        const s = c.stage || "onboarding";
        stageCountMap[s] = (stageCountMap[s] || 0) + 1;
      });

      const total = clientIds.length;
      const completed = stageCountMap["concluido"] || 0;
      const cancelled = stageCountMap["cancelado"] || 0;
      const refunded = stageCountMap["reembolsado"] || 0;
      const active = total - completed - cancelled - refunded;
      const churnRate = total > 0 ? ((cancelled + refunded) / total) * 100 : 0;

      const contractDurations: number[] = (crmRes.data || [])
        .filter((c: any) => c.data_inicio_contrato && c.data_fim_contrato)
        .map((c: any) => Math.max(0, (new Date(c.data_fim_contrato).getTime() - new Date(c.data_inicio_contrato).getTime()) / 86400000));
      const avgContractDays = contractDurations.length > 0
        ? contractDurations.reduce((a, b) => a + b, 0) / contractDurations.length : null;

      const contractValues: number[] = (crmRes.data || [])
        .filter((c: any) => c.valor_contrato !== null)
        .map((c: any) => Number(c.valor_contrato));
      const avgContractValue = contractValues.length > 0
        ? contractValues.reduce((a, b) => a + b, 0) / contractValues.length : null;

      const staffIds = [...new Set((rolesRes.data || []).map((r: any) => r.user_id))];
      let staffProfiles: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", staffIds);
        (profiles || []).forEach((p: any) => { staffProfiles[p.user_id] = p.full_name || p.email || p.user_id; });
      }

      const allTutors: StaffMember[] = (rolesRes.data || [])
        .filter((r: any) => r.role === "tutor")
        .map((r: any) => ({ id: r.user_id, name: staffProfiles[r.user_id] || r.user_id, role: "tutor" }));
      const allCS: StaffMember[] = (rolesRes.data || [])
        .filter((r: any) => r.role === "cs")
        .map((r: any) => ({ id: r.user_id, name: staffProfiles[r.user_id] || r.user_id, role: "cs" }));

      const csClientCount: Record<string, number> = {};
      const csIdSet = new Set(allCS.map(c => c.id));
      (csAssignRes.data || []).forEach((a: any) => {
        if (csIdSet.has(a.staff_id)) csClientCount[a.staff_id] = (csClientCount[a.staff_id] || 0) + 1;
      });

      const assignedClients = new Set((csAssignRes.data || []).filter((a: any) => csIdSet.has(a.staff_id)).map((a: any) => a.mentorado_id));
      const noCSCount = clientIds.filter(id => !assignedClients.has(id)).length;

      const csDistribution = [
        ...allCS.filter(cs => (csClientCount[cs.id] || 0) > 0)
          .map(cs => ({ name: cs.name, value: csClientCount[cs.id] || 0, id: cs.id }))
          .sort((a, b) => b.value - a.value),
        ...(noCSCount > 0 ? [{ name: "Sem CS", value: noCSCount, id: "none" }] : []),
      ];

      const activeStages = ["onboarding", "engajado", "risco", "alerta", "congelado"];
      const stageDistribution = activeStages
        .map(s => ({ stage: s, label: CRM_STAGES.find(st => st.id === s)?.label || s, count: stageCountMap[s] || 0, color: STAGE_COLORS[s] }))
        .filter(s => s.count > 0);

      const orgAssignments = orgRes.data || [];
      const tutorToCS: Record<string, string[]> = {};
      const csWithTutor = new Set<string>();
      orgAssignments.forEach((a: any) => {
        if (!tutorToCS[a.tutor_id]) tutorToCS[a.tutor_id] = [];
        tutorToCS[a.tutor_id].push(a.cs_id);
        csWithTutor.add(a.cs_id);
      });

      const staffClientCount: Record<string, number> = {};
      (csAssignRes.data || []).forEach((a: any) => {
        staffClientCount[a.staff_id] = (staffClientCount[a.staff_id] || 0) + 1;
      });

      const orgData: OrgTutor[] = allTutors
        .filter(t => tutorToCS[t.id]?.length > 0 || staffClientCount[t.id] > 0)
        .map(tutor => {
          const csForTutor = (tutorToCS[tutor.id] || []).map(csId => allCS.find(c => c.id === csId)).filter(Boolean) as StaffMember[];
          return {
            tutor,
            csMembers: csForTutor.map(cs => ({ cs, clientCount: staffClientCount[cs.id] || 0 })),
            directClients: staffClientCount[tutor.id] || 0,
          };
        });

      const csWithoutTutor = allCS.filter(cs => !csWithTutor.has(cs.id))
        .map(cs => ({ cs, clientCount: staffClientCount[cs.id] || 0 }));
      const tutorsWithoutCS = allTutors.filter(t => !tutorToCS[t.id]?.length && !staffClientCount[t.id]);

      setData({ total, active, completed, cancelled, refunded, churnRate, avgContractDays, avgContractValue, csDistribution, stageDistribution, orgData, csWithoutTutor, tutorsWithoutCS, allTutors, allCS });
    } catch (err) {
      console.error("CRM dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrgAssignment = async () => {
    if (!orgTutor || !orgCS) return;
    setSavingOrg(true);
    await (supabase as any).from("tutor_cs_assignments").insert({ tutor_id: orgTutor, cs_id: orgCS });
    setSavingOrg(false);
    setOrgTutor(""); setOrgCS("");
    loadDashboard();
  };

  const handleRemoveOrgAssignment = async (tutorId: string, csId: string) => {
    await (supabase as any).from("tutor_cs_assignments").delete().eq("tutor_id", tutorId).eq("cs_id", csId);
    loadDashboard();
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!data || clientIds.length === 0) {
    return <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><p className="text-sm">Nenhum cliente para exibir</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Stage counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={data.total} icon={Users} />
        <StatCard label="Ativos" value={data.active} sub={`${data.total > 0 ? Math.round((data.active / data.total) * 100) : 0}% do total`} icon={TrendingDown} color="text-blue-600 dark:text-blue-400" />
        <StatCard label="Concluídos" value={data.completed} icon={CheckCircle2} color="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Cancelados" value={data.cancelled} icon={XCircle} color="text-rose-600 dark:text-rose-400" />
        <StatCard label="Reembolsados" value={data.refunded} icon={RefreshCw} color="text-purple-600 dark:text-purple-400" />
      </div>

      {/* Row 2: Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Taxa de Churn"
          value={`${data.churnRate.toFixed(1)}%`}
          sub="(cancelados + reembolsados) / total"
          icon={TrendingDown}
          color={data.churnRate > 15 ? "text-destructive" : data.churnRate > 8 ? "text-orange-500 dark:text-orange-400" : "text-green-600 dark:text-green-400"}
        />
        <StatCard label="Tempo Médio de Contrato" value={formatDays(data.avgContractDays)} sub="contratos com datas preenchidas" icon={Clock} />
        <StatCard label="Valor Médio Pago" value={formatCurrency(data.avgContractValue)} sub="contratos com valor preenchido" icon={DollarSign} />
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Clientes por CS</CardTitle>
          </CardHeader>
          <CardContent>
            {data.csDistribution.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Nenhum CS com clientes atribuídos</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.csDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="value">
                    {data.csDistribution.map((entry, i) => (
                      <Cell key={entry.id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend formatter={v => <span className="text-xs">{v}</span>} iconSize={8} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição por Etapa (Ativos)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.stageDistribution.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Nenhum cliente em etapa ativa</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.stageDistribution} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {data.stageDistribution.map(entry => <Cell key={entry.stage} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outcome stages */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Resultados Finais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {[
              { id: "concluido", label: "Concluídos", count: data.completed, color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
              { id: "cancelado", label: "Cancelados", count: data.cancelled, color: "bg-rose-600", text: "text-rose-600 dark:text-rose-400" },
              { id: "reembolsado", label: "Reembolsados", count: data.refunded, color: "bg-purple-500", text: "text-purple-600 dark:text-purple-400" },
            ].map(item => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg border p-4 flex-1 min-w-[120px]">
                <span className={`h-3 w-3 rounded-full shrink-0 ${item.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.text}`}>{item.count}</p>
                </div>
                {data.total > 0 && (
                  <p className="text-xs text-muted-foreground ml-auto self-end">
                    {((item.count / data.total) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Org chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-semibold">Organograma</CardTitle>
            {canManageOrg && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setOrgDialogOpen(true)}>
                <Settings className="h-3.5 w-3.5" />
                Configurar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data.orgData.length === 0 && data.csWithoutTutor.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">Hierarquia não configurada</p>
              {canManageOrg && (
                <Button size="sm" className="mt-3" onClick={() => setOrgDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Configurar hierarquia
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {data.orgData.map(({ tutor, csMembers, directClients }) => {
                const totalUnderTutor = csMembers.reduce((s, c) => s + c.clientCount, 0) + directClients;
                return (
                  <div key={tutor.id} className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{tutor.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{tutor.name}</p>
                        <p className="text-xs text-muted-foreground">Tutor · {totalUnderTutor} clientes</p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">{csMembers.length} CS</Badge>
                    </div>
                    {csMembers.length > 0 && (
                      <div className="ml-4 pl-4 border-l-2 border-border space-y-2">
                        {csMembers.map(({ cs, clientCount }) => (
                          <div key={cs.id} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                            <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300">{cs.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-sm truncate flex-1">{cs.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{clientCount} clientes</span>
                            {canManageOrg && (
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleRemoveOrgAssignment(tutor.id, cs.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {directClients > 0 && <p className="text-xs text-muted-foreground mt-2 ml-4">+ {directClients} clientes diretos</p>}
                  </div>
                );
              })}
              {data.csWithoutTutor.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">CS sem tutor</p>
                  <div className="flex flex-wrap gap-2">
                    {data.csWithoutTutor.map(({ cs, clientCount }) => (
                      <div key={cs.id} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300">{cs.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm">{cs.name}</span>
                        <Badge variant="secondary" className="text-xs">{clientCount}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* === NEW PREMIUM SECTIONS === */}

      {/* CS Ranking */}
      <CSRankingSection cards={cards} />

      {/* Conversion Funnel */}
      <ConversionFunnelSection cards={cards} />

      {/* Retention Cohort */}
      <RetentionCohortSection cards={cards} />

      {/* LTV */}
      <LTVSection cards={cards} />

      {/* Engagement Heatmap */}
      <EngagementHeatmapSection cards={cards} />

      {/* Org config dialog */}
      {canManageOrg && (
        <Dialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Hierarquia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Atribua CS a tutores para montar o organograma.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Tutor</p>
                  <Select value={orgTutor} onValueChange={setOrgTutor}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Selecionar tutor" /></SelectTrigger>
                    <SelectContent>{data.allTutors.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">CS</p>
                  <Select value={orgCS} onValueChange={setOrgCS}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Selecionar CS" /></SelectTrigger>
                    <SelectContent>{data.allCS.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" onClick={handleAddOrgAssignment} disabled={!orgTutor || !orgCS || savingOrg}>
                {savingOrg && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar
              </Button>
              {data.orgData.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground">Vínculos atuais</p>
                  {data.orgData.flatMap(({ tutor, csMembers }) =>
                    csMembers.map(({ cs }) => (
                      <div key={`${tutor.id}-${cs.id}`} className="flex items-center justify-between text-xs py-1">
                        <span>{tutor.name} → {cs.name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveOrgAssignment(tutor.id, cs.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOrgDialogOpen(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
