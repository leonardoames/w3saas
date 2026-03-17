-- Add faturamento_ideal to diagnostico_360
ALTER TABLE diagnostico_360 ADD COLUMN IF NOT EXISTS faturamento_ideal numeric;

-- Update RLS: only admin and tutor can write (remove cs write access)
DROP POLICY IF EXISTS "Staff manage diagnostico" ON diagnostico_360;

CREATE POLICY "Admin tutor manage diagnostico" ON diagnostico_360 FOR ALL
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('master', 'tutor')
    )
  );
