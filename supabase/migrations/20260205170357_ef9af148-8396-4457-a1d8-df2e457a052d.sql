-- Create a separate table for Stripe payment data with strict RLS
CREATE TABLE public.user_payment_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_payment_info ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (via edge functions)
-- No policies = no direct access from client
CREATE POLICY "No direct client access"
ON public.user_payment_info
FOR ALL
USING (false)
WITH CHECK (false);

-- Migrate existing data from profiles
INSERT INTO public.user_payment_info (user_id, stripe_customer_id, stripe_subscription_id)
SELECT user_id, stripe_customer_id, stripe_subscription_id
FROM public.profiles
WHERE stripe_customer_id IS NOT NULL OR stripe_subscription_id IS NOT NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_user_payment_info_updated_at
BEFORE UPDATE ON public.user_payment_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove Stripe columns from profiles (no longer needed there)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_subscription_id;