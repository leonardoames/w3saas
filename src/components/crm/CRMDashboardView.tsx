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
  const months = days / 30.44;
  return `${months.toFixed(1)} meses`;
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
          <div className={`rounded-lg p-2 bg-muted/40`}>
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
}

export function CRMDashboardView({ clientIds }: CRMDashboardViewProps) {
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

      // --- Stage distribution ---
      const stageCountMap: Record<string, number> = {};
      CRM_STAGES.forEach(s => { stageCountMap[s.id] = 0; });

      // Clients without crm_clients row default to "onboarding"
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

      // Avg contract duration (days)
      const contractDurations: number[] = (crmRes.data || [])
        .filter((c: any) => c.data_inicio_contrato && c.data_fim_contrato)
        .map((c: any) => {
          const start = new Date(c.data_inicio_contrato).getTime();
          const end = new Date(c.data_fim_contrato).getTime();
          return Math.max(0, (end - start) / 86400000);
        });
      const avgContractDays = contractDurations.length > 0
        ? contractDurations.reduce((a, b) => a + b, 0) / contractDurations.length
        : null;

      // Avg contract value
      const contractValues: number[] = (crmRes.data || [])
        .filter((c: any) => c.valor_contrato !== null && c.valor_contrato !== undefined)
        .map((c: any) => Number(c.valor_contrato));
      const avgContractValue = contractValues.length > 0
        ? contractValues.reduce((a, b) => a + b, 0) / contractValues.length
        : null;

      // --- Staff data ---
      const staffIds = [...new Set((rolesRes.data || []).map((r: any) => r.user_id))];
      let staffProfiles: Record<string, string> = {};
      if (staffIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", staffIds);
        (profiles || []).forEach((p: any) => {
          staffProfiles[p.user_id] = p.full_name || p.email || p.user_id;
        });
      }

      const allTutors: StaffMember[] = (rolesRes.data || [])
        .filter((r: any) => r.role === "tutor")
        .map((r: any) => ({ id: r.user_id, name: staffProfiles[r.user_id] || r.user_id, role: "tutor" }));
      const allCS: StaffMember[] = (rolesRes.data || [])
        .filter((r: any) => r.role === "cs")
        .map((r: any) => ({ id: r.user_id, name: staffProfiles[r.user_id] || r.user_id, role: "cs" }));

      // --- CS distribution (clients per CS) ---
      const csClientCount: Record<string, number> = {};
      let noCSCount = 0;
      const csIdSet = new Set(allCS.map(c => c.id));

      (csAssignRes.data || []).forEach((a: any) => {
        if (csIdSet.has(a.staff_id)) {
          csClientCount[a.staff_id] = (csClientCount[a.staff_id] || 0) + 1;
        }
      });
      // Clients without any CS assignment
      const assignedClients = new Set((csAssignRes.data || [])
        .filter((a: any) => csIdSet.has(a.staff_id))
        .map((a: any) => a.mentorado_id));
      noCSCount = clientIds.filter(id => !assignedClients.has(id)).length;

      const csDistribution = [
        ...allCS
          .filter(cs => (csClientCount[cs.id] || 0) > 0)
          .map(cs => ({ name: cs.name, value: csClientCount[cs.id] || 0, id: cs.id }))
          .sort((a, b) => b.value - a.value),
        ...(noCSCount > 0 ? [{ name: "Sem CS", value: noCSCount, id: "none" }] : []),
      ];

      // --- Stage distribution for chart ---
      const activeStages = ["onboarding", "engajado", "risco", "alerta", "congelado"];
      const stageDistribution = activeStages.map(s => ({
        stage: s,
        label: CRM_STAGES.find(st => st.id === s)?.label || s,
        count: stageCountMap[s] || 0,
        color: STAGE_COLORS[s],
      })).filter(s => s.count > 0);

      // --- Org chart ---
      const orgAssignments = orgRes.data || [];
      const tutorToCS: Record<string, string[]> = {};
      const csWithTutor = new Set<string>();
      orgAssignments.forEach((a: any) => {
        if (!tutorToCS[a.tutor_id]) tutorToCS[a.tutor_id] = [];
        tutorToCS[a.tutor_id].push(a.cs_id);
        csWithTutor.add(a.cs_id);
      });

      // Client count per staff
      const staffClientCount: Record<string, number> = {};
      (csAssignRes.data || []).forEach((a: any) => {
        staffClientCount[a.staff_id] = (staffClientCount[a.staff_id] || 0) + 1;
      });

      const orgData: OrgTutor[] = allTutors
        .filter(t => tutorToCS[t.id]?.length > 0 || staffClientCount[t.id] > 0)
        .map(tutor => {
          const csForTutor = (tutorToCS[tutor.id] || [])
            .map(csId => allCS.find(c => c.id === csId))
            .filter(Boolean) as StaffMember[];
          return {
            tutor,
            csMembers: csForTutor.map(cs => ({ cs, clientCount: staffClientCount[cs.id] || 0 })),
            directClients: staffClientCount[tutor.id] || 0,
          };
        });

      const csWithoutTutor = allCS
        .filter(cs => !csWithTutor.has(cs.id))
        .map(cs => ({ cs, clientCount: staffClientCount[cs.id] || 0 }));

      const tutorsWithoutCS = allTutors.filter(t =>
        !tutorToCS[t.id]?.length && !staffClientCount[t.id]
      );

      setData({
        total, active, completed, cancelled, refunded, churnRate,
        avgContractDays, avgContractValue, csDistribution, stageDistribution,
        orgData, csWithoutTutor, tutorsWithoutCS, allTutors, allCS,
      });
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
    setOrgTutor("");
    setOrgCS("");
    loadDashboard();
  };

  const handleRemoveOrgAssignment = async (tutorId: string, csId: string) => {
    await (supabase as any).from("tutor_cs_assignments").delete().eq("tutor_id", tutorId).eq("cs_id", csId);
    loadDashboard();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || clientIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">Nenhum cliente para exibir</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Stage counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={data.total} icon={Users} />
        <StatCard label="Ativos" value={data.active}
          sub={`${data.total > 0 ? Math.round((data.active / data.total) * 100) : 0}% do total`}
          icon={TrendingDown} color="text-blue-600" />
        <StatCard label="Concluídos" value={data.completed} icon={CheckCircle2} color="text-emerald-600" />
        <StatCard label="Cancelados" value={data.cancelled} icon={XCircle} color="text-rose-600" />
        <StatCard label="Reembolsados" value={data.refunded} icon={RefreshCw} color="text-purple-600" />
      </div>

      {/* Row 2: Metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Taxa de Churn"
          value={`${data.churnRate.toFixed(1)}%`}
          sub="(cancelados + reembolsados) / total"
          icon={TrendingDown}
          color={data.churnRate > 15 ? "text-destructive" : data.churnRate > 8 ? "text-orange-500" : "text-green-600"}
        />
        <StatCard
          label="Tempo Médio de Contrato"
          value={formatDays(data.avgContractDays)}
          sub={data.avgContractDays ? `${contractFilled(data)} contratos com datas` : "Preencha as datas no drawer"}
          icon={Clock}
        />
        <StatCard
          label="Valor Médio Pago"
          value={formatCurrency(data.avgContractValue)}
          sub={data.avgContractValue ? `${valuesFilled(data)} contratos com valor` : "Preencha os valores no drawer"}
          icon={DollarSign}
        />
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Donut — CS distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Clientes por CS</CardTitle>
          </CardHeader>
          <CardContent>
            {data.csDistribution.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Nenhum CS com clientes atribuídos
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={data.csDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.csDistribution.map((entry, i) => (
                      <Cell key={entry.id} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    formatter={(value) => <span className="text-xs">{value}</span>}
                    iconSize={8}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar — active stage distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribuição por Etapa (Ativos)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.stageDistribution.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Nenhum cliente em etapa ativa
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={data.stageDistribution}
                  layout="vertical"
                  margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {data.stageDistribution.map((entry) => (
                      <Cell key={entry.stage} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outcome stages bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Resultados Finais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {[
              { id: "concluido", label: "Concluídos", count: data.completed, color: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
              { id: "cancelado", label: "Cancelados", count: data.cancelled, color: "bg-rose-700", text: "text-rose-700 dark:text-rose-400" },
              { id: "reembolsado", label: "Reembolsados", count: data.refunded, color: "bg-purple-500", text: "text-purple-700 dark:text-purple-400" },
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
              {/* Tutors with CS */}
              {data.orgData.map(({ tutor, csMembers, directClients }) => {
                const totalUnderTutor = csMembers.reduce((s, c) => s + c.clientCount, 0) + directClients;
                return (
                  <div key={tutor.id} className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {tutor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{tutor.name}</p>
                        <p className="text-xs text-muted-foreground">Tutor · {totalUnderTutor} clientes</p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {csMembers.length} CS
                      </Badge>
                    </div>

                    {csMembers.length > 0 && (
                      <div className="ml-4 pl-4 border-l-2 border-border space-y-2">
                        {csMembers.map(({ cs, clientCount }) => (
                          <div key={cs.id} className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                            <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300">
                                {cs.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm truncate flex-1">{cs.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{clientCount} clientes</span>
                            {canManageOrg && (
                              <Button
                                variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => handleRemoveOrgAssignment(tutor.id, cs.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {directClients > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 ml-4">
                        + {directClients} clientes atribuídos diretamente
                      </p>
                    )}
                  </div>
                );
              })}

              {/* CS without tutor */}
              {data.csWithoutTutor.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">CS sem tutor</p>
                  <div className="flex flex-wrap gap-2">
                    {data.csWithoutTutor.map(({ cs, clientCount }) => (
                      <div key={cs.id} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                        <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300">
                            {cs.name.charAt(0).toUpperCase()}
                          </span>
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
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Selecionar tutor" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.allTutors.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">CS</p>
                  <Select value={orgCS} onValueChange={setOrgCS}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Selecionar CS" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.allCS.map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                size="sm" onClick={handleAddOrgAssignment}
                disabled={!orgTutor || !orgCS || savingOrg}
              >
                {savingOrg && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar
              </Button>

              {/* Current assignments */}
              {data.orgData.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground">Vínculos atuais</p>
                  {data.orgData.flatMap(({ tutor, csMembers }) =>
                    csMembers.map(({ cs }) => (
                      <div key={`${tutor.id}-${cs.id}`} className="flex items-center justify-between text-xs py-1">
                        <span>{tutor.name} → {cs.name}</span>
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6 text-destructive"
                          onClick={() => handleRemoveOrgAssignment(tutor.id, cs.id)}
                        >
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

// Helper functions for sub-labels
function contractFilled(data: DashData) {
  return "alguns";
}
function valuesFilled(data: DashData) {
  return "alguns";
}
