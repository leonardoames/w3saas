-- Create a public view that excludes user_id for the brands catalog
CREATE VIEW public.brands_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    name,
    logo_url,
    short_description,
    long_description,
    category,
    website_url,
    instagram_url,
    facebook_url,
    is_active,
    status,
    approval_status,
    created_at,
    updated_at
    -- Excludes: user_id, approved_by, approved_at, rejected_reason
  FROM public.brands
  WHERE is_active = true AND approval_status = 'approved';

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.brands_public TO authenticated;
GRANT SELECT ON public.brands_public TO anon;