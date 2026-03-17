import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/hooks/useTasks";

interface DashboardTabProps {
  tasks: Task[];
  userId: string;
  canEdit?: boolean;
}

interface Billing {
  faturamento_inicial: number | null;
  faturamento_atual: number | null;
}

export function DashboardTab({ tasks, userId, canEdit = false }: DashboardTabProps) {
  const [billing, setBilling] = useState<Billing>({ faturamento_inicial: null, faturamento_atual: null });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Billing>({ faturamento_inicial: null, faturamento_atual: null });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("client_billing" as any)
      .select("faturamento_inicial, faturamento_atual")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBilling(data as Billing);
          setDraft(data as Billing);
        }
      });
  }, [userId]);

  const today = new Date().toISOString().split("T")[0];
  const nonCanceled = tasks.filter(t => t.status !== "cancelada");
  const completed = tasks.filter(t => t.status === "concluida");
  const overdue = tasks.filter(
    t => t.due_date && t.due_date < today && t.status !== "concluida" && t.status !== "cancelada"
  );
  const progress = nonCanceled.length > 0 ? (completed.length / nonCanceled.length) * 100 : 0;

  const handleSaveBilling = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("client_billing")
      .upsert({ user_id: userId, ...draft, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar faturamento", variant: "destructive" });
    } else {
      setBilling(draft);
      setEditing(false);
      toast({ title: "Faturamento salvo" });
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const growthPct =
    billing.faturamento_inicial && billing.faturamento_atual
      ? ((billing.faturamento_atual - billing.faturamento_inicial) / billing.faturamento_inicial) * 100
      : null;

  return (
    <div className="space-y-6">
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
            <span className="text-sm text-muted-foreground">{completed.length} / {nonCanceled.length}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Faturamento</CardTitle>
            {canEdit && !editing && (
              <Button variant="ghost" size="sm" onClick={() => { setDraft(billing); setEditing(true); }}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Editar
              </Button>
            )}
            {canEdit && editing && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveBilling} disabled={saving}>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Faturamento Inicial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.faturamento_inicial ?? ""}
                  onChange={e => setDraft(d => ({ ...d, faturamento_inicial: e.target.value ? parseFloat(e.target.value) : null }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Faturamento Atual (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.faturamento_atual ?? ""}
                  onChange={e => setDraft(d => ({ ...d, faturamento_atual: e.target.value ? parseFloat(e.target.value) : null }))}
                  placeholder="0,00"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Inicial</p>
                <p className="text-lg font-semibold">{formatCurrency(billing.faturamento_inicial)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Atual</p>
                <p className="text-lg font-semibold">{formatCurrency(billing.faturamento_atual)}</p>
              </div>
              {growthPct !== null && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Crescimento</p>
                  <p className={`text-lg font-semibold ${growthPct >= 0 ? "text-green-600" : "text-destructive"}`}>
                    {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
