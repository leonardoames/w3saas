
-- Create saved_products table
CREATE TABLE public.saved_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  sku text,
  selling_price numeric,
  product_cost numeric,
  media_cost_pct numeric,
  fixed_costs_pct numeric,
  taxes_pct numeric,
  gateway_fee_pct numeric,
  platform_fee_pct numeric,
  extra_fees_pct numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products" ON public.saved_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own products" ON public.saved_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.saved_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.saved_products FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_products_updated_at BEFORE UPDATE ON public.saved_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create saved_scenarios table
CREATE TABLE public.saved_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  current_visits numeric,
  current_rate numeric,
  current_ticket numeric,
  new_visits numeric,
  new_rate numeric,
  new_ticket numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.saved_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scenarios" ON public.saved_scenarios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scenarios" ON public.saved_scenarios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scenarios" ON public.saved_scenarios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scenarios" ON public.saved_scenarios FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_scenarios_updated_at BEFORE UPDATE ON public.saved_scenarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add revenue_goal to profiles
ALTER TABLE public.profiles ADD COLUMN revenue_goal numeric DEFAULT NULL;
