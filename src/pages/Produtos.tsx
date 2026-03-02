import { Button } from "@/components/ui/button";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { ProductFormDialog } from "@/components/produtos/ProductFormDialog";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  image_url: string | null;
  details_url: string | null;
  whatsapp_url: string | null;
  button_text: string | null;
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
    if (!confirm("Deseja realmente remover esta solução?")) return;
    const { error } = await supabase.from("mentoria_products" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover solução");
    } else {
      toast.success("Solução removida!");
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

  const getActionUrl = (product: Product) => product.details_url || product.whatsapp_url || "#";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-page-title text-foreground">Ecossistema W3</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Soluções integradas para acelerar seu e-commerce
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleAdd} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[340px] animate-pulse rounded-2xl bg-[#111111] border border-[#222222]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[#222222] bg-[#111111] py-20">
          <Package className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-section-title text-muted-foreground">Nenhuma solução cadastrada</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#222222] bg-[#111111] transition-colors hover:border-[#333333]"
            >
              {/* Admin controls */}
              {isAdmin && (
                <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => handleEdit(product)}
                    className="rounded-lg bg-[#1A1A1A]/90 p-1.5 text-muted-foreground backdrop-blur-sm hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="rounded-lg bg-[#1A1A1A]/90 p-1.5 text-muted-foreground backdrop-blur-sm hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Image area */}
              <div className="flex h-[160px] items-center justify-center bg-[#1A1A1A] rounded-t-2xl overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-10 w-10 text-primary" />
                )}
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-[16px] font-bold leading-tight text-[#F5F5F5]">
                  {product.title}
                </h3>
                {product.tagline && (
                  <span className="mt-1 text-[12px] font-medium text-primary">
                    {product.tagline}
                  </span>
                )}
                {product.description && (
                  <p className="mt-2 text-[13px] leading-snug text-[#A0A0A0] line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Spacer + CTA */}
                <div className="mt-auto pt-5">
                  <Button asChild className="w-full">
                    <a
                      href={getActionUrl(product)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {product.button_text || "Falar com Especialista"}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
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
