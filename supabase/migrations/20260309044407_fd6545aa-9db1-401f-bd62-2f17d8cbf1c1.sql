
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_ecommerce boolean DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
