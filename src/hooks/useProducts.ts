import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Product {
  id: string;
  user_id: string;
  nome: string;
  sku: string;
  variante: string | null;
  preco_venda: number | null;
  custo_unitario: number | null;
  estoque_atual: number;
  vendas_por_dia: number | null;
  lead_time_medio: number | null;
  lead_time_maximo: number | null;
  tipo_reposicao: string | null;
  estoque_seguranca: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProductForm {
  nome: string;
  sku: string;
  variante?: string | null;
  preco_venda?: number | null;
  custo_unitario?: number | null;
  estoque_atual?: number;
  vendas_por_dia?: number | null;
  lead_time_medio?: number | null;
  lead_time_maximo?: number | null;
  tipo_reposicao?: string | null;
  estoque_seguranca?: number | null;
}

export function useProducts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["products", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Product[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (form: ProductForm): Promise<Product> => {
      const { data, error } = await supabase
        .from("products" as any)
        .insert({ user_id: user!.id, ...form } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto salvo com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar produto"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...form }: ProductForm & { id: string }): Promise<Product> => {
      const { data, error } = await supabase
        .from("products" as any)
        .update(form as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast.error("Erro ao atualizar produto"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto removido!");
    },
    onError: () => toast.error("Erro ao remover produto"),
  });

  return {
    products: query.data || [],
    isLoading: query.isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

/** Sync shared fields from products to sku_reposicao */
export async function syncProductToReposicao(productId: string, form: ProductForm) {
  try {
    const { error } = await supabase
      .from("sku_reposicao" as any)
      .update({
        nome_peca: form.nome,
        sku: form.sku,
        variante: form.variante || null,
        estoque_atual: form.estoque_atual ?? 0,
        vendas_por_dia: form.vendas_por_dia ?? 0,
        lead_time_medio: form.lead_time_medio ?? 0,
        lead_time_maximo: form.lead_time_maximo ?? 0,
        tipo_reposicao: form.tipo_reposicao || "compra_fornecedor",
        estoque_seguranca: form.estoque_seguranca ?? 0,
      } as any)
      .eq("product_id", productId);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

/** Sync shared fields from sku_reposicao form to products */
export async function syncReposicaoToProduct(productId: string, form: {
  nome_peca: string;
  sku: string;
  variante?: string | null;
  estoque_atual: number;
  vendas_por_dia: number;
  lead_time_medio: number;
  lead_time_maximo: number;
  tipo_reposicao: string;
  estoque_seguranca: number;
}) {
  try {
    const { error } = await supabase
      .from("products" as any)
      .update({
        nome: form.nome_peca,
        sku: form.sku,
        variante: form.variante || null,
        estoque_atual: form.estoque_atual,
        vendas_por_dia: form.vendas_por_dia,
        lead_time_medio: form.lead_time_medio,
        lead_time_maximo: form.lead_time_maximo,
        tipo_reposicao: form.tipo_reposicao,
        estoque_seguranca: form.estoque_seguranca,
      } as any)
      .eq("id", productId);
    if (error) throw error;
    return true;
  } catch {
    return false;
  }
}

/** Find or create a product for a given SKU */
export async function findOrCreateProduct(userId: string, form: {
  nome_peca: string;
  sku: string;
  variante?: string | null;
  estoque_atual: number;
  vendas_por_dia: number;
  lead_time_medio: number;
  lead_time_maximo: number;
  tipo_reposicao: string;
  estoque_seguranca: number;
}): Promise<string | null> {
  try {
    // Check if product with same SKU exists
    const { data: existing } = await supabase
      .from("products" as any)
      .select("id")
      .eq("user_id", userId)
      .eq("sku", form.sku)
      .limit(1);

    if (existing && (existing as any[]).length > 0) {
      const productId = (existing as any[])[0].id;
      // Sync fields to product
      await syncReposicaoToProduct(productId, form);
      return productId;
    }

    // Create new product
    const { data: newProduct, error } = await supabase
      .from("products" as any)
      .insert({
        user_id: userId,
        nome: form.nome_peca,
        sku: form.sku,
        variante: form.variante || null,
        estoque_atual: form.estoque_atual,
        vendas_por_dia: form.vendas_por_dia,
        lead_time_medio: form.lead_time_medio,
        lead_time_maximo: form.lead_time_maximo,
        tipo_reposicao: form.tipo_reposicao,
        estoque_seguranca: form.estoque_seguranca,
      } as any)
      .select("id")
      .single();

    if (error) throw error;
    return (newProduct as any)?.id || null;
  } catch {
    return null;
  }
}

/** Hook to auto-sync orphan sku_reposicao records (product_id IS NULL) into products catalog */
export function useSyncOrphanReposicao() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hasRun = useRef(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!user?.id || hasRun.current) return;
    hasRun.current = true;

    try {
      // Fetch orphan sku_reposicao records
      const { data: orphans, error } = await supabase
        .from("sku_reposicao" as any)
        .select("*")
        .eq("user_id", user.id)
        .is("product_id", null);

      if (error || !orphans || (orphans as any[]).length === 0) return;

      setIsSyncing(true);
      let synced = 0;

      for (const orphan of orphans as any[]) {
        try {
          // Check if product with same SKU already exists
          const { data: existing } = await supabase
            .from("products" as any)
            .select("id")
            .eq("user_id", user.id)
            .eq("sku", orphan.sku)
            .limit(1);

          let productId: string;

          if (existing && (existing as any[]).length > 0) {
            productId = (existing as any[])[0].id;
          } else {
            // Create new product from reposicao data
            const { data: newProd, error: insertErr } = await supabase
              .from("products" as any)
              .insert({
                user_id: user.id,
                nome: orphan.nome_peca,
                sku: orphan.sku,
                variante: orphan.variante || null,
                estoque_atual: orphan.estoque_atual,
                vendas_por_dia: orphan.vendas_por_dia,
                lead_time_medio: orphan.lead_time_medio,
                lead_time_maximo: orphan.lead_time_maximo,
                tipo_reposicao: orphan.tipo_reposicao,
                estoque_seguranca: orphan.estoque_seguranca,
              } as any)
              .select("id")
              .single();

            if (insertErr || !newProd) continue;
            productId = (newProd as any).id;
          }

          // Link orphan to product
          await supabase
            .from("sku_reposicao" as any)
            .update({ product_id: productId } as any)
            .eq("id", orphan.id);

          synced++;
        } catch {
          // Continue with next orphan
        }
      }

      if (synced > 0) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["sku_reposicao"] });
        toast.success(`${synced} produto${synced > 1 ? "s" : ""} sincronizado${synced > 1 ? "s" : ""} do estoque`);
      }
    } catch {
      // Never block the page
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, queryClient]);

  useEffect(() => {
    sync();
  }, [sync]);

  return { isSyncing };
}
