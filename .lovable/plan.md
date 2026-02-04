
# Plano: Cérebro da IA W3 - Base de Conhecimento com Documentos

## Visao Geral

Vamos criar um sistema de **Knowledge Base (Base de Conhecimento)** para a IA W3, onde voce podera fazer upload de documentos (PDF, DOCX, TXT, etc.) que a IA consultara para responder perguntas de forma mais precisa e personalizada.

## Arquitetura do Sistema

```text
+-------------------+     +------------------+     +-------------------+
|   Interface Web   | --> |  Storage Bucket  | --> |  Tabela Database  |
|  (Upload de Docs) |     |  (iaw3-brain)    |     |  (ia_documents)   |
+-------------------+     +------------------+     +-------------------+
         |                                                   |
         v                                                   v
+-------------------+     +------------------+     +-------------------+
|   Edge Function   | <-- |  Processar Docs  | <-- |  Busca Semantica  |
|   (ia-w3 update)  |     |  (extrair texto) |     |  (embeddings)     |
+-------------------+     +------------------+     +-------------------+
```

## O Que Sera Criado

### 1. Estrutura de Banco de Dados

**Nova tabela: `ia_documents`**
- `id` - Identificador unico
- `user_id` - Dono do documento
- `file_name` - Nome original do arquivo
- `file_path` - Caminho no storage
- `file_type` - Tipo do arquivo (pdf, docx, txt, etc.)
- `file_size` - Tamanho em bytes
- `content_text` - Texto extraido do documento
- `status` - Status do processamento (pending, processing, ready, error)
- `created_at` / `updated_at` - Timestamps

### 2. Storage Bucket

**Novo bucket: `iaw3-brain`**
- Armazenamento privado para documentos
- Organizado por `user_id/documento.ext`
- Limite de 10MB por arquivo

### 3. Interface de Gerenciamento

**Nova pagina: Cerebro IA (`/app/ia-w3/cerebro`)**
- Lista de documentos enviados
- Upload de novos documentos (arrastar e soltar)
- Status de processamento
- Opcao de remover documentos
- Visualizacao do conteudo extraido

### 4. Edge Function para Processamento

**Nova funcao: `process-ia-document`**
- Recebe o documento do storage
- Extrai texto (PDF, DOCX, TXT)
- Armazena o conteudo na tabela
- Atualiza status para "ready"

### 5. Integracao com IA W3

**Atualizacao da `ia-w3` function:**
- Consulta documentos do usuario antes de responder
- Inclui contexto relevante dos documentos no prompt
- Indica quando usa informacoes da base de conhecimento

## Fluxo do Usuario

1. Usuario acessa "Cerebro IA" no menu
2. Faz upload de um documento (PDF, DOCX, TXT)
3. Sistema armazena no bucket e cria registro no banco
4. Background task processa e extrai texto
5. Documento fica disponivel para consulta
6. Ao usar IA W3, ela consulta os documentos relevantes

## Formatos Suportados

| Formato | Extensao | Observacao |
|---------|----------|------------|
| PDF     | .pdf     | Texto extraivel (nao imagens) |
| Word    | .docx    | Microsoft Word 2007+ |
| Texto   | .txt     | Texto puro |
| Markdown| .md      | Documentacao tecnica |

---

## Detalhes Tecnicos

### Tabela SQL

```sql
CREATE TABLE public.ia_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- RLS: usuarios so veem seus proprios documentos
CREATE POLICY "users_own_documents" ON public.ia_documents
  FOR ALL USING (auth.uid() = user_id);
```

### Componentes React

- `IABrainPage.tsx` - Pagina principal do Cerebro
- `DocumentUploader.tsx` - Componente de upload
- `DocumentList.tsx` - Lista de documentos
- `DocumentCard.tsx` - Card individual com status

### Rotas

- `/app/ia-w3/cerebro` - Gerenciamento de documentos
- Menu lateral atualizado com link para "Cerebro IA"

### Edge Functions

- `process-ia-document` - Processa documentos em background
- `ia-w3` (atualizada) - Consulta documentos antes de responder

## Limites e Restricoes

| Recurso | Limite |
|---------|--------|
| Tamanho por arquivo | 10 MB |
| Documentos por usuario | 50 |
| Tipos permitidos | PDF, DOCX, TXT, MD |

## Proximos Passos (Futuros)

- Busca semantica com embeddings (OpenAI/Gemini)
- Categorias/tags para documentos
- Compartilhamento de documentos entre usuarios
- Versioning de documentos
