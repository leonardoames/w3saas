DROP TRIGGER IF EXISTS on_auth_user_last_sign_in ON auth.users;

-- Keep profiles.last_login_at in sync with auth.users.last_sign_in_at
CREATE TRIGGER on_auth_user_last_sign_in
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.update_last_login();

-- Backfill existing users so admin tables show accurate last login
UPDATE public.profiles p
SET last_login_at = u.last_sign_in_at
FROM auth.users u
WHERE p.user_id = u.id
  AND u.last_sign_in_at IS NOT NULL
  AND (p.last_login_at IS NULL OR p.last_login_at <> u.last_sign_in_at);
