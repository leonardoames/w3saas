-- Create table for user calendar events
CREATE TABLE public.user_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  notas TEXT,
  tipo TEXT NOT NULL DEFAULT 'campanha' CHECK (tipo IN ('lancamento', 'campanha', 'liquidacao', 'institucional')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuários podem ver seus próprios eventos"
ON public.user_calendar_events
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios eventos"
ON public.user_calendar_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios eventos"
ON public.user_calendar_events
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios eventos"
ON public.user_calendar_events
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_calendar_events_updated_at
BEFORE UPDATE ON public.user_calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_metrics_updated_at();