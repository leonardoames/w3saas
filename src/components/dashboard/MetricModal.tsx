import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef } from "react";

interface FormData {
  data: string;
  faturamento: string;
  sessoes: string;
  investimento_trafego: string;
  vendas_quantidade: string;
  vendas_valor: string;
}

interface MetricModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: FormData;
  onFormChange: (data: FormData) => void;
  onSubmit: (e?: React.FormEvent) => Promise<void>;
  saving: boolean;
}

export function MetricModal({ open, onOpenChange, formData, onFormChange, onSubmit, saving }: MetricModalProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && dateInputRef.current) {
      setTimeout(() => dateInputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Dados do Dia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data</Label>
              <Input 
                ref={dateInputRef}
                type="date" 
                value={formData.data} 
                onChange={(e) => onFormChange({ ...formData, data: e.target.value })} 
                required 
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Faturamento (R$)</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0,00"
                value={formData.faturamento} 
                onChange={(e) => onFormChange({ ...formData, faturamento: e.target.value })} 
                required 
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sessões</Label>
              <Input 
                type="number" 
                placeholder="0"
                value={formData.sessoes} 
                onChange={(e) => onFormChange({ ...formData, sessoes: e.target.value })} 
                required 
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Investimento (R$)</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0,00"
                value={formData.investimento_trafego} 
                onChange={(e) => onFormChange({ ...formData, investimento_trafego: e.target.value })} 
                required 
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nº de Vendas</Label>
              <Input 
                type="number" 
                placeholder="0"
                value={formData.vendas_quantidade} 
                onChange={(e) => onFormChange({ ...formData, vendas_quantidade: e.target.value })} 
                required 
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Valor das Vendas (R$)</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0,00"
                value={formData.vendas_valor} 
                onChange={(e) => onFormChange({ ...formData, vendas_valor: e.target.value })} 
                required 
                className="h-10"
              />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full h-10">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
