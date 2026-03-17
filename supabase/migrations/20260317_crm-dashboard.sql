-- Campos de contrato em crm_clients (para métricas de valor médio, tempo e churn)
ALTER TABLE crm_clients
  ADD COLUMN IF NOT EXISTS valor_contrato numeric,
  ADD COLUMN IF NOT EXISTS data_inicio_contrato date,
  ADD COLUMN IF NOT EXISTS data_fim_contrato date;

-- Hierarquia Tutor → CS
CREATE TABLE IF NOT EXISTS tutor_cs_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cs_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (tutor_id, cs_id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tutor_cs_assignments ENABLE ROW LEVEL SECURITY;

-- Todos do staff podem visualizar
CREATE POLICY "Staff view tutor_cs_assignments" ON tutor_cs_assignments FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role::text IN ('master','tutor','cs')
    )
  );

-- Apenas admin/master pode gerenciar
CREATE POLICY "Admin insert tutor_cs_assignments" ON tutor_cs_assignments FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role::text = 'master'
    )
  );

CREATE POLICY "Admin delete tutor_cs_assignments" ON tutor_cs_assignments FOR DELETE
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role::text = 'master'
    )
  );
