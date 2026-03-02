
CREATE TABLE public.brand_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, user_id)
);

ALTER TABLE public.brand_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes" ON public.brand_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own likes" ON public.brand_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON public.brand_likes
  FOR DELETE USING (auth.uid() = user_id);
