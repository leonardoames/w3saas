import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

export interface DailyResultFormData {
  data: string;
  investimento: string;
  sessoes: string;
  pedidos_pagos: string;
  receita_paga: string;
}

interface DailyResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: DailyResultFormData;
  onFormChange: (data: DailyResultFormData) => void;
  onSubmit: () => void;
  saving: boolean;
  isEditing?: boolean;
}

export function DailyResultModal({
  open, onOpenChange, formData, onFormChange, onSubmit, saving, isEditing
}: DailyResultModalProps) {
  const handleChange = (field: keyof DailyResultFormData, value: string) => {
    onFormChange({ ...formData, [field]: value });
  };

  const computed = useMemo(() => {
    const inv = parseFloat(formData.investimento) || 0;
    const sess = parseInt(formData.sessoes) || 0;
    const ped = parseInt(formData.pedidos_pagos) || 0;
    const rec = parseFloat(formData.receita_paga) || 0;

    return {
      roas: inv > 0 ? (rec / inv).toFixed(2) : "—",
      custoMidia: rec > 0 ? ((inv / rec) * 100).toFixed(1) + "%" : "—",
      cpa: ped > 0 ? "R$ " + (inv / ped).toFixed(2) : "—",
      taxaConversao: sess > 0 ? ((ped / sess) * 100).toFixed(2) + "%" : "—",
      ticketMedio: ped > 0 ? "R$ " + (rec / ped).toFixed(2) : "—",
      cps: sess > 0 ? "R$ " + (inv / sess).toFixed(2) : "—",
    };
  }, [formData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Registro" : "Adicionar Registro"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={formData.data}
              onChange={(e) => handleChange("data", e.target.value)}
              disabled={isEditing}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Investimento (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.investimento}
                onChange={(e) => handleChange("investimento", e.target.value)}
              />
            </div>
            <div>
              <Label>Sessões</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.sessoes}
                onChange={(e) => handleChange("sessoes", e.target.value)}
              />
            </div>
            <div>
              <Label>Pedidos Pagos</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.pedidos_pagos}
                onChange={(e) => handleChange("pedidos_pagos", e.target.value)}
              />
            </div>
            <div>
              <Label>Receita Paga (R$)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.receita_paga}
                onChange={(e) => handleChange("receita_paga", e.target.value)}
              />
            </div>
          </div>

          {/* Calculated preview */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Métricas Calculadas</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "ROAS", value: computed.roas },
                { label: "Custo Mídia", value: computed.custoMidia },
                { label: "CPA", value: computed.cpa },
                { label: "TX Conv.", value: computed.taxaConversao },
                { label: "Ticket Médio", value: computed.ticketMedio },
                { label: "CPS", value: computed.cps },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-semibold text-foreground">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving || !formData.data}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Salvar" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
