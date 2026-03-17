-- Fix RLS on crm_scheduled_activities to include is_admin() check,
-- matching the same pattern used by crm_clients policy.
DROP POLICY IF EXISTS "Staff manage crm scheduled activities" ON crm_scheduled_activities;

CREATE POLICY "Staff manage crm scheduled activities" ON crm_scheduled_activities
  FOR ALL USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'master', 'tutor', 'cs')
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'master', 'tutor', 'cs')
    )
  );
