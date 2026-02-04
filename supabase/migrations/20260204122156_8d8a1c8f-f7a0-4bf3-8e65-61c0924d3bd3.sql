-- Tabela para armazenar documentos do Cérebro IA
CREATE TABLE public.ia_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca por usuário
CREATE INDEX idx_ia_documents_user_id ON public.ia_documents(user_id);
CREATE INDEX idx_ia_documents_status ON public.ia_documents(status);

-- Enable RLS
ALTER TABLE public.ia_documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuários só veem/gerenciam seus próprios documentos
CREATE POLICY "users_select_own_documents" ON public.ia_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_documents" ON public.ia_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_documents" ON public.ia_documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_documents" ON public.ia_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ia_documents_updated_at
  BEFORE UPDATE ON public.ia_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket para documentos (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('iaw3-brain', 'iaw3-brain', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage: usuários só acessam seus próprios arquivos
CREATE POLICY "users_upload_own_files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'iaw3-brain' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_read_own_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'iaw3-brain' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_delete_own_files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'iaw3-brain' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );