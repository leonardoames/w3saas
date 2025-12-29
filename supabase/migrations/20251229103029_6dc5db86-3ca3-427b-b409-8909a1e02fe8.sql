-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('a_fazer', 'em_andamento', 'concluida', 'cancelada');

-- Create enum for task origin
CREATE TYPE public.task_origin AS ENUM ('sistema', 'admin', 'mentorado');

-- Create tasks table
CREATE TABLE public.tarefas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('Baixa', 'Média', 'Alta')),
  due_date DATE,
  status task_status NOT NULL DEFAULT 'a_fazer',
  origin task_origin NOT NULL DEFAULT 'sistema',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tasks
CREATE POLICY "Users can view own tasks"
ON public.tarefas
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Policy: Users can insert their own tasks (only mentorado origin)
CREATE POLICY "Users can insert own tasks"
ON public.tarefas
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id AND origin = 'mentorado') 
  OR public.is_admin(auth.uid())
);

-- Policy: Users can update their own tasks
CREATE POLICY "Users can update own tasks"
ON public.tarefas
FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Policy: Users can delete their own mentorado tasks, admin can delete any
CREATE POLICY "Users can delete own mentorado tasks"
ON public.tarefas
FOR DELETE
USING (
  (auth.uid() = user_id AND origin = 'mentorado') 
  OR public.is_admin(auth.uid())
);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_tarefas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tarefas_updated_at
BEFORE UPDATE ON public.tarefas
FOR EACH ROW
EXECUTE FUNCTION public.update_tarefas_updated_at();

-- Create function to seed default tasks for new users
CREATE OR REPLACE FUNCTION public.seed_default_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Fundação & Estrutura
  INSERT INTO public.tarefas (user_id, section, title, description, origin, order_index) VALUES
  (NEW.id, 'Fundação & Estrutura', 'Configurar Google Analytics 4', 'Instalar o código de rastreamento GA4 no site e configurar as metas principais de conversão', 'sistema', 1),
  (NEW.id, 'Fundação & Estrutura', 'Configurar eventos de conversão', 'Definir e implementar eventos de compra, add-to-cart e visualização de produto', 'sistema', 2);

  -- Logística & Operação
  INSERT INTO public.tarefas (user_id, section, title, description, origin, order_index) VALUES
  (NEW.id, 'Logística & Operação', 'Revisar prazos de entrega', 'Avaliar e otimizar tempos de processamento e envio dos pedidos', 'sistema', 1),
  (NEW.id, 'Logística & Operação', 'Definir política de trocas e devoluções', 'Criar política clara e acessível para clientes', 'sistema', 2);

  -- ERP & Integrações
  INSERT INTO public.tarefas (user_id, section, title, description, origin, order_index) VALUES
  (NEW.id, 'ERP & Integrações', 'Integrar sistema ERP', 'Conectar ERP com a loja para sincronização de estoque e pedidos', 'sistema', 1),
  (NEW.id, 'ERP & Integrações', 'Validar sincronização de estoque', 'Testar e garantir que o estoque está atualizado em tempo real', 'sistema', 2);

  -- Financeiro
  INSERT INTO public.tarefas (user_id, section, title, description, origin, order_index) VALUES
  (NEW.id, 'Financeiro', 'Calcular margem por produto', 'Analisar custos e definir margens de lucro ideais por categoria', 'sistema', 1),
  (NEW.id, 'Financeiro', 'Definir preço mínimo de venda', 'Estabelecer floor price considerando todos os custos operacionais', 'sistema', 2);

  -- Contábil & Fiscal
  INSERT INTO public.tarefas (user_id, section, title, description, origin, order_index) VALUES
  (NEW.id, 'Contábil & Fiscal', 'Validar regime tributário', 'Confirmar enquadramento fiscal adequado com contador', 'sistema', 1),
  (NEW.id, 'Contábil & Fiscal', 'Revisar impostos por categoria', 'Mapear NCM e alíquotas corretas para cada tipo de produto', 'sistema', 2);

  -- Marketing & Oferta
  INSERT INTO public.tarefas (user_id, section, title, description, origin, order_index) VALUES
  (NEW.id, 'Marketing & Oferta', 'Revisar proposta de valor', 'Definir claramente o diferencial competitivo da marca', 'sistema', 1),
  (NEW.id, 'Marketing & Oferta', 'Ajustar copy das páginas de produto', 'Melhorar descrições focando em benefícios e SEO', 'sistema', 2);

  -- Canais de Aquisição
  INSERT INTO public.tarefas (user_id, section, title, description, origin, order_index) VALUES
  (NEW.id, 'Canais de Aquisição', 'Mapear canais de aquisição atuais', 'Identificar todas as fontes de tráfego e sua performance', 'sistema', 1),
  (NEW.id, 'Canais de Aquisição', 'Definir CAC alvo por canal', 'Estabelecer custo de aquisição máximo aceitável por canal', 'sistema', 2);

  -- Tráfego Pago
  INSERT INTO public.tarefas (user_id, section, title, description, origin, order_index) VALUES
  (NEW.id, 'Tráfego Pago', 'Criar campanhas de remarketing', 'Configurar audiências no Meta Ads para visitantes que não compraram', 'sistema', 1),
  (NEW.id, 'Tráfego Pago', 'Estruturar criativos por produto', 'Desenvolver assets visuais segmentados por categoria', 'sistema', 2);

  -- Marketplaces
  INSERT INTO public.tarefas (user_id, section, title, description, origin, order_index) VALUES
  (NEW.id, 'Marketplaces', 'Otimizar títulos de anúncios', 'Melhorar títulos com palavras-chave relevantes para busca', 'sistema', 1),
  (NEW.id, 'Marketplaces', 'Revisar precificação para marketplace', 'Ajustar preços considerando taxas e comissões das plataformas', 'sistema', 2);

  -- Escala & Otimização
  INSERT INTO public.tarefas (user_id, section, title, description, origin, order_index) VALUES
  (NEW.id, 'Escala & Otimização', 'Testar estratégias de ticket médio', 'Implementar upsell, cross-sell e kits para aumentar AOV', 'sistema', 1),
  (NEW.id, 'Escala & Otimização', 'Planejar ações sazonais', 'Criar calendário de campanhas para datas comerciais importantes', 'sistema', 2);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to seed tasks for new users
CREATE TRIGGER on_auth_user_created_seed_tasks
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_tasks();