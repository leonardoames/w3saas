CREATE POLICY "All authenticated can view approved brands"
ON public.brands
FOR SELECT
TO authenticated
USING (approval_status = 'approved' AND is_active = TRUE);