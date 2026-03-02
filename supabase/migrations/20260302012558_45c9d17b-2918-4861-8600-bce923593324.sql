
ALTER TABLE public.mentoria_products 
ADD COLUMN IF NOT EXISTS tagline text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS button_text text DEFAULT 'Falar com Especialista';
