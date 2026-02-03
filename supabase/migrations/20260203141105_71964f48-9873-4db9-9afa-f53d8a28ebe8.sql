-- 1. Adicionar política que nega acesso a usuários anônimos na tabela profiles
CREATE POLICY "deny_anonymous_access" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Remover a política genérica "false" da tabela influenciador_contacts e adicionar políticas específicas por usuário
-- Primeiro, dropar a política existente
DROP POLICY IF EXISTS "No direct access to contacts" ON public.influenciador_contacts;

-- Criar políticas específicas para a tabela influenciador_contacts
-- Usuários só podem ver seus próprios contatos
CREATE POLICY "users_own_contacts_select" 
ON public.influenciador_contacts 
FOR SELECT 
USING (auth.uid() = user_id);

-- Usuários só podem inserir contatos para si mesmos
CREATE POLICY "users_own_contacts_insert" 
ON public.influenciador_contacts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Usuários só podem atualizar seus próprios contatos
CREATE POLICY "users_own_contacts_update" 
ON public.influenciador_contacts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Usuários só podem deletar seus próprios contatos
CREATE POLICY "users_own_contacts_delete" 
ON public.influenciador_contacts 
FOR DELETE 
USING (auth.uid() = user_id);