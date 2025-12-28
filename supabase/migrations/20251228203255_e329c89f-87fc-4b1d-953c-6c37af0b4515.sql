-- Add new columns to influenciadores table
ALTER TABLE public.influenciadores 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'em_aberto' CHECK (status IN ('em_aberto', 'ganho', 'perdido'));