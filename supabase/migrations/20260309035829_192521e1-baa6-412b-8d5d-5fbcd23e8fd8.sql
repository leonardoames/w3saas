
-- Create the central products table
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  sku text NOT NULL,
  variante text,
  preco_venda numeric,
  custo_unitario numeric,
  estoque_atual integer DEFAULT 0,
  vendas_por_dia numeric,
  lead_time_medio integer,
  lead_time_maximo integer,
  tipo_reposicao text,
  estoque_seguranca integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own products" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add product_id to sku_reposicao
ALTER TABLE public.sku_reposicao ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- Add product_id to saved_scenarios
ALTER TABLE public.saved_scenarios ADD COLUMN product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
