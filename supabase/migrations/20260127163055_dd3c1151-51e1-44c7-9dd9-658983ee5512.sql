-- Enable RLS on course_modules table
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

-- Enable RLS on lessons table
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Policies for course_modules: Authenticated users with access can view
CREATE POLICY "Authenticated users can view modules"
ON public.course_modules
FOR SELECT
TO authenticated
USING (true);

-- Admins can manage modules (insert, update, delete)
CREATE POLICY "Admins can manage modules"
ON public.course_modules
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Policies for lessons: Authenticated users with access can view
CREATE POLICY "Authenticated users can view lessons"
ON public.lessons
FOR SELECT
TO authenticated
USING (true);

-- Admins can manage lessons (insert, update, delete)
CREATE POLICY "Admins can manage lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Policies for lesson_progress: Users can manage their own progress
CREATE POLICY "Users can view own progress"
ON public.lesson_progress
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.lesson_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.lesson_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
ON public.lesson_progress
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);