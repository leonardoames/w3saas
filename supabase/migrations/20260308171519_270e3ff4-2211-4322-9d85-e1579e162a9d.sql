
CREATE TABLE public.ia_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  instruction_type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ia_instructions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage instructions
CREATE POLICY "Admins can manage ia_instructions"
ON public.ia_instructions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- All authenticated users can read active instructions (needed by edge function context)
CREATE POLICY "Authenticated users can read active instructions"
ON public.ia_instructions
FOR SELECT
TO authenticated
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_ia_instructions_updated_at
  BEFORE UPDATE ON public.ia_instructions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
