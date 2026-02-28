CREATE TABLE public.miro_embeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  embed_src TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.miro_embeds ENABLE ROW LEVEL SECURITY;

-- Usuário vê só o próprio; admin vê todos
CREATE POLICY "Users view own miro embed"
  ON public.miro_embeds FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Apenas admin pode inserir/atualizar/deletar
CREATE POLICY "Admins manage miro embeds"
  ON public.miro_embeds FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
