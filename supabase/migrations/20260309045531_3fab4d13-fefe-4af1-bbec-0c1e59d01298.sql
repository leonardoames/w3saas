-- STEP 3: Update is_admin_user to only check user_roles (remove profiles.is_admin dependency)
CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = check_user_id AND role = 'admin'
  );
END;
$function$;

-- Update is_current_user_admin to only check user_roles
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$function$;

-- Update admin_update_role to NOT touch profiles.is_admin anymore
CREATE OR REPLACE FUNCTION public.admin_update_role(target_user_id uuid, make_admin boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF make_admin THEN
    INSERT INTO user_roles (user_id, role) VALUES (target_user_id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM user_roles WHERE user_id = target_user_id AND role = 'admin';
  END IF;
END;
$function$;

-- Update handle_new_user to NOT set is_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    access_status,
    is_mentorado,
    is_w3_client,
    plan_type
  )
  VALUES (
    NEW.id,
    NEW.email,
    'active',
    false,
    false,
    'free'
  );
  RETURN NEW;
END;
$function$;

-- STEP 5: Rename the column to mark as deprecated
ALTER TABLE profiles RENAME COLUMN is_admin TO is_admin_deprecated;

-- Add deprecation comment
COMMENT ON COLUMN profiles.is_admin_deprecated IS 'DEPRECATED — use user_roles table instead. Do not read this field. Kept for rollback safety only.';

-- Set default so it does not break inserts
ALTER TABLE profiles ALTER COLUMN is_admin_deprecated SET DEFAULT false;