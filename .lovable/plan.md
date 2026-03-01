

## Plano: Incluir CSS no modo Copy Site da IA W3

O modo "Copy Site" (linhas 84-129 do `supabase/functions/ia-w3/index.ts`) já usa estilos inline (`style="..."`), mas o usuário quer que a IA também gere CSS mais completo -- com blocos `<style>`, animações, hover effects, media queries responsivas, etc.

### Alteração

**Arquivo:** `supabase/functions/ia-w3/index.ts` (linhas 84-129)

Atualizar o prompt do modo `copy-site` para:

1. Instruir a IA a gerar um bloco `<style>` no topo do HTML com classes reutilizáveis, animações (hover em botões, transições suaves), media queries para responsividade
2. Manter os estilos inline como fallback, mas priorizar classes CSS
3. Incluir no template de exemplo: animações de CTA, efeitos hover, tipografia responsiva, e transições
4. Adicionar `style` à lista de `ALLOWED_TAGS` no sanitizador DOMPurify do frontend (`src/pages/IAW3.tsx`, linha 144) para que o CSS não seja removido ao renderizar

### Resumo das edições

| Arquivo | O que muda |
|---|---|
| `supabase/functions/ia-w3/index.ts` | Prompt do `copy-site` reescrito para incluir `<style>` com classes CSS, animações, hover, responsividade |
| `src/pages/IAW3.tsx` | Adicionar `style` em `ALLOWED_TAGS` do DOMPurify |

