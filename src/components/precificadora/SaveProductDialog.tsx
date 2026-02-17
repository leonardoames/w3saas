import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProductInputs } from "@/pages/Calculadora";

interface SaveProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputs: ProductInputs;
  editingProductId: string | null;
  onSaved: () => void;
}

export function SaveProductDialog({ open, onOpenChange, inputs, editingProductId, onSaved }: SaveProductDialogProps) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      user_id: user.id,
      name: name.trim(),
      sku: sku.trim() || null,
      selling_price: parseFloat(inputs.sellingPrice) || 0,
      product_cost: parseFloat(inputs.productCost) || 0,
      media_cost_pct: parseFloat(inputs.mediaCost) || 0,
      fixed_costs_pct: parseFloat(inputs.fixedCosts) || 0,
      taxes_pct: parseFloat(inputs.taxes) || 0,
      gateway_fee_pct: parseFloat(inputs.gatewayFee) || 0,
      platform_fee_pct: parseFloat(inputs.platformFee) || 0,
      extra_fees_pct: parseFloat(inputs.extraFees) || 0,
    };

    let error;
    if (editingProductId) {
      ({ error } = await supabase.from("saved_products" as any).update(payload).eq("id", editingProductId));
    } else {
      ({ error } = await supabase.from("saved_products" as any).insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar produto");
    } else {
      toast.success(editingProductId ? "Produto atualizado!" : "Produto salvo!");
      onSaved();
      onOpenChange(false);
      setName("");
      setSku("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingProductId ? "Atualizar Produto" : "Salvar Produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Produto *</Label>
            <Input placeholder="Ex: Camiseta Básica" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>SKU (opcional)</Label>
            <Input placeholder="Ex: CAM-001" value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
