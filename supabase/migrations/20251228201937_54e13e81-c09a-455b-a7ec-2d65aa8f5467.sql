-- Create table for influencer CRM cards
CREATE TABLE public.influenciadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  social_handle TEXT,
  telefone TEXT,
  observacoes TEXT,
  stage TEXT NOT NULL DEFAULT 'em_qualificacao',
  stage_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.influenciadores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can only see their own influencers
CREATE POLICY "Usuários podem ver seus próprios influenciadores"
ON public.influenciadores
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios influenciadores"
ON public.influenciadores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios influenciadores"
ON public.influenciadores
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios influenciadores"
ON public.influenciadores
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_influenciadores_updated_at
BEFORE UPDATE ON public.influenciadores
FOR EACH ROW
EXECUTE FUNCTION public.update_metrics_updated_at();