
-- DRE Config
CREATE TABLE public.dre_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cmv_pct numeric NOT NULL DEFAULT 0,
  impostos_pct numeric NOT NULL DEFAULT 0,
  taxas_plataforma_pct numeric NOT NULL DEFAULT 0,
  frete_liquido_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.dre_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own dre config" ON public.dre_config FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dre config" ON public.dre_config FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dre config" ON public.dre_config FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all dre config" ON public.dre_config FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Fixed expenses
CREATE TABLE public.dre_despesas_fixas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  descricao text NOT NULL,
  categoria text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dre_despesas_fixas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own fixed expenses" ON public.dre_despesas_fixas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fixed expenses" ON public.dre_despesas_fixas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fixed expenses" ON public.dre_despesas_fixas FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fixed expenses" ON public.dre_despesas_fixas FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all fixed expenses" ON public.dre_despesas_fixas FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- One-time expenses
CREATE TABLE public.dre_despesas_avulsas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mes_referencia date NOT NULL,
  descricao text NOT NULL,
  categoria text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dre_despesas_avulsas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own onetime expenses" ON public.dre_despesas_avulsas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onetime expenses" ON public.dre_despesas_avulsas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onetime expenses" ON public.dre_despesas_avulsas FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own onetime expenses" ON public.dre_despesas_avulsas FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all onetime expenses" ON public.dre_despesas_avulsas FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- One-time revenues
CREATE TABLE public.dre_receitas_avulsas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mes_referencia date NOT NULL,
  descricao text NOT NULL,
  categoria text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dre_receitas_avulsas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own onetime revenues" ON public.dre_receitas_avulsas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onetime revenues" ON public.dre_receitas_avulsas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onetime revenues" ON public.dre_receitas_avulsas FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own onetime revenues" ON public.dre_receitas_avulsas FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all onetime revenues" ON public.dre_receitas_avulsas FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- Triggers
CREATE TRIGGER update_dre_config_updated_at BEFORE UPDATE ON public.dre_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dre_despesas_fixas_updated_at BEFORE UPDATE ON public.dre_despesas_fixas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dre_despesas_avulsas_updated_at BEFORE UPDATE ON public.dre_despesas_avulsas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dre_receitas_avulsas_updated_at BEFORE UPDATE ON public.dre_receitas_avulsas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fix missing policies on daily_results
CREATE POLICY "Users can view own daily results" ON public.daily_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own daily results" ON public.daily_results FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily results" ON public.daily_results FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all daily results" ON public.daily_results FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can view all metrics diarias" ON public.metrics_diarias FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
