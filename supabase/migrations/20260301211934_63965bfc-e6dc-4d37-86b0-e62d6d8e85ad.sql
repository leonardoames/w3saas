
-- Create a secure view that excludes credentials
CREATE OR REPLACE VIEW public.user_integrations_safe AS
SELECT id, user_id, platform, is_active, sync_status, last_sync_at, created_at, updated_at
FROM public.user_integrations;

-- Grant access to the view
GRANT SELECT ON public.user_integrations_safe TO authenticated;
GRANT SELECT ON public.user_integrations_safe TO anon;
