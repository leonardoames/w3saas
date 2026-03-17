-- Restrict W3 Educação content to users with cliente_ames role (or internal staff)

-- Helper function: returns true if current user has AMES access
CREATE OR REPLACE FUNCTION public.has_ames_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role::text IN ('admin', 'master', 'tutor', 'cs', 'cliente_ames')
  )
$$;

-- courses: replace open policy with AMES-gated one
DROP POLICY IF EXISTS "Authenticated users can view active courses" ON public.courses;
CREATE POLICY "AMES users can view active courses" ON public.courses
  FOR SELECT USING (is_active = true AND public.has_ames_access());

-- course_modules: replace open policy with AMES-gated one
DROP POLICY IF EXISTS "Authenticated users can view modules" ON public.course_modules;
CREATE POLICY "AMES users can view modules" ON public.course_modules
  FOR SELECT TO authenticated
  USING (public.has_ames_access());

-- lessons: replace open policy with AMES-gated one
DROP POLICY IF EXISTS "Authenticated users can view lessons" ON public.lessons;
CREATE POLICY "AMES users can view lessons" ON public.lessons
  FOR SELECT TO authenticated
  USING (public.has_ames_access());
