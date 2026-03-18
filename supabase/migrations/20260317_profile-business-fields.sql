-- Add business contact fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS nome_negocio text,
  ADD COLUMN IF NOT EXISTS loja_online_url text,
  ADD COLUMN IF NOT EXISTS loja_shopee_url text,
  ADD COLUMN IF NOT EXISTS loja_mercado_livre_url text,
  ADD COLUMN IF NOT EXISTS loja_shein_url text,
  ADD COLUMN IF NOT EXISTS loja_temu_url text;

-- Staff (tutor/cs/master) can view all profiles — needed for CRM, PlanoAção, admin panels
CREATE POLICY "Staff can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master','tutor','cs')
  )
);

-- Staff can update profiles — so they can fill in contact info for their mentees
CREATE POLICY "Staff can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master','tutor','cs')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('master','tutor','cs')
  )
);
