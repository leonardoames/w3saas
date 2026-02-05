-- Fix ia_documents: users should only see their own documents, not all authenticated users
DROP POLICY IF EXISTS "users_can_read_documents" ON public.ia_documents;

CREATE POLICY "users_can_read_own_documents" 
ON public.ia_documents 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Add INSERT policy for ia_documents so users can upload their own documents
DROP POLICY IF EXISTS "users_can_insert_documents" ON public.ia_documents;

CREATE POLICY "users_can_insert_own_documents"
ON public.ia_documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy for users to delete their own documents
DROP POLICY IF EXISTS "users_can_delete_documents" ON public.ia_documents;

CREATE POLICY "users_can_delete_own_documents"
ON public.ia_documents
FOR DELETE
USING (auth.uid() = user_id OR public.is_admin(auth.uid()));