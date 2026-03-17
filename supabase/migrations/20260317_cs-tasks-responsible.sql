ALTER TABLE cs_tasks
  ADD COLUMN IF NOT EXISTS responsible_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
