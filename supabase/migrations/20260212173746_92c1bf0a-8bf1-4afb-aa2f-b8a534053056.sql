
-- Tabela para armazenar credenciais de integração de cada usuário
CREATE TABLE public.user_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, platform)
);

-- Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Policies: each user manages only their own integrations
CREATE POLICY "Users can view own integrations"
ON public.user_integrations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
ON public.user_integrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
ON public.user_integrations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
ON public.user_integrations FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_integrations_updated_at
BEFORE UPDATE ON public.user_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
