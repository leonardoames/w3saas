-- 1) Rate limiting table for sensitive API endpoints (service-role only)
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint, window_start)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to rate limits" ON public.api_rate_limits;
CREATE POLICY "No direct access to rate limits"
ON public.api_rate_limits
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

DROP TRIGGER IF EXISTS update_api_rate_limits_updated_at ON public.api_rate_limits;
CREATE TRIGGER update_api_rate_limits_updated_at
BEFORE UPDATE ON public.api_rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- 2) Encrypted contact data split out from influenciadores (service-role only)
CREATE TABLE IF NOT EXISTS public.influenciador_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influenciador_id UUID NOT NULL UNIQUE REFERENCES public.influenciadores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  telefone_encrypted TEXT NOT NULL,
  telefone_masked TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_influenciador_contacts_user_id
  ON public.influenciador_contacts(user_id);

ALTER TABLE public.influenciador_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access to contacts" ON public.influenciador_contacts;
CREATE POLICY "No direct access to contacts"
ON public.influenciador_contacts
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

DROP TRIGGER IF EXISTS update_influenciador_contacts_updated_at ON public.influenciador_contacts;
CREATE TRIGGER update_influenciador_contacts_updated_at
BEFORE UPDATE ON public.influenciador_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- 3) Lock down direct table access to influenciadores (force usage through server-side API)
DROP POLICY IF EXISTS "Usuários podem ver seus próprios influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios influenciadores" ON public.influenciadores;

DROP POLICY IF EXISTS "No direct access to influenciadores" ON public.influenciadores;
CREATE POLICY "No direct access to influenciadores"
ON public.influenciadores
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
