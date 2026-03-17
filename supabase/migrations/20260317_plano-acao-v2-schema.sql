-- Migration: Plano de Ação v2 schema
-- Adds new fields, tables, and RLS policies for the redesigned action plan module

-- ============================================================
-- 1. Add new columns to tarefas
-- ============================================================
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]';

-- ============================================================
-- 2. Clean up generic seeded tasks and remove seed trigger
-- ============================================================
DELETE FROM tarefas WHERE origin = 'sistema';

DROP TRIGGER IF EXISTS on_auth_user_created_seed_tasks ON auth.users;
DROP FUNCTION IF EXISTS public.seed_default_tasks();

-- ============================================================
-- 3. Update RLS on tarefas: staff-only for INSERT and DELETE
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own tasks" ON tarefas;
DROP POLICY IF EXISTS "Users can delete own mentorado tasks" ON tarefas;

-- INSERT: only staff (admin, master, tutor, cs)
CREATE POLICY "Staff can insert tasks" ON tarefas FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('master', 'tutor', 'cs')
    )
  );

-- DELETE: only staff
CREATE POLICY "Staff can delete tasks" ON tarefas FOR DELETE
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('master', 'tutor', 'cs')
    )
  );

-- UPDATE remains as-is: clients can update status of their own tasks

-- ============================================================
-- 4. Table: client_billing
-- ============================================================
CREATE TABLE IF NOT EXISTS client_billing (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  faturamento_inicial numeric,
  faturamento_atual   numeric,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);

ALTER TABLE client_billing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage billing" ON client_billing;
DROP POLICY IF EXISTS "User view own billing" ON client_billing;

CREATE POLICY "Staff manage billing" ON client_billing FOR ALL
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('master', 'tutor', 'cs')
    )
  );

CREATE POLICY "User view own billing" ON client_billing FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. Table: result_audits
-- ============================================================
CREATE TABLE IF NOT EXISTS result_audits (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  faturamento    numeric,
  comentario     text,
  created_by     uuid REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mes_referencia)
);

ALTER TABLE result_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage audits" ON result_audits;
DROP POLICY IF EXISTS "User view own audits" ON result_audits;

CREATE POLICY "Staff manage audits" ON result_audits FOR ALL
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('master', 'tutor', 'cs')
    )
  );

CREATE POLICY "User view own audits" ON result_audits FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. Table: diagnostico_360
-- ============================================================
CREATE TABLE IF NOT EXISTS diagnostico_360 (
  user_id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  objetivo_principal text,
  observacoes        text,
  pontos_diagnostico text,
  created_by         uuid REFERENCES auth.users(id),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE diagnostico_360 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage diagnostico" ON diagnostico_360;
DROP POLICY IF EXISTS "User view own diagnostico" ON diagnostico_360;

CREATE POLICY "Staff manage diagnostico" ON diagnostico_360 FOR ALL
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('master', 'tutor', 'cs')
    )
  );

CREATE POLICY "User view own diagnostico" ON diagnostico_360 FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 7. Table: action_comments
-- ============================================================
CREATE TABLE IF NOT EXISTS action_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE action_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View comments" ON action_comments;
DROP POLICY IF EXISTS "Insert comment" ON action_comments;
DROP POLICY IF EXISTS "Delete own comment" ON action_comments;

-- SELECT: staff + task owner
CREATE POLICY "View comments" ON action_comments FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('master', 'tutor', 'cs')
    ) OR
    EXISTS (
      SELECT 1 FROM tarefas
      WHERE id = task_id AND user_id = auth.uid()
    )
  );

-- INSERT: must be own comment + (staff OR task owner)
CREATE POLICY "Insert comment" ON action_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      public.is_admin(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
          AND role::text IN ('master', 'tutor', 'cs')
      ) OR
      EXISTS (
        SELECT 1 FROM tarefas
        WHERE id = task_id AND user_id = auth.uid()
      )
    )
  );

-- DELETE: own comment or admin
CREATE POLICY "Delete own comment" ON action_comments FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ============================================================
-- 8. Table: action_activity_log
-- ============================================================
CREATE TABLE IF NOT EXISTS action_activity_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event      text NOT NULL,   -- 'created' | 'status_changed' | 'commented'
  payload    jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE action_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View activity" ON action_activity_log;
DROP POLICY IF EXISTS "Insert activity" ON action_activity_log;

CREATE POLICY "View activity" ON action_activity_log FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('master', 'tutor', 'cs')
    ) OR
    EXISTS (
      SELECT 1 FROM tarefas
      WHERE id = task_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Insert activity" ON action_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);
