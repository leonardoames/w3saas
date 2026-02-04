-- Drop existing policies
DROP POLICY IF EXISTS "users_select_own_documents" ON public.ia_documents;
DROP POLICY IF EXISTS "users_insert_own_documents" ON public.ia_documents;
DROP POLICY IF EXISTS "users_update_own_documents" ON public.ia_documents;
DROP POLICY IF EXISTS "users_delete_own_documents" ON public.ia_documents;

-- Create new policies: Admins can manage, all authenticated users can read
CREATE POLICY "admins_manage_documents" ON public.ia_documents
FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "users_can_read_documents" ON public.ia_documents
FOR SELECT USING (auth.uid() IS NOT NULL);