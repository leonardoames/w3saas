
-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  cover_url TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active courses" ON public.courses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Add course_id to course_modules (nullable for backward compat)
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id);

-- Seed 3 courses
INSERT INTO public.courses (title, description, slug, "order") VALUES
  ('Mentoria AMES', 'Aulas completas da mentoria AMES para acelerar seu e-commerce', 'mentoria-ames', 1),
  ('Tutorias', 'Tutoriais práticos e guias passo a passo', 'tutorias', 2),
  ('Hotseats com Léo', 'Sessões ao vivo de análise e consultoria', 'hotseats', 3);

-- Assign existing modules to "Mentoria AMES"
UPDATE public.course_modules SET course_id = (SELECT id FROM public.courses WHERE slug = 'mentoria-ames') WHERE course_id IS NULL;

-- Updated_at trigger for courses
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
