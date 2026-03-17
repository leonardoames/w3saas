CREATE TABLE IF NOT EXISTS crm_scheduled_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_client_id uuid NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'task',
  scheduled_for date NOT NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_scheduled_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage crm scheduled activities" ON crm_scheduled_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'master', 'tutor', 'cs')
    )
  );
