-- Drop the overly permissive policy that allows anyone to view all roles
DROP POLICY IF EXISTS "Anyone can view admin status" ON public.user_roles;

-- Create a more restrictive policy: users can only view their own role
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all roles (already have insert/update/delete, add select)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));