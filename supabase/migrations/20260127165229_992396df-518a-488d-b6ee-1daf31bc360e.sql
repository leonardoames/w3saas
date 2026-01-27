-- Função para admin criar usuário (retorna erro pois precisa usar auth.admin API)
-- Não é possível criar usuários via RPC normal, mas podemos criar uma função para deletar

-- Função segura para admin deletar usuário (apenas remove o profile, o auth.user permanece)
-- NOTA: Deletar usuário do auth.users requer service_role key, então vamos apenas desativar
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verifica se quem está chamando é admin
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem deletar usuários';
  END IF;
  
  -- Não permitir deletar a si mesmo
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode deletar seu próprio usuário';
  END IF;
  
  -- Deleta o profile (cascade vai limpar relacionamentos)
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  
  -- Remove roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
END;
$$;

-- Função para admin atualizar nome do usuário
CREATE OR REPLACE FUNCTION public.admin_update_user_name(target_user_id uuid, new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verifica se quem está chamando é admin
  IF NOT public.is_admin_user(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem editar usuários';
  END IF;
  
  -- Valida nome
  IF new_name IS NULL OR trim(new_name) = '' THEN
    RAISE EXCEPTION 'Nome não pode estar vazio';
  END IF;
  
  -- Atualiza o nome
  UPDATE public.profiles 
  SET full_name = trim(new_name)
  WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
END;
$$;

-- Adiciona política para permitir delete de profiles por admin
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (is_admin_user(auth.uid()));