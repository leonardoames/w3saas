
-- Enums for ideas
CREATE TYPE public.idea_type AS ENUM ('criativo_pago', 'organico', 'ambos');
CREATE TYPE public.idea_format AS ENUM ('video_curto', 'carrossel', 'imagem_estatica', 'post_blog', 'stories', 'influenciador', 'video_longo');
CREATE TYPE public.idea_channel AS ENUM ('instagram', 'tiktok', 'youtube', 'facebook', 'google', 'outro');
CREATE TYPE public.idea_objective AS ENUM ('vendas_normal', 'acao_promocional', 'liveshop', 'branding', 'remarketing');
CREATE TYPE public.idea_priority AS ENUM ('alta', 'media', 'baixa');
CREATE TYPE public.idea_status AS ENUM ('ideia', 'em_producao', 'aprovacao', 'agendado', 'publicado', 'arquivado');

-- Ideas table
CREATE TABLE public.ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  type idea_type NOT NULL,
  format idea_format NOT NULL,
  channel idea_channel NOT NULL,
  objective idea_objective NOT NULL,
  hook TEXT,
  description TEXT,
  reference_url TEXT,
  responsible TEXT,
  priority idea_priority NOT NULL DEFAULT 'media',
  potential_score INTEGER DEFAULT 3 CHECK (potential_score >= 1 AND potential_score <= 5),
  status idea_status NOT NULL DEFAULT 'ideia',
  published_url TEXT,
  due_date DATE,
  publish_date DATE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idea responsibles table
CREATE TABLE public.idea_responsibles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_responsibles ENABLE ROW LEVEL SECURITY;

-- RLS policies for ideas
CREATE POLICY "Users can view own ideas" ON public.ideas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ideas" ON public.ideas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ideas" ON public.ideas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ideas" ON public.ideas FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for idea_responsibles
CREATE POLICY "Users can view own responsibles" ON public.idea_responsibles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own responsibles" ON public.idea_responsibles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own responsibles" ON public.idea_responsibles FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger for ideas
CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
