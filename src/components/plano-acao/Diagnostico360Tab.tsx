import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Diagnostico360TabProps {
  userId: string;
  canEdit?: boolean;
}

interface DiagData {
  objetivo_principal: string;
  observacoes: string;
  pontos_diagnostico: string;
}

const EMPTY: DiagData = { objetivo_principal: "", observacoes: "", pontos_diagnostico: "" };

export function Diagnostico360Tab({ userId, canEdit = false }: Diagnostico360TabProps) {
  const [data, setData] = useState<DiagData>(EMPTY);
  const [draft, setDraft] = useState<DiagData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    (supabase as any)
      .from("diagnostico_360")
      .select("objetivo_principal, observacoes, pontos_diagnostico")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data: row }: any) => {
        const d: DiagData = {
          objetivo_principal: row?.objetivo_principal ?? "",
          observacoes: row?.observacoes ?? "",
          pontos_diagnostico: row?.pontos_diagnostico ?? "",
        };
        setData(d);
        setDraft(d);
        setLoading(false);
      });
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("diagnostico_360")
      .upsert({
        user_id: userId,
        ...draft,
        updated_at: new Date().toISOString(),
        created_by: user?.id,
      }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar diagnóstico", description: error.message, variant: "destructive" });
    } else {
      setData(draft);
      toast({ title: "Diagnóstico salvo" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Diagnóstico 360°</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Objetivo Principal</Label>
            {canEdit ? (
              <Textarea
                value={draft.objetivo_principal}
                onChange={e => setDraft(d => ({ ...d, objetivo_principal: e.target.value }))}
                placeholder="Qual é o objetivo principal do cliente..."
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-md p-3 min-h-[80px] whitespace-pre-wrap">
                {data.objetivo_principal || "Não preenchido"}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            {canEdit ? (
              <Textarea
                value={draft.observacoes}
                onChange={e => setDraft(d => ({ ...d, observacoes: e.target.value }))}
                placeholder="Observações gerais sobre o negócio..."
                rows={4}
              />
            ) : (
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-md p-3 min-h-[100px] whitespace-pre-wrap">
                {data.observacoes || "Não preenchido"}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Pontos do Diagnóstico</Label>
            {canEdit ? (
              <Textarea
                value={draft.pontos_diagnostico}
                onChange={e => setDraft(d => ({ ...d, pontos_diagnostico: e.target.value }))}
                placeholder="Pontos fortes, fracos e oportunidades identificados..."
                rows={5}
              />
            ) : (
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-md p-3 min-h-[120px] whitespace-pre-wrap">
                {data.pontos_diagnostico || "Não preenchido"}
              </p>
            )}
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
