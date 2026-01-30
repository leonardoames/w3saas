-- Fix all database functions to set search_path for security

-- Fix can_edit_plan
CREATE OR REPLACE FUNCTION public.can_edit_plan(p_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE current_user_id UUID; user_is_admin BOOLEAN; plan_creator UUID; plan_plan_type TEXT;
BEGIN
  current_user_id := auth.uid();
  user_is_admin := public.is_admin_user(current_user_id);
  SELECT created_by, plan_type::TEXT INTO plan_creator, plan_plan_type FROM public.action_plans WHERE id = p_plan_id;
  IF plan_creator IS NULL THEN RETURN FALSE; END IF;
  IF user_is_admin THEN RETURN TRUE; END IF;
  IF plan_plan_type = 'global' THEN RETURN FALSE; END IF;
  IF plan_plan_type = 'individual' AND plan_creator = current_user_id THEN RETURN TRUE; END IF;
  IF plan_plan_type = 'admin_personalizado' THEN RETURN FALSE; END IF;
  RETURN FALSE;
END;
$function$;

-- Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    access_status,
    is_mentorado,
    is_w3_client,
    plan_type,
    is_admin
  )
  VALUES (
    NEW.id,
    NEW.email,
    'active',
    false,
    false,
    'free',
    false
  );

  RETURN NEW;
END;
$function$;

