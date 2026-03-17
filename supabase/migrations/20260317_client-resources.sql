CREATE TABLE IF NOT EXISTS client_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'video', -- 'video' | 'arquivo'
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage client resources" ON client_resources FOR ALL
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role::text IN ('master', 'tutor', 'cs')
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role::text IN ('master', 'tutor', 'cs')
    )
  );

CREATE POLICY "Client view own resources" ON client_resources FOR SELECT
  USING (auth.uid() = user_id);
