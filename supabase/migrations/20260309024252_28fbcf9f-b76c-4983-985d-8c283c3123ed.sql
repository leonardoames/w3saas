
CREATE TYPE public.tipo_reposicao AS ENUM ('producao_propria', 'compra_fornecedor');

CREATE TABLE public.sku_reposicao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_peca TEXT NOT NULL,
  sku TEXT NOT NULL,
  variante TEXT,
  tipo_reposicao tipo_reposicao NOT NULL DEFAULT 'compra_fornecedor',
  estoque_atual INTEGER NOT NULL DEFAULT 0,
  vendas_por_dia NUMERIC NOT NULL DEFAULT 0,
  lead_time_medio INTEGER NOT NULL DEFAULT 0,
  lead_time_maximo INTEGER NOT NULL DEFAULT 0,
  estoque_seguranca INTEGER NOT NULL DEFAULT 0,
  data_ultimo_pedido DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sku_reposicao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sku_reposicao" ON public.sku_reposicao FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sku_reposicao" ON public.sku_reposicao FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sku_reposicao" ON public.sku_reposicao FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sku_reposicao" ON public.sku_reposicao FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_sku_reposicao_updated_at
  BEFORE UPDATE ON public.sku_reposicao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
