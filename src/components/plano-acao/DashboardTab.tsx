import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Pencil, Check, X, CalendarDays, Star, StickyNote, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Task } from "@/hooks/useTasks";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface DashboardTabProps {
  tasks: Task[];
  userId: string;
  canEdit?: boolean;
}

const fmt = (v: number | null | undefined) => {
  if (v === null || v === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
};

export function DashboardTab({ tasks, userId, canEdit = false }: DashboardTabProps) {
  const { user } = useAuth();

  // Staff private notes
  const [note, setNote] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const fetchNote = useCallback(async () => {
    if (!canEdit || !user?.id || !userId) return;
    const { data } = await (supabase as any)
      .from("staff_client_notes")
      .select("content")
      .eq("staff_id", user.id)
      .eq("client_id", userId)
      .maybeSingle();
    setNote(data?.content || "");
  }, [canEdit, user?.id, userId]);

  useEffect(() => { fetchNote(); }, [fetchNote]);

  const handleSaveNote = async () => {
    if (!user?.id || !userId) return;
    setSavingNote(true);
    await (supabase as any)
      .from("staff_client_notes")
      .upsert({ staff_id: user.id, client_id: userId, content: noteDraft, updated_at: new Date().toISOString() },
        { onConflict: "staff_id,client_id" });
    setSavingNote(false);
    setNote(noteDraft);
    setEditingNote(false);
  };

  const [faturamentoInicial, setFaturamentoInicial] = useState<number | null>(null);
  const [faturamentoIdeal, setFaturamentoIdeal] = useState<number | null>(null);
  const [faturamentoAtual, setFaturamentoAtual] = useState<number | null>(null);
  const [chartData, setChartData] = useState<{ label: string; faturamento: number }[]>([]);
  const [dataInicio, setDataInicio] = useState<string | null>(null);
  const [editingInicio, setEditingInicio] = useState(false);
  const [draftInicio, setDraftInicio] = useState("");
  const [savingInicio, setSavingInicio] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const toLabel = (dateStr: string) =>
      new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      });

    Promise.all([
      (supabase as any)
        .from("diagnostico_360")
        .select("faturamento_inicial, faturamento_ideal")
        .eq("user_id", userId)
        .maybeSingle(),
      (supabase as any)
        .from("profiles")
        .select("data_inicio_mentoria")
        .eq("user_id", userId)
        .maybeSingle(),
      (supabase as any)
        .from("result_audits")
        .select("mes_referencia, faturamento")
        .eq("user_id", userId)
        .order("mes_referencia", { ascending: true }),
    ]).then(([diagRes, profileRes, auditsRes]) => {
      const fatInicial: number | null = diagRes.data?.faturamento_inicial ?? null;
      const fatIdeal: number | null = diagRes.data?.faturamento_ideal ?? null;
      const inicio: string | null = profileRes.data?.data_inicio_mentoria ?? null;
      const auditRows = (auditsRes.data || []).filter((r: any) => r.faturamento !== null);

      setFaturamentoInicial(fatInicial);
      setFaturamentoIdeal(fatIdeal);
      setDataInicio(inicio);

      if (auditRows.length > 0) {
        setFaturamentoAtual(auditRows[auditRows.length - 1].faturamento);
      }

      // Build chart: start point + audit points
      const auditPoints = auditRows.map((r: any) => ({
        label: toLabel(r.mes_referencia),
        faturamento: r.faturamento as number,
        monthKey: r.mes_referencia?.slice(0, 7) ?? "",
      }));

      // Prepend initial point if we have start date + initial billing
      // and it doesn't duplicate the first audit month
      const startMonthKey = inicio?.slice(0, 7) ?? "";
      const firstAuditMonth = auditPoints[0]?.monthKey ?? "";
      const hasInitialPoint = inicio && fatInicial !== null;
      const isDuplicate = hasInitialPoint && startMonthKey === firstAuditMonth;

      const combined: { label: string; faturamento: number }[] = [];
      if (hasInitialPoint && !isDuplicate) {
        combined.push({ label: toLabel(inicio!), faturamento: fatInicial! });
      }
      combined.push(...auditPoints.map(p => ({ label: p.label, faturamento: p.faturamento })));

      setChartData(combined);
    });
  }, [userId]);

  const handleSaveInicio = async () => {
    setSavingInicio(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ data_inicio_mentoria: draftInicio || null })
      .eq("user_id", userId);
    setSavingInicio(false);
    if (error) {
      toast({ title: "Erro ao salvar data de início", variant: "destructive" });
    } else {
      setDataInicio(draftInicio || null);
      setEditingInicio(false);
      toast({ title: "Data de início salva" });
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const nonCanceled = tasks.filter(t => t.status !== "cancelada");
  const completed = tasks.filter(t => t.status === "concluida");
  const overdue = tasks.filter(
    t => t.due_date && t.due_date < today && t.status !== "concluida" && t.status !== "cancelada"
  );
  const progress = nonCanceled.length > 0 ? (completed.length / nonCanceled.length) * 100 : 0;

  const growthPct =
    faturamentoInicial && faturamentoAtual
      ? ((faturamentoAtual - faturamentoInicial) / faturamentoInicial) * 100
      : null;

  const nextAction = tasks.find(t => t.is_next_action && t.status !== "concluida" && t.status !== "cancelada");

  return (
    <div className="space-y-6">
      {/* Próxima Ação */}
      {nextAction && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">Próxima Ação</p>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">{nextAction.title}</p>
                {nextAction.description && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 line-clamp-2">{nextAction.description}</p>
                )}
                {nextAction.due_date && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Prazo: {new Date(nextAction.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{nonCanceled.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Concluídas</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{completed.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Em atraso</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{overdue.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Progresso</span>
            </div>
            <p className="text-2xl font-bold text-primary">{Math.round(progress)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso geral</span>
            <span className="text-sm text-muted-foreground">
              {completed.length} / {nonCanceled.length}
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Faturamento summary + data início */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Data início da mentoria */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Início da mentoria</span>
              </div>
              {canEdit && !editingInicio && (
                <button
                  onClick={() => { setDraftInicio(dataInicio || ""); setEditingInicio(true); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {editingInicio ? (
              <div className="flex items-center gap-1 mt-1">
                <Input
                  type="date"
                  value={draftInicio}
                  onChange={e => setDraftInicio(e.target.value)}
                  className="h-7 text-xs"
                />
                <button onClick={handleSaveInicio} disabled={savingInicio} className="p-1">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </button>
                <button onClick={() => setEditingInicio(false)} className="p-1">
                  <X className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            ) : (
              <p className="text-lg font-semibold mt-1">
                {dataInicio
                  ? new Date(dataInicio + "T00:00:00").toLocaleDateString("pt-BR")
                  : <span className="text-muted-foreground text-sm font-normal">Não definido</span>}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Faturamento inicial (from diagnostico) */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Fat. Inicial</p>
            <p className="text-lg font-semibold">{fmt(faturamentoInicial)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Definido no diagnóstico 360°</p>
          </CardContent>
        </Card>

        {/* Faturamento atual (from latest audit) */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Fat. Atual</p>
            <p className="text-lg font-semibold">{fmt(faturamentoAtual)}</p>
            {growthPct !== null && (
              <p
                className={`text-xs font-medium mt-0.5 ${
                  growthPct >= 0 ? "text-green-600" : "text-destructive"
                }`}
              >
                {growthPct >= 0 ? "+" : ""}
                {growthPct.toFixed(1)}% desde o início
              </p>
            )}
            {!faturamentoAtual && (
              <p className="text-xs text-muted-foreground mt-0.5">Da última auditoria</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff private notes */}
      {canEdit && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Anotações privadas</span>
              </div>
              {!editingNote && (
                <button
                  onClick={() => { setNoteDraft(note); setEditingNote(true); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {editingNote ? (
              <div className="space-y-2">
                <Textarea
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  placeholder="Anotações visíveis apenas para você..."
                  rows={3}
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-1">
                  <button onClick={handleSaveNote} disabled={savingNote} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 p-1">
                    {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Salvar
                  </button>
                  <button onClick={() => setEditingNote(false)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground p-1 ml-1">
                    <X className="h-3.5 w-3.5" />Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p className={`text-sm whitespace-pre-wrap ${note ? "" : "text-muted-foreground italic"}`}>
                {note || "Sem anotações. Clique no lápis para adicionar."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Faturamento evolution chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Evolução do Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="fatGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                  width={50}
                />
                <Tooltip
                  formatter={(v: number) => [fmt(v), "Faturamento"]}
                  labelStyle={{ fontSize: 12, color: "hsl(var(--foreground))" }}
                  contentStyle={{
                    fontSize: 12,
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    color: "hsl(var(--card-foreground))",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="faturamento"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#fatGradient)"
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                />
                {faturamentoIdeal && (
                  <ReferenceLine
                    y={faturamentoIdeal}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="6 3"
                    strokeOpacity={0.5}
                    label={{ value: `Meta: ${fmt(faturamentoIdeal)}`, position: "insideTopRight", fontSize: 10, fill: "hsl(var(--primary))" }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
