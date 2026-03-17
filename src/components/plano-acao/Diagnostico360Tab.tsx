import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Lock, Target, DollarSign, FileText, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Diagnostico360TabProps {
  userId: string;
  canEdit?: boolean;
}

interface DiagData {
  objetivo_principal: string;
  faturamento_inicial: string;
  faturamento_ideal: string;
  observacoes: string;
  pontos_diagnostico: string;
}

const EMPTY: DiagData = {
  objetivo_principal: "",
  faturamento_inicial: "",
  faturamento_ideal: "",
  observacoes: "",
  pontos_diagnostico: "",
};

function InfoBlock({ icon: Icon, label, value, highlight }: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-4 ${highlight ? "bg-primary/8 border border-primary/20" : "bg-muted/40"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${highlight ? "text-primary" : "text-muted-foreground"}`}>
          {label}
        </span>
      </div>
      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${highlight ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        {value || <span className="italic opacity-50">Não preenchido</span>}
      </p>
    </div>
  );
}

export function Diagnostico360Tab({ userId, canEdit = false }: Diagnostico360TabProps) {
  const [data, setData] = useState<DiagData>(EMPTY);
  const [draft, setDraft] = useState<DiagData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [editing, setEditing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    (supabase as any)
      .from("diagnostico_360")
      .select("objetivo_principal, faturamento_ideal, observacoes, pontos_diagnostico, updated_at")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data: row }: any) => {
        const d: DiagData = {
          objetivo_principal: row?.objetivo_principal ?? "",
          faturamento_inicial: row?.faturamento_inicial?.toString() ?? "",
          faturamento_ideal: row?.faturamento_ideal?.toString() ?? "",
          observacoes: row?.observacoes ?? "",
          pontos_diagnostico: row?.pontos_diagnostico ?? "",
        };
        const hasData = !!(row?.objetivo_principal || row?.faturamento_inicial || row?.faturamento_ideal || row?.observacoes || row?.pontos_diagnostico);
        setData(d);
        setDraft(d);
        // Lock if already filled — only staff can unlock to edit again
        setIsLocked(hasData);
        setLoading(false);
      });
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("diagnostico_360")
      .upsert({
        user_id: userId,
        objetivo_principal: draft.objetivo_principal || null,
        faturamento_inicial: draft.faturamento_inicial ? parseFloat(draft.faturamento_inicial) : null,
        faturamento_ideal: draft.faturamento_ideal ? parseFloat(draft.faturamento_ideal) : null,
        observacoes: draft.observacoes || null,
        pontos_diagnostico: draft.pontos_diagnostico || null,
        updated_at: new Date().toISOString(),
        created_by: user?.id,
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar diagnóstico", description: error.message, variant: "destructive" });
    } else {
      setData(draft);
      setIsLocked(true);
      setEditing(false);
      toast({ title: "Diagnóstico salvo" });
    }
  };

  const formatCurrency = (val: string) => {
    const num = parseFloat(val);
    if (!val || isNaN(num)) return "";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const showForm = canEdit && (!isLocked || editing);
  const isEmpty = !data.objetivo_principal && !data.faturamento_inicial && !data.faturamento_ideal && !data.observacoes && !data.pontos_diagnostico;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Diagnóstico 360°</h3>
          <p className="text-xs text-muted-foreground">Análise completa do negócio</p>
        </div>
        {canEdit && isLocked && !editing && (
          <Button variant="outline" size="sm" onClick={() => { setDraft(data); setEditing(true); }}>
            Editar diagnóstico
          </Button>
        )}
        {canEdit && isLocked && editing && (
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setDraft(data); setEditing(false); }}>
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Edit form */}
      {showForm ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-primary" />
              Objetivo Principal
            </Label>
            <Textarea
              value={draft.objetivo_principal}
              onChange={e => setDraft(d => ({ ...d, objetivo_principal: e.target.value }))}
              placeholder="Qual é o objetivo principal do cliente..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                Fat. no Início (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={draft.faturamento_inicial}
                onChange={e => setDraft(d => ({ ...d, faturamento_inicial: e.target.value }))}
                placeholder="Ex: 30000"
              />
              <p className="text-xs text-muted-foreground">Faturamento real ao início da mentoria</p>
            </div>

            <div className="space-y-1">
              <Label className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                Fat. Ideal / Meta (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={draft.faturamento_ideal}
                onChange={e => setDraft(d => ({ ...d, faturamento_ideal: e.target.value }))}
                placeholder="Ex: 100000"
              />
              <p className="text-xs text-muted-foreground">Meta de faturamento mensal</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Observações
            </Label>
            <Textarea
              value={draft.observacoes}
              onChange={e => setDraft(d => ({ ...d, observacoes: e.target.value }))}
              placeholder="Observações gerais sobre o negócio..."
              rows={4}
            />
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Pontos do Diagnóstico
            </Label>
            <Textarea
              value={draft.pontos_diagnostico}
              onChange={e => setDraft(d => ({ ...d, pontos_diagnostico: e.target.value }))}
              placeholder="Pontos fortes, fracos e oportunidades identificados..."
              rows={5}
            />
          </div>

          {!editing && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar diagnóstico
              </Button>
            </div>
          )}
        </div>
      ) : isEmpty ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Diagnóstico não preenchido ainda</p>
          {canEdit && (
            <Button size="sm" className="mt-3" onClick={() => setEditing(true)}>
              Preencher diagnóstico
            </Button>
          )}
        </div>
      ) : (
        /* View mode — good visual hierarchy */
        <div className="space-y-3">
          {/* Faturamento cards */}
          {(data.faturamento_inicial || data.faturamento_ideal) && (
            <div className="grid grid-cols-2 gap-3">
              {data.faturamento_inicial && (
                <div className="rounded-lg border bg-muted/40 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Fat. Inicial
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(data.faturamento_inicial)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Ao entrar na mentoria</p>
                </div>
              )}
              {data.faturamento_ideal && (
                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-1">
                    Fat. Ideal / Meta
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(data.faturamento_ideal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Meta mensal</p>
                </div>
              )}
            </div>
          )}

          <InfoBlock
            icon={Target}
            label="Objetivo Principal"
            value={data.objetivo_principal}
            highlight
          />

          <InfoBlock
            icon={FileText}
            label="Observações"
            value={data.observacoes}
          />

          <InfoBlock
            icon={Lightbulb}
            label="Pontos do Diagnóstico"
            value={data.pontos_diagnostico}
          />

          {isLocked && !canEdit && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <Lock className="h-3 w-3" />
              Diagnóstico definido pela consultoria
            </p>
          )}
        </div>
      )}
    </div>
  );
}
