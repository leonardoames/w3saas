-- Enable RLS on lesson_progress table (it may already have policies but RLS not enabled)
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Verify existing policies are in place (recreate if missing)
-- Drop and recreate to ensure consistency
DROP POLICY IF EXISTS "Users can view own progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON public.lesson_progress;

-- Create secure RLS policies for lesson_progress
CREATE POLICY "Users can view own progress" 
ON public.lesson_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" 
ON public.lesson_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" 
ON public.lesson_progress 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" 
ON public.lesson_progress 
FOR DELETE 
USING (auth.uid() = user_id);