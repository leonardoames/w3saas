import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

interface SavedProduct {
  id: string;
  name: string;
  sku: string | null;
  selling_price: number;
  product_cost: number;
  media_cost_pct: number;
  fixed_costs_pct: number;
  taxes_pct: number;
  gateway_fee_pct: number;
  platform_fee_pct: number;
  extra_fees_pct: number;
}

interface SavedProductsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadProduct: (product: SavedProduct) => void;
}

export function SavedProductsList({ open, onOpenChange, onLoadProduct }: SavedProductsListProps) {
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("saved_products" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setProducts(data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (open) loadProducts();
  }, [open]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("saved_products" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Produto excluído");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const calcMargin = (p: SavedProduct) => {
    const sp = p.selling_price || 0;
    if (sp <= 0) return 0;
    const totalPct = (p.media_cost_pct || 0) + (p.fixed_costs_pct || 0) + (p.taxes_pct || 0) + (p.gateway_fee_pct || 0) + (p.platform_fee_pct || 0) + (p.extra_fees_pct || 0);
    const totalCost = (p.product_cost || 0) + (sp * totalPct) / 100;
    return ((sp - totalCost) / sp) * 100;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meus Produtos Salvos</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum produto salvo ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const margin = calcMargin(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sku || "—"}</TableCell>
                    <TableCell className="text-right">R$ {(p.selling_price || 0).toFixed(2)}</TableCell>
                    <TableCell className={`text-right ${margin > 0 ? "text-success" : "text-destructive"}`}>
                      {margin.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onLoadProduct(p)} title="Carregar">
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} title="Excluir">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
