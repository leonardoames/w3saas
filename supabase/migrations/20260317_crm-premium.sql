-- CRM Premium: next_contact_date, quick_note, and cs_tasks table

ALTER TABLE crm_clients
  ADD COLUMN IF NOT EXISTS next_contact_date date,
  ADD COLUMN IF NOT EXISTS quick_note text;

CREATE TABLE IF NOT EXISTS cs_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cs_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cs_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage cs_tasks" ON cs_tasks FOR ALL
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('master', 'tutor', 'cs')
    )
  );
