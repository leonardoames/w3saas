CREATE TABLE IF NOT EXISTS ia_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'default',
  messages jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mode)
);

ALTER TABLE ia_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_conversations" ON ia_conversations
  FOR ALL USING (user_id = auth.uid());
