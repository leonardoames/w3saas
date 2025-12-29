
-- Migrar usuários existentes para profiles
INSERT INTO public.profiles (user_id, email, full_name, access_status, plan_type)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data ->> 'full_name', email),
  'active',
  'manual'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.user_id = auth.users.id
);

-- Atribuir role 'user' para todos os usuários existentes que não têm role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.users.id
);

-- Definir leo2@leonardoames.com.br como admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'leo2@leonardoames.com.br'
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.users.id AND role = 'admin'
);
