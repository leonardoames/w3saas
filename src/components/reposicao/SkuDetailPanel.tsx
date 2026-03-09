import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SkuReposicao, computeFields } from "@/hooks/useSkuReposicao";
import { format } from "date-fns";
import { ClipboardCheck, Package } from "lucide-react";

interface Props {
  item: SkuReposicao;
  onRegisterOrder: (id: string) => Promise<void>;
  onQuickUpdateStock: (params: { id: string; estoque_atual: number }) => Promise<void>;
}

export function SkuDetailPanel({ item, onRegisterOrder, onQuickUpdateStock }: Props) {
  const [newStock, setNewStock] = useState(item.estoque_atual);
  const [saving, setSaving] = useState(false);
  const computed = computeFields(item);

  const handleUpdateStock = async () => {
    setSaving(true);
    await onQuickUpdateStock({ id: item.id, estoque_atual: newStock });
    setSaving(false);
  };

  const handleRegister = async () => {
    setSaving(true);
    await onRegisterOrder(item.id);
    setSaving(false);
  };

  return (
    <div className="bg-card/50 border-t border-border/30 px-6 py-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider">Ponto de Reposição</p>
          <p className="text-lg font-bold">{computed.ponto_reposicao} <span className="text-xs font-normal text-muted-foreground">un</span></p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider">Estoque Segurança</p>
          <p className="text-lg font-bold">{item.estoque_seguranca} <span className="text-xs font-normal text-muted-foreground">un</span></p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider">Estoque Zera Em</p>
          <p className="text-lg font-bold">{format(computed.data_zeramento, "dd/MM/yyyy")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground/50 uppercase tracking-wider">Último Pedido</p>
          <p className="text-lg font-bold">{item.data_ultimo_pedido ? format(new Date(item.data_ultimo_pedido + "T12:00:00"), "dd/MM/yyyy") : "—"}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Atualizar Estoque:</span>
          <Input type="number" min={0} className="w-24" value={newStock} onChange={(e) => setNewStock(Number(e.target.value))} />
          <Button size="sm" variant="outline" onClick={handleUpdateStock} disabled={saving}>
            <Package className="h-3.5 w-3.5 mr-1" /> Salvar
          </Button>
        </div>
        <Button size="sm" onClick={handleRegister} disabled={saving} className="bg-primary hover:bg-primary/90">
          <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> Registrar Pedido Feito
        </Button>
      </div>
    </div>
  );
}
