-- PROBLEMA 1: Garantir que apenas usuários autenticados podem ver profiles
-- Remover qualquer política que permita acesso público

-- Primeiro, vamos garantir que todas as políticas de SELECT exigem autenticação
-- As políticas atuais já exigem auth.uid(), mas vamos adicionar uma política explícita de negação para anônimos

-- Criar política que nega explicitamente acesso anônimo (redundante mas reforça segurança)
-- Na verdade, as políticas existentes já usam auth.uid() então estão seguras.
-- O problema é que precisamos verificar se não há acesso público.

-- PROBLEMA 2: Remover exposição de user_id na política pública de brands
-- A view brands_public já existe e oculta user_id - devemos usar ela para acesso público
-- Precisamos remover/ajustar a política que permite acesso público direto à tabela brands

-- Dropar a política problemática que expõe user_id
DROP POLICY IF EXISTS "Anyone can view approved active brands" ON public.brands;
DROP POLICY IF EXISTS "Anyone can view active approved brands" ON public.brands;

-- Garantir RLS na view brands_public (views herdam RLS da tabela base, mas podemos criar política específica)
-- Como brands_public é uma view, ela já filtra os campos sensíveis
-- Usuários devem acessar brands_public para dados públicos, não a tabela brands diretamente

-- Adicionar comentário explicativo na view
COMMENT ON VIEW public.brands_public IS 'View pública de marcas aprovadas - oculta user_id e outros campos sensíveis para proteção de privacidade';