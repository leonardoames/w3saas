-- CRM interno para time de CS/tutores
-- Visibilidade: apenas staff (admin, master, tutor, cs)

CREATE TABLE crm_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'onboarding'
    CONSTRAINT crm_valid_stage CHECK (
      stage IN ('onboarding','engajado','risco','alerta','congelado','cancelado','reembolsado','concluido')
    ),
  responsible_cs_id uuid REFERENCES auth.users(id),
  stage_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage CRM clients" ON crm_clients FOR ALL
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role::text IN ('master','tutor','cs')
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role::text IN ('master','tutor','cs')
    )
  );

-- Comentários internos por cliente CRM
CREATE TABLE crm_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_client_id uuid NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage CRM comments" ON crm_comments FOR ALL
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role::text IN ('master','tutor','cs')
    )
  );

-- Log automático de atividades (mudança de etapa, comentários)
CREATE TABLE crm_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_client_id uuid NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL, -- 'stage_changed' | 'commented' | 'created'
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage CRM activity" ON crm_activity_log FOR ALL
  USING (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role::text IN ('master','tutor','cs')
    )
  );
