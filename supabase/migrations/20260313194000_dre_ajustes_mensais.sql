-- Ajustes manuais para compor DRE com maior fidelidade (descontos, reembolsos, chargebacks, etc.)
CREATE TABLE IF NOT EXISTS public.dre_ajustes_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  descricao text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN (
    'descontos',
    'reembolsos',
    'chargebacks',
    'outras_receitas',
    'outras_despesas_operacionais'
  )),
  valor numeric NOT NULL DEFAULT 0 CHECK (valor >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dre_ajustes_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dre adjustments"
  ON public.dre_ajustes_mensais FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dre adjustments"
  ON public.dre_ajustes_mensais FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dre adjustments"
  ON public.dre_ajustes_mensais FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dre adjustments"
  ON public.dre_ajustes_mensais FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all dre adjustments"
  ON public.dre_ajustes_mensais FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_dre_ajustes_mensais_updated_at
  BEFORE UPDATE ON public.dre_ajustes_mensais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
