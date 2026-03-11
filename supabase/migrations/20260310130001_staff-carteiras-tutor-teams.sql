-- staff_carteiras: maps CS (or any staff) to their assigned mentorados
CREATE TABLE IF NOT EXISTS staff_carteiras (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentorado_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by  uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, mentorado_id)
);

ALTER TABLE staff_carteiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_staff_carteiras" ON staff_carteiras
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'master')
    )
  );

CREATE POLICY "staff_read_own_carteira" ON staff_carteiras
  FOR SELECT
  USING (staff_id = auth.uid());

-- tutor_teams: maps tutor to the CSs they supervise
CREATE TABLE IF NOT EXISTS tutor_teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cs_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tutor_id, cs_id)
);

ALTER TABLE tutor_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_tutor_teams" ON tutor_teams
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'master')
    )
  );

CREATE POLICY "tutors_read_own_team" ON tutor_teams
  FOR SELECT
  USING (tutor_id = auth.uid());

-- Updated RPC: returns mentorado ids scoped to caller's role
-- admin/master → all is_mentorado=true users
-- tutor        → union of mentorados across all CSs in tutor_teams
-- cs           → only staff_carteiras WHERE staff_id = auth.uid()
CREATE OR REPLACE FUNCTION get_dash_admin_mentorado_ids()
RETURNS TABLE(mentorado_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role::text INTO v_role
  FROM user_roles
  WHERE user_id = auth.uid()
  AND role::text IN ('admin', 'master', 'tutor', 'cs')
  ORDER BY CASE role::text
    WHEN 'admin'  THEN 1
    WHEN 'master' THEN 2
    WHEN 'tutor'  THEN 3
    WHEN 'cs'     THEN 4
    ELSE 5
  END
  LIMIT 1;

  IF v_role IN ('admin', 'master') THEN
    RETURN QUERY
      SELECT p.user_id AS mentorado_id
      FROM profiles p
      WHERE p.is_mentorado = true;

  ELSIF v_role = 'tutor' THEN
    RETURN QUERY
      SELECT DISTINCT sc.mentorado_id
      FROM tutor_teams tt
      JOIN staff_carteiras sc ON sc.staff_id = tt.cs_id
      WHERE tt.tutor_id = auth.uid();

  ELSIF v_role = 'cs' THEN
    RETURN QUERY
      SELECT sc.mentorado_id
      FROM staff_carteiras sc
      WHERE sc.staff_id = auth.uid();

  ELSE
    RETURN;
  END IF;
END;
$$;

-- RPC: assign/remove mentorado from a staff member's carteira
CREATE OR REPLACE FUNCTION admin_assign_staff_carteira(
  p_staff_id     uuid,
  p_mentorado_id uuid,
  p_assign       boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role::text IN ('admin', 'master')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_assign THEN
    INSERT INTO staff_carteiras (staff_id, mentorado_id, assigned_by)
    VALUES (p_staff_id, p_mentorado_id, auth.uid())
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM staff_carteiras
    WHERE staff_id = p_staff_id AND mentorado_id = p_mentorado_id;
  END IF;
END;
$$;

-- RPC: assign/remove a CS from a tutor's team
CREATE OR REPLACE FUNCTION admin_assign_tutor_team(
  p_tutor_id uuid,
  p_cs_id    uuid,
  p_assign   boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role::text IN ('admin', 'master')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_assign THEN
    INSERT INTO tutor_teams (tutor_id, cs_id, created_by)
    VALUES (p_tutor_id, p_cs_id, auth.uid())
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM tutor_teams
    WHERE tutor_id = p_tutor_id AND cs_id = p_cs_id;
  END IF;
END;
$$;

-- RPC: set a user's product roles (cliente_w3 and/or cliente_ames)
CREATE OR REPLACE FUNCTION admin_set_client_role(
  target_user_id uuid,
  p_role         text,    -- 'cliente_w3' or 'cliente_ames'
  p_grant        boolean  -- true = grant, false = revoke
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role::text IN ('admin', 'master')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_role NOT IN ('cliente_w3', 'cliente_ames') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  IF p_grant THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (target_user_id, p_role::app_role)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM user_roles
    WHERE user_id = target_user_id AND role = p_role::app_role;
  END IF;
END;
$$;
