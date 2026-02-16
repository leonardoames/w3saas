
-- Create daily_results table
CREATE TABLE public.daily_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL,
  investimento numeric DEFAULT 0,
  sessoes integer DEFAULT 0,
  pedidos_pagos integer DEFAULT 0,
  receita_paga numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, data)
);

-- Enable RLS
ALTER TABLE public.daily_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own daily results"
ON public.daily_results FOR SELECT
USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE POLICY "Users can insert own daily results"
ON public.daily_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily results"
ON public.daily_results FOR UPDATE
USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE POLICY "Users can delete own daily results"
ON public.daily_results FOR DELETE
USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_daily_results_updated_at
BEFORE UPDATE ON public.daily_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