-- Fix can_view_plan
CREATE OR REPLACE FUNCTION public.can_view_plan(p_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE current_user_id UUID; user_is_admin BOOLEAN; plan_plan_type TEXT; plan_creator UUID; plan_target UUID;
BEGIN
  current_user_id := auth.uid();
  user_is_admin := public.is_admin_user(current_user_id);
  IF user_is_admin THEN RETURN TRUE; END IF;
  SELECT plan_type::TEXT, created_by, target_user_id INTO plan_plan_type, plan_creator, plan_target FROM public.action_plans WHERE id = p_plan_id;
  IF plan_plan_type IS NULL THEN RETURN FALSE; END IF;
  IF plan_plan_type = 'global' THEN RETURN TRUE; END IF;
  IF plan_plan_type = 'individual' AND plan_creator = current_user_id THEN RETURN TRUE; END IF;
  IF plan_plan_type = 'admin_personalizado' AND plan_target = current_user_id THEN RETURN TRUE; END IF;
  RETURN FALSE;
END;
$function$;

-- Fix create_action_plan
CREATE OR REPLACE FUNCTION public.create_action_plan(p_title text, p_description text, p_plan_type text, p_target_user_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE new_plan_id UUID; current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF p_title IS NULL OR trim(p_title) = '' THEN RAISE EXCEPTION 'Título obrigatório'; END IF;
  IF p_plan_type NOT IN ('global', 'individual', 'admin_personalizado') THEN RAISE EXCEPTION 'Tipo inválido'; END IF;
  IF NOT can_create_plan(p_plan_type, p_target_user_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_plan_type = 'global' AND p_target_user_id IS NOT NULL THEN RAISE EXCEPTION 'Plano global não tem destinatário'; END IF;
  IF p_plan_type = 'admin_personalizado' AND p_target_user_id IS NULL THEN RAISE EXCEPTION 'Plano personalizado precisa de destinatário'; END IF;
  INSERT INTO public.action_plans (title, description, plan_type, created_by, target_user_id)
  VALUES (trim(p_title), NULLIF(trim(p_description), ''), p_plan_type::plan_type, current_user_id, p_target_user_id)
  RETURNING id INTO new_plan_id;
  RETURN new_plan_id;
END;
$function$;

-- Fix update_action_plan
CREATE OR REPLACE FUNCTION public.update_action_plan(p_plan_id uuid, p_title text, p_description text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT can_edit_plan(p_plan_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_title IS NULL OR trim(p_title) = '' THEN RAISE EXCEPTION 'Título obrigatório'; END IF;
  UPDATE public.action_plans SET title = trim(p_title), description = NULLIF(trim(p_description), '') WHERE id = p_plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano não encontrado'; END IF;
END;
$function$;

-- Fix delete_action_plan
CREATE OR REPLACE FUNCTION public.delete_action_plan(p_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT can_edit_plan(p_plan_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  DELETE FROM public.action_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano não encontrado'; END IF;
END;
$function$;

-- Fix create_action_task
CREATE OR REPLACE FUNCTION public.create_action_task(p_plan_id uuid, p_title text, p_description text DEFAULT NULL::text, p_priority text DEFAULT 'medium'::text, p_due_date date DEFAULT NULL::date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE new_task_id UUID;
BEGIN
  IF NOT can_edit_plan(p_plan_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_title IS NULL OR trim(p_title) = '' THEN RAISE EXCEPTION 'Título obrigatório'; END IF;
  IF p_priority NOT IN ('low', 'medium', 'high') THEN RAISE EXCEPTION 'Prioridade inválida'; END IF;
  INSERT INTO public.action_tasks (plan_id, title, description, priority, due_date)
  VALUES (p_plan_id, trim(p_title), NULLIF(trim(p_description), ''), p_priority, p_due_date) RETURNING id INTO new_task_id;
  RETURN new_task_id;
END;
$function$;

-- Fix update_task_status
CREATE OR REPLACE FUNCTION public.update_task_status(p_task_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE task_plan_id UUID;
BEGIN
  IF p_status NOT IN ('pending', 'in_progress', 'completed', 'cancelled') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  SELECT plan_id INTO task_plan_id FROM public.action_tasks WHERE id = p_task_id;
  IF task_plan_id IS NULL THEN RAISE EXCEPTION 'Tarefa não encontrada'; END IF;
  IF NOT can_edit_plan(task_plan_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.action_tasks SET status = p_status, completed_at = CASE WHEN p_status = 'completed' THEN NOW() ELSE NULL END WHERE id = p_task_id;
END;
$function$;

-- Fix update_action_task
CREATE OR REPLACE FUNCTION public.update_action_task(p_task_id uuid, p_title text, p_description text DEFAULT NULL::text, p_priority text DEFAULT 'medium'::text, p_due_date date DEFAULT NULL::date, p_status text DEFAULT 'pending'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE task_plan_id UUID;
BEGIN
  SELECT plan_id INTO task_plan_id FROM public.action_tasks WHERE id = p_task_id;
  IF task_plan_id IS NULL THEN RAISE EXCEPTION 'Tarefa não encontrada'; END IF;
  IF NOT can_edit_plan(task_plan_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF p_title IS NULL OR trim(p_title) = '' THEN RAISE EXCEPTION 'Título obrigatório'; END IF;
  IF p_priority NOT IN ('low', 'medium', 'high') THEN RAISE EXCEPTION 'Prioridade inválida'; END IF;
  IF p_status NOT IN ('pending', 'in_progress', 'completed', 'cancelled') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  UPDATE public.action_tasks SET title = trim(p_title), description = NULLIF(trim(p_description), ''), priority = p_priority, due_date = p_due_date, status = p_status,
    completed_at = CASE WHEN p_status = 'completed' AND status != 'completed' THEN NOW() ELSE completed_at END WHERE id = p_task_id;
END;
$function$;

-- Fix delete_action_task
CREATE OR REPLACE FUNCTION public.delete_action_task(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE task_plan_id UUID;
BEGIN
  SELECT plan_id INTO task_plan_id FROM public.action_tasks WHERE id = p_task_id;
  IF task_plan_id IS NULL THEN RAISE EXCEPTION 'Tarefa não encontrada'; END IF;
  IF NOT can_edit_plan(task_plan_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  DELETE FROM public.action_tasks WHERE id = p_task_id;
END;
$function$;

-- Fix is_current_user_admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = TRUE
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$function$;

-- Fix is_admin_user
CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = check_user_id AND is_admin = TRUE
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = check_user_id AND role = 'admin'
  );
END;
$function$;

-- Fix admin_update_user_status
CREATE OR REPLACE FUNCTION public.admin_update_user_status(target_user_id uuid, new_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE profiles SET access_status = new_status WHERE user_id = target_user_id;
END;
$function$;

-- Fix admin_update_user_flag
CREATE OR REPLACE FUNCTION public.admin_update_user_flag(target_user_id uuid, flag_name text, flag_value boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF flag_name = 'is_mentorado' THEN
    UPDATE profiles SET is_mentorado = flag_value WHERE user_id = target_user_id;
  ELSIF flag_name = 'is_w3_client' THEN
    UPDATE profiles SET is_w3_client = flag_value WHERE user_id = target_user_id;
  END IF;
END;
$function$;

-- Fix admin_update_user_plan
CREATE OR REPLACE FUNCTION public.admin_update_user_plan(target_user_id uuid, new_plan text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE profiles SET plan_type = new_plan WHERE user_id = target_user_id;
END;
$function$;

-- Fix admin_set_expiration
CREATE OR REPLACE FUNCTION public.admin_set_expiration(target_user_id uuid, expiration_date timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE profiles SET access_expires_at = expiration_date WHERE user_id = target_user_id;
END;
$function$;

-- Fix admin_update_role
CREATE OR REPLACE FUNCTION public.admin_update_role(target_user_id uuid, make_admin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_admin_user(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF make_admin THEN
    UPDATE profiles SET is_admin = TRUE WHERE user_id = target_user_id;
    INSERT INTO user_roles (user_id, role) VALUES (target_user_id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    UPDATE profiles SET is_admin = FALSE WHERE user_id = target_user_id;
    DELETE FROM user_roles WHERE user_id = target_user_id AND role = 'admin';
  END IF;
END;
$function$;

-- Fix update_brands_updated_at
CREATE OR REPLACE FUNCTION public.update_brands_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$;

-- Fix get_user_active_brands_count
CREATE OR REPLACE FUNCTION public.get_user_active_brands_count(check_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM public.brands WHERE user_id = check_user_id AND is_active = TRUE);
END;
$function$;

-- Fix can_user_add_brand
CREATE OR REPLACE FUNCTION public.can_user_add_brand(check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE is_admin BOOLEAN; brands_count INTEGER;
BEGIN
  is_admin := public.is_admin_user(check_user_id);
  IF is_admin THEN RETURN TRUE; END IF;
  brands_count := get_user_active_brands_count(check_user_id);
  RETURN brands_count < 1;
END;
$function$;

-- Fix create_brand
CREATE OR REPLACE FUNCTION public.create_brand(p_name text, p_category text, p_short_description text, p_logo_url text, p_website_url text, p_instagram_url text DEFAULT NULL::text, p_facebook_url text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE new_brand_id UUID; current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF NOT can_user_add_brand(current_user_id) THEN RAISE EXCEPTION 'Você atingiu o limite de marcas cadastradas.'; END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN RAISE EXCEPTION 'Nome da marca é obrigatório'; END IF;
  IF p_category IS NULL OR trim(p_category) = '' THEN RAISE EXCEPTION 'Categoria é obrigatória'; END IF;
  IF p_short_description IS NULL OR trim(p_short_description) = '' THEN RAISE EXCEPTION 'Descrição é obrigatória'; END IF;
  IF char_length(p_short_description) > 160 THEN RAISE EXCEPTION 'Descrição deve ter no máximo 160 caracteres'; END IF;
  IF p_website_url IS NULL OR trim(p_website_url) = '' THEN RAISE EXCEPTION 'Link do website é obrigatório'; END IF;
  
  INSERT INTO public.brands (user_id, name, category, short_description, logo_url, website_url, instagram_url, facebook_url, approval_status, is_active)
  VALUES (current_user_id, trim(p_name), trim(p_category), trim(p_short_description), p_logo_url, trim(p_website_url),
          NULLIF(trim(p_instagram_url), ''), NULLIF(trim(p_facebook_url), ''), 'pending', TRUE)
  RETURNING id INTO new_brand_id;
  RETURN new_brand_id;
END;
$function$;

-- Fix update_brand
CREATE OR REPLACE FUNCTION public.update_brand(p_brand_id uuid, p_name text, p_category text, p_short_description text, p_logo_url text, p_website_url text, p_instagram_url text DEFAULT NULL::text, p_facebook_url text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE current_user_id UUID; brand_owner_id UUID; is_admin BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  is_admin := public.is_admin_user(current_user_id);
  SELECT user_id INTO brand_owner_id FROM public.brands WHERE id = p_brand_id;
  IF brand_owner_id IS NULL THEN RAISE EXCEPTION 'Marca não encontrada'; END IF;
  IF brand_owner_id != current_user_id AND NOT is_admin THEN RAISE EXCEPTION 'Você não tem permissão para editar esta marca'; END IF;
  
  UPDATE public.brands SET name = trim(p_name), category = trim(p_category), short_description = trim(p_short_description),
    logo_url = p_logo_url, website_url = trim(p_website_url),
    instagram_url = NULLIF(trim(p_instagram_url), ''), facebook_url = NULLIF(trim(p_facebook_url), '')
  WHERE id = p_brand_id;
END;
$function$;

-- Fix deactivate_brand
CREATE OR REPLACE FUNCTION public.deactivate_brand(p_brand_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE current_user_id UUID; brand_owner_id UUID; is_admin BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  is_admin := public.is_admin_user(current_user_id);
  SELECT user_id INTO brand_owner_id FROM public.brands WHERE id = p_brand_id;
  IF brand_owner_id IS NULL THEN RAISE EXCEPTION 'Marca não encontrada'; END IF;
  IF brand_owner_id != current_user_id AND NOT is_admin THEN RAISE EXCEPTION 'Você não tem permissão para desativar esta marca'; END IF;
  UPDATE public.brands SET is_active = FALSE WHERE id = p_brand_id;
END;
$function$;

-- Fix approve_brand
CREATE OR REPLACE FUNCTION public.approve_brand(p_brand_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF NOT public.is_admin_user(current_user_id) THEN RAISE EXCEPTION 'Apenas administradores podem aprovar marcas'; END IF;
  UPDATE public.brands SET approval_status = 'approved', approved_by = current_user_id, approved_at = NOW(), rejected_reason = NULL
  WHERE id = p_brand_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Marca não encontrada'; END IF;
END;
$function$;

-- Fix reject_brand
CREATE OR REPLACE FUNCTION public.reject_brand(p_brand_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF NOT public.is_admin_user(current_user_id) THEN RAISE EXCEPTION 'Apenas administradores podem rejeitar marcas'; END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN RAISE EXCEPTION 'Motivo da rejeição é obrigatório'; END IF;
  UPDATE public.brands SET approval_status = 'rejected', rejected_reason = trim(p_reason), is_active = FALSE WHERE id = p_brand_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Marca não encontrada'; END IF;
END;
$function$;

-- Fix update_action_plans_updated_at
CREATE OR REPLACE FUNCTION public.update_action_plans_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$;

-- Fix update_action_tasks_updated_at
CREATE OR REPLACE FUNCTION public.update_action_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$function$;

-- Fix can_create_plan
CREATE OR REPLACE FUNCTION public.can_create_plan(p_plan_type text, p_target_user_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE current_user_id UUID; user_is_admin BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  user_is_admin := public.is_admin_user(current_user_id);
  IF p_plan_type = 'global' THEN RETURN user_is_admin; END IF;
  IF p_plan_type = 'individual' THEN RETURN TRUE; END IF;
  IF p_plan_type = 'admin_personalizado' THEN
    IF NOT user_is_admin THEN RETURN FALSE; END IF;
    IF p_target_user_id IS NULL THEN RETURN FALSE; END IF;
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$function$;