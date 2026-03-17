import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CurrencyInput } from "@/components/ui/currency-input";

interface Audit {
  id: string;
  mes_referencia: string;
  faturamento: number | null;
  comentario: string | null;
}

interface AuditoriasTabProps {
  userId: string;
  canEdit?: boolean;
}

export function AuditoriasTab({ userId, canEdit = false }: AuditoriasTabProps) {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAudit, setEditAudit] = useState<Audit | null>(null);
  const [form, setForm] = useState({ mes_referencia: "", faturamento: "", comentario: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAudits();
  }, [userId]);

  const fetchAudits = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("result_audits")
      .select("id, mes_referencia, faturamento, comentario")
      .eq("user_id", userId)
      .order("mes_referencia", { ascending: false });
    setLoading(false);
    if (!error) setAudits(data || []);
  };

  const openNew = () => {
    setEditAudit(null);
    setForm({ mes_referencia: "", faturamento: "", comentario: "" });
    setDialogOpen(true);
  };

  const openEdit = (audit: Audit) => {
    setEditAudit(audit);
    setForm({
      mes_referencia: audit.mes_referencia.slice(0, 7), // YYYY-MM
      faturamento: audit.faturamento?.toString() ?? "",
      comentario: audit.comentario ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.mes_referencia) return;
    setSaving(true);
    const payload = {
      user_id: userId,
      mes_referencia: form.mes_referencia + "-01",
      faturamento: form.faturamento ? parseFloat(form.faturamento) : null,
      comentario: form.comentario || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editAudit) {
      ({ error } = await (supabase as any)
        .from("result_audits")
        .update(payload)
        .eq("id", editAudit.id));
    } else {
      ({ error } = await (supabase as any)
        .from("result_audits")
        .insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar auditoria", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editAudit ? "Auditoria atualizada" : "Auditoria adicionada" });
      setDialogOpen(false);
      fetchAudits();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("result_audits").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao remover auditoria", variant: "destructive" });
    } else {
      setAudits(prev => prev.filter(a => a.id !== id));
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatMonth = (date: string) => {
    return new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Auditoria
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : audits.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma auditoria de resultado registrada
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Mês</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Faturamento</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">Comentário</th>
                {canEdit && <th className="px-4 py-2 w-20" />}
              </tr>
            </thead>
            <tbody>
              {audits.map((audit, i) => (
                <tr key={audit.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-4 py-2 font-medium capitalize">{formatMonth(audit.mes_referencia)}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(audit.faturamento)}</td>
                  <td className="px-4 py-2 text-muted-foreground hidden sm:table-cell max-w-xs truncate">
                    {audit.comentario || "—"}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(audit)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(audit.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAudit ? "Editar Auditoria" : "Nova Auditoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Mês de referência</Label>
              <Input
                type="month"
                value={form.mes_referencia}
                onChange={e => setForm(f => ({ ...f, mes_referencia: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Faturamento (R$)</Label>
              <CurrencyInput
                value={form.faturamento}
                onChange={v => setForm(f => ({ ...f, faturamento: v }))}
                placeholder="R$ 0"
              />
            </div>
            <div className="space-y-1">
              <Label>Comentário</Label>
              <Textarea
                value={form.comentario}
                onChange={e => setForm(f => ({ ...f, comentario: e.target.value }))}
                placeholder="Observações sobre o período..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.mes_referencia}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
