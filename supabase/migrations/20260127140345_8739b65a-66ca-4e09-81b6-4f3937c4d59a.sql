-- Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  short_description TEXT NOT NULL,
  long_description TEXT,
  category TEXT NOT NULL,
  website_url TEXT NOT NULL,
  instagram_url TEXT,
  facebook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view active/approved brands
CREATE POLICY "Anyone can view active approved brands" 
ON public.brands 
FOR SELECT 
USING (is_active = true AND status = 'approved');

-- Users can view their own brands (any status)
CREATE POLICY "Users can view own brands" 
ON public.brands 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own brands
CREATE POLICY "Users can insert own brands" 
ON public.brands 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own brands
CREATE POLICY "Users can update own brands" 
ON public.brands 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins can view all brands
CREATE POLICY "Admins can view all brands" 
ON public.brands 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Admins can update all brands
CREATE POLICY "Admins can update all brands" 
ON public.brands 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Admins can delete brands
CREATE POLICY "Admins can delete brands" 
ON public.brands 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Trigger to update updated_at
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to count user's active brands
CREATE OR REPLACE FUNCTION public.get_user_active_brands_count(check_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.brands
    WHERE user_id = check_user_id AND is_active = true
  );
END;
$$;

-- Function to check if user can add brand (limit 1 per user, admins unlimited)
CREATE OR REPLACE FUNCTION public.can_user_add_brand(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can always add
  IF public.is_admin(check_user_id) THEN
    RETURN true;
  END IF;
  
  -- Regular users limited to 1 active brand
  RETURN (
    SELECT COUNT(*) < 1
    FROM public.brands
    WHERE user_id = check_user_id AND is_active = true
  );
END;
$$;