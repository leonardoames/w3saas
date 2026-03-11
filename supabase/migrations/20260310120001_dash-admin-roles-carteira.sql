-- Dash Admin: Tutor/CS/Master role support + carteira table
-- Rules:
--   admin / master → vê todos os mentorados
--   tutor / cs     → vê apenas os mentorados da sua carteira
--
-- Extends the existing user_roles table (already has 'admin' role).
-- No changes to user_roles schema needed — just new role values are inserted.

-- Table: each tutor/CS is assigned specific mentorados
CREATE TABLE IF NOT EXISTS tutor_carteiras (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentorado_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tutor_id, mentorado_id)
);

ALTER TABLE tutor_carteiras ENABLE ROW LEVEL SECURITY;

-- Only admins/master can manage carteiras; tutors/CS can read their own
CREATE POLICY "admins_manage_carteiras" ON tutor_carteiras
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'master')
    )
  );

CREATE POLICY "tutors_read_own_carteira" ON tutor_carteiras
  FOR SELECT
  USING (tutor_id = auth.uid());

-- RPC: returns mentorado user_ids scoped to the current user's role
-- admin/master → all mentorados
-- tutor/cs     → only their carteira
CREATE OR REPLACE FUNCTION get_dash_admin_mentorado_ids()
RETURNS TABLE(mentorado_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_role IN ('admin', 'master') THEN
    RETURN QUERY
      SELECT p.user_id AS mentorado_id
      FROM profiles p
      WHERE p.is_mentorado = true;
  ELSIF v_role IN ('tutor', 'cs') THEN
    RETURN QUERY
      SELECT tc.mentorado_id
      FROM tutor_carteiras tc
      WHERE tc.tutor_id = auth.uid();
  ELSE
    -- No role or unknown role → return nothing (safe default)
    RETURN;
  END IF;
END;
$$;

-- RPC: helper to assign/remove mentorado from tutor carteira (admin only)
CREATE OR REPLACE FUNCTION admin_assign_carteira(
  p_tutor_id uuid,
  p_mentorado_id uuid,
  p_assign boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'master')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_assign THEN
    INSERT INTO tutor_carteiras (tutor_id, mentorado_id)
    VALUES (p_tutor_id, p_mentorado_id)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM tutor_carteiras
    WHERE tutor_id = p_tutor_id AND mentorado_id = p_mentorado_id;
  END IF;
END;
$$;

-- RPC: set a user's dash role (tutor/cs/master) — admin only
CREATE OR REPLACE FUNCTION admin_set_dash_role(
  target_user_id uuid,
  new_role text  -- 'tutor', 'cs', 'master', or NULL to remove
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'master')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF new_role IS NULL THEN
    DELETE FROM user_roles WHERE user_id = target_user_id AND role IN ('tutor', 'cs', 'master');
  ELSE
    -- Remove any existing dash role then insert new one
    DELETE FROM user_roles WHERE user_id = target_user_id AND role IN ('tutor', 'cs', 'master');
    INSERT INTO user_roles (user_id, role) VALUES (target_user_id, new_role)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
