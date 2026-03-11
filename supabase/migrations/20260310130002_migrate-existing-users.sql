-- Migrate existing users to the new role system
-- is_mentorado = true  → grant cliente_ames + cliente_w3
-- is_w3_client = true  → grant cliente_w3 (if not already)
-- plan_type = 'paid'   → grant cliente_w3 (if not already)

INSERT INTO user_roles (user_id, role)
SELECT p.user_id, 'cliente_w3'::app_role
FROM profiles p
WHERE p.is_w3_client = true OR p.is_mentorado = true OR p.plan_type = 'paid'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT p.user_id, 'cliente_ames'::app_role
FROM profiles p
WHERE p.is_mentorado = true
ON CONFLICT DO NOTHING;
