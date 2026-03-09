-- =============================================================
-- MIGRATION: user_attributes table
-- Migrates is_mentorado and is_w3_client from profiles to
-- user_attributes. Columns in profiles are renamed to _deprecated
-- for rollback safety. Dual-write RPC updated.
-- =============================================================

-- STEP 1: Create user_attributes table

CREATE TABLE IF NOT EXISTS public.user_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attribute text NOT NULL,
  value text NOT NULL DEFAULT 'true',
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT NULL,
  notes text DEFAULT NULL,
  UNIQUE(user_id, attribute)
);

CREATE INDEX idx_user_attributes_user_id ON public.user_attributes(user_id);
CREATE INDEX idx_user_attributes_attribute ON public.user_attributes(attribute);

ALTER TABLE public.user_attributes ENABLE ROW LEVEL SECURITY;

-- Admin: full read/write
CREATE POLICY "Admin full access on user_attributes"
  ON public.user_attributes
  FOR ALL
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Users: read only their own rows
CREATE POLICY "Users read own attributes"
  ON public.user_attributes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- STEP 2: Migrate existing data from profiles

INSERT INTO public.user_attributes (user_id, attribute, value, notes)
SELECT
  user_id,
  'is_mentorado',
  'true',
  'Migrado automaticamente de profiles.is_mentorado'
FROM public.profiles
WHERE is_mentorado = true
ON CONFLICT (user_id, attribute) DO NOTHING;

INSERT INTO public.user_attributes (user_id, attribute, value, notes)
SELECT
  user_id,
  'is_w3_client',
  'true',
  'Migrado automaticamente de profiles.is_w3_client'
FROM public.profiles
WHERE is_w3_client = true
ON CONFLICT (user_id, attribute) DO NOTHING;


-- STEP 7: Rename deprecated columns (keeps data for rollback safety)

ALTER TABLE public.profiles
  RENAME COLUMN is_mentorado TO is_mentorado_deprecated;

ALTER TABLE public.profiles
  RENAME COLUMN is_w3_client TO is_w3_client_deprecated;

COMMENT ON COLUMN public.profiles.is_mentorado_deprecated IS
  'DEPRECATED — use user_attributes WHERE attribute = ''is_mentorado''. Kept for rollback safety only.';

COMMENT ON COLUMN public.profiles.is_w3_client_deprecated IS
  'DEPRECATED — use user_attributes WHERE attribute = ''is_w3_client''. Kept for rollback safety only.';


-- STEP 5: Update admin_update_user_flag to dual-write
-- (references new column names after rename above)

CREATE OR REPLACE FUNCTION public.admin_update_user_flag(
  target_user_id uuid,
  flag_name text,
  flag_value boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Write to deprecated profile column (keeps it in sync for rollback)
  IF flag_name = 'is_mentorado' THEN
    UPDATE profiles SET is_mentorado_deprecated = flag_value WHERE user_id = target_user_id;
  ELSIF flag_name = 'is_w3_client' THEN
    UPDATE profiles SET is_w3_client_deprecated = flag_value WHERE user_id = target_user_id;
  END IF;

  -- Dual-write to user_attributes (source of truth)
  IF flag_value THEN
    INSERT INTO user_attributes (user_id, attribute, value, notes)
    VALUES (target_user_id, flag_name, 'true', 'Set via admin panel')
    ON CONFLICT (user_id, attribute) DO UPDATE SET value = 'true';
  ELSE
    DELETE FROM user_attributes
    WHERE user_id = target_user_id AND attribute = flag_name;
  END IF;
END;
$function$;
