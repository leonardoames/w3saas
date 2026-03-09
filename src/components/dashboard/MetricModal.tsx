import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef } from "react";
import { PlatformSelect } from "./PlatformSelect";
import { PlatformType } from "@/lib/platformConfig";

interface FormData {
  data: string;
  platform: string;
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:w-[520px] bg-[#111111] border-l border-[#242424] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-5 border-b border-[#242424]">
          <SheetTitle className="text-lg font-semibold text-foreground">Dados do Dia</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
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
              <Label className="text-sm font-medium">Plataforma</Label>
              <PlatformSelect
                value={formData.platform || 'outros'}
                onValueChange={(value: PlatformType) => onFormChange({ ...formData, platform: value })}
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
            <div className="col-span-2 space-y-2">
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
        </form>

        <div className="px-6 py-4 border-t border-[#242424] flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSubmit()} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
