
-- Table: plan_aulas (links lessons to user plans)
CREATE TABLE public.plan_aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.plan_aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage plan_aulas" ON public.plan_aulas
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own plan_aulas" ON public.plan_aulas
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Table: plan_ferramentas (tools/spreadsheets assigned to users)
CREATE TABLE public.plan_ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  external_url TEXT,
  type TEXT NOT NULL DEFAULT 'planilha',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.plan_ferramentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage plan_ferramentas" ON public.plan_ferramentas
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own plan_ferramentas" ON public.plan_ferramentas
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at on plan_ferramentas
CREATE TRIGGER update_plan_ferramentas_updated_at
  BEFORE UPDATE ON public.plan_ferramentas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for ferramenta files
INSERT INTO storage.buckets (id, name, public) VALUES ('plan-ferramentas', 'plan-ferramentas', true);

-- Storage policies
CREATE POLICY "Admins can upload plan ferramentas" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'plan-ferramentas' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete plan ferramentas" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'plan-ferramentas' AND public.is_admin(auth.uid()));

CREATE POLICY "Anyone can view plan ferramentas" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'plan-ferramentas');
