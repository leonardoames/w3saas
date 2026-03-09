import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SkuReposicao {
  id: string;
  user_id: string;
  nome_peca: string;
  sku: string;
  variante: string | null;
  tipo_reposicao: "producao_propria" | "compra_fornecedor";
  estoque_atual: number;
  vendas_por_dia: number;
  lead_time_medio: number;
  lead_time_maximo: number;
  estoque_seguranca: number;
  data_ultimo_pedido: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SkuReposicaoForm {
  nome_peca: string;
  sku: string;
  variante?: string;
  tipo_reposicao: "producao_propria" | "compra_fornecedor";
  estoque_atual: number;
  vendas_por_dia: number;
  lead_time_medio: number;
  lead_time_maximo: number;
  estoque_seguranca: number;
  data_ultimo_pedido?: string | null;
  observacoes?: string;
}

export interface ComputedFields {
  ponto_reposicao: number;
  dias_restantes: number;
  data_pedido: Date;
  data_zeramento: Date;
  status: "critico" | "atencao" | "seguro";
}

export function computeFields(item: {
  vendas_por_dia: number;
  lead_time_medio: number;
  estoque_seguranca: number;
  estoque_atual: number;
}): ComputedFields {
  const { vendas_por_dia, lead_time_medio, estoque_seguranca, estoque_atual } = item;
  const vpd = vendas_por_dia || 0.01; // avoid division by zero

  const ponto_reposicao = Math.ceil(vpd * lead_time_medio + estoque_seguranca);
  const dias_restantes = Math.max(0, (estoque_atual - estoque_seguranca) / vpd);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const data_pedido = new Date(today);
  data_pedido.setDate(data_pedido.getDate() + Math.floor(dias_restantes) - lead_time_medio);

  const data_zeramento = new Date(today);
  data_zeramento.setDate(data_zeramento.getDate() + Math.floor(estoque_atual / vpd));

  const diffDays = Math.floor((data_pedido.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const status: ComputedFields["status"] =
    diffDays <= 0 ? "critico" : diffDays <= 7 ? "atencao" : "seguro";

  return { ponto_reposicao, dias_restantes, data_pedido, data_zeramento, status };
}

export function useSkuReposicao() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sku_reposicao", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sku_reposicao" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SkuReposicao[];
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (form: SkuReposicaoForm) => {
      const { error } = await supabase.from("sku_reposicao" as any).insert({
        user_id: user!.id,
        ...form,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sku_reposicao"] });
      toast.success("Peça cadastrada com sucesso!");
    },
    onError: () => toast.error("Erro ao cadastrar peça"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...form }: SkuReposicaoForm & { id: string }) => {
      const { error } = await supabase
        .from("sku_reposicao" as any)
        .update(form as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sku_reposicao"] });
      toast.success("Peça atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar peça"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sku_reposicao" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sku_reposicao"] });
      toast.success("Peça removida!");
    },
    onError: () => toast.error("Erro ao remover peça"),
  });

  const quickUpdateStock = useMutation({
    mutationFn: async ({ id, estoque_atual }: { id: string; estoque_atual: number }) => {
      const { error } = await supabase
        .from("sku_reposicao" as any)
        .update({ estoque_atual } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sku_reposicao"] });
      toast.success("Estoque atualizado!");
    },
  });

  const registerOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sku_reposicao" as any)
        .update({ data_ultimo_pedido: new Date().toISOString().split("T")[0] } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sku_reposicao"] });
      toast.success("Pedido registrado!");
    },
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    quickUpdateStock: quickUpdateStock.mutateAsync,
    registerOrder: registerOrder.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
