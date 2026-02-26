
CREATE TABLE public.mentoria_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  details_url TEXT,
  whatsapp_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mentoria_products ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can view products"
  ON public.mentoria_products FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage products"
  ON public.mentoria_products FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_mentoria_products_updated_at
  BEFORE UPDATE ON public.mentoria_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
