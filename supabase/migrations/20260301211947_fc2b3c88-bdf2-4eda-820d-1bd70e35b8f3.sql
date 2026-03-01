
-- Fix: set view to SECURITY INVOKER so RLS of the querying user applies
ALTER VIEW public.user_integrations_safe SET (security_invoker = on);
