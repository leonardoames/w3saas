
CREATE OR REPLACE FUNCTION public.admin_update_revenue_goal(target_user_id uuid, new_goal numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE profiles SET revenue_goal = new_goal WHERE user_id = target_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;
END;
$$;
