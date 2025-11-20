-- Criar tabela de métricas diárias
CREATE TABLE public.metrics_diarias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  faturamento NUMERIC(12, 2) DEFAULT 0,
  sessoes INTEGER DEFAULT 0,
  investimento_trafego NUMERIC(12, 2) DEFAULT 0,
  vendas_quantidade INTEGER DEFAULT 0,
  vendas_valor NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, data)
);

-- Habilitar RLS
ALTER TABLE public.metrics_diarias ENABLE ROW LEVEL SECURITY;

-- Policies: usuários podem ver apenas suas próprias métricas
CREATE POLICY "Usuários podem ver suas próprias métricas"
ON public.metrics_diarias
FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem inserir suas próprias métricas
CREATE POLICY "Usuários podem inserir suas próprias métricas"
ON public.metrics_diarias
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias métricas
CREATE POLICY "Usuários podem atualizar suas próprias métricas"
ON public.metrics_diarias
FOR UPDATE
USING (auth.uid() = user_id);

-- Usuários podem deletar suas próprias métricas
CREATE POLICY "Usuários podem deletar suas próprias métricas"
ON public.metrics_diarias
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_metrics_diarias_updated_at
BEFORE UPDATE ON public.metrics_diarias
FOR EACH ROW
EXECUTE FUNCTION public.update_metrics_updated_at();