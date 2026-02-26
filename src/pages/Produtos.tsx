import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { ProductFormDialog } from "@/components/produtos/ProductFormDialog";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  details_url: string | null;
  whatsapp_url: string | null;
  display_order: number;
}

export default function Produtos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { isAdmin } = useAdminStatus();

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("mentoria_products" as any)
      .select("*")
      .order("display_order", { ascending: true });
    
    if (!error && data) {
      setProducts(data as any as Product[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente remover este produto?")) return;
    const { error } = await supabase.from("mentoria_products" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover produto");
    } else {
      toast.success("Produto removido!");
      loadProducts();
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos da Mentoria</h1>
          <p className="mt-2 text-muted-foreground">
            Conheça outros produtos e serviços da AMH e W3 Tráfego Pago
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      ) : products.length === 0 ? (
        <p className="text-muted-foreground">Nenhum produto cadastrado ainda.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              {product.image_url && (
                <div className="aspect-video overflow-hidden bg-muted">
                  <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{product.title}</CardTitle>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.description && (
                  <p className="text-sm text-muted-foreground">{product.description}</p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  {product.details_url && (
                    <Button variant="outline" asChild className="flex-1">
                      <a href={product.details_url}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Saiba Mais
                      </a>
                    </Button>
                  )}
                  {product.whatsapp_url && (
                    <Button asChild className="flex-1">
                      <a href={product.whatsapp_url} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Falar com Especialista
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSaved={loadProducts}
      />
    </div>
  );
}
