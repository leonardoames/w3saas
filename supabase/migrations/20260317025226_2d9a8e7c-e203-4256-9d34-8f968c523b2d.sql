
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function: send welcome email on first login
CREATE OR REPLACE FUNCTION public.notify_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when last_login_at changes from NULL to a value (first login)
  IF OLD.last_login_at IS NULL AND NEW.last_login_at IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/send-notification-email',
      body := jsonb_build_object(
        'type', 'welcome',
        'user_id', NEW.user_id
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Function: send access blocked email
CREATE OR REPLACE FUNCTION public.notify_access_blocked_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when access_status changes to 'blocked' or 'suspended'
  IF OLD.access_status = 'active' AND NEW.access_status IN ('blocked', 'suspended') THEN
    PERFORM extensions.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/send-notification-email',
      body := jsonb_build_object(
        'type', 'access_blocked',
        'user_id', NEW.user_id,
        'data', jsonb_build_object('reason', CASE WHEN NEW.access_status = 'blocked' THEN 'Seu acesso foi bloqueado pelo administrador.' ELSE 'Seu acesso foi suspenso.' END)
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers on profiles table
CREATE TRIGGER on_first_login_welcome_email
  AFTER UPDATE OF last_login_at ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_welcome_email();

CREATE TRIGGER on_access_blocked_email
  AFTER UPDATE OF access_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_access_blocked_email();
