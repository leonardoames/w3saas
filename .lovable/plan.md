

## Entendendo sua Pergunta

Você quer criar um sistema onde possa alimentar a IA com seus próprios dados, regras e instruções (o que fazer e o que NÃO fazer), para que ela responda de forma personalizada ao seu negócio. Isso é chamado de **RAG (Retrieval-Augmented Generation)** com instruções customizáveis.

A boa notícia: **você já tem a infraestrutura base para isso**. O projeto já possui:
- **Cérebro da IA** (`/app/ia-brain`): upload de documentos que viram contexto para a IA W3
- **IA W3** (`/app/ia-w3`): chat que já consome esses documentos como base de conhecimento

O que falta é dar mais controle ao administrador sobre as **regras de comportamento** (instruções, do's e don'ts).

---

## Plano: Sistema de Instruções Customizáveis para a IA

### 1. Criar tabela `ia_instructions` no banco

Uma tabela para armazenar regras/instruções que o admin define:

```sql
CREATE TABLE public.ia_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  instruction_type TEXT NOT NULL CHECK (instruction_type IN ('do', 'dont', 'context', 'persona')),
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

- `do` = o que a IA DEVE fazer
- `dont` = o que a IA NÃO DEVE fazer
- `context` = informações de contexto sobre o negócio
- `persona` = regras de personalidade/tom

### 2. Criar página de gerenciamento de instruções (admin)

Nova página `/app/ia-brain/instrucoes` acessível pelo admin, com:
- Lista de instruções ativas agrupadas por tipo (Fazer / Não Fazer / Contexto / Persona)
- Formulário para adicionar/editar instruções com campos: título, tipo, conteúdo
- Toggle para ativar/desativar cada instrução
- Ordenação por prioridade (drag ou input numérico)

### 3. Integrar instruções na Edge Function `ia-w3`

Na edge function, além de buscar documentos do cérebro, buscar as instruções ativas e injetá-las no system prompt:

```text
=== REGRAS DO NEGÓCIO ===
FAÇA:
- [instrução 1]
- [instrução 2]

NÃO FAÇA:
- [instrução 1]
- [instrução 2]

CONTEXTO DO NEGÓCIO:
- [info 1]
=== FIM DAS REGRAS ===
```

### 4. Melhorar a página Cérebro da IA

Adicionar uma aba ou seção na página existente `/app/ia-brain` com dois painéis:
- **Documentos** (já existe): upload de PDFs, planilhas etc.
- **Instruções** (novo): gerenciamento de regras do/don't

---

## Sobre "Machine Learning próprio"

Importante esclarecer: o que estamos criando **não é um modelo de ML treinado do zero** (isso exigiria infraestrutura de GPU, milhares de dados e semanas de treino). O que fazemos é **personalizar um modelo existente** (GPT/Gemini) com:

1. **Seus documentos** como base de conhecimento (RAG) -- já funciona
2. **Suas regras** como instruções de sistema (novo) -- o que vamos adicionar

Isso é a abordagem mais prática e eficiente para ter uma IA "sua", com o comportamento que você define.

---

## Resumo de Arquivos

| Mudança | Arquivo |
|---------|---------|
| Nova tabela + RLS | Migration SQL |
| Página de instruções | `src/pages/IABrain.tsx` (nova aba) |
| Componente de gerenciamento | `src/components/ia-brain/InstructionsManager.tsx` (novo) |
| Injetar instruções no prompt | `supabase/functions/ia-w3/index.ts` |

