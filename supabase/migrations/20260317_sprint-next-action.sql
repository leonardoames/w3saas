-- Add sprint grouping and next-action pin to tasks
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS sprint integer;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS is_next_action boolean NOT NULL DEFAULT false;

-- Staff private notes per client (only visible to the author)
CREATE TABLE IF NOT EXISTS staff_client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, client_id)
);

ALTER TABLE staff_client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage own notes" ON staff_client_notes FOR ALL
  USING (auth.uid() = staff_id)
  WITH CHECK (auth.uid() = staff_id);
