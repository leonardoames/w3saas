CREATE POLICY "Admins can view all metrics_diarias"
ON public.metrics_diarias
FOR SELECT
TO authenticated
USING (public.is_admin_user(auth.uid()));