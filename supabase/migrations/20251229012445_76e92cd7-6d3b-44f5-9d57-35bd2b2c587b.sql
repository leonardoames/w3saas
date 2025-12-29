-- Remove overly permissive policy that allows anyone to view module access
DROP POLICY IF EXISTS "Anyone can view module access" ON public.module_access;

-- Create new policy that only allows admins to view module access
-- (The existing "Admins can manage module access" policy already covers ALL operations for admins,
-- but we add explicit SELECT for clarity and consistency)
CREATE POLICY "Only admins can view module access"
ON public.module_access
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));