

## Plano: Corrigir preview quebrado do HTML

### Problema

O preview está cortando o conteúdo (botões, elementos) porque:

1. **O container pai tem `max-w-[85%]` e `overflow` implícito** do `rounded-2xl` — a bolha de mensagem do assistente limita a largura e corta o conteúdo do iframe
2. **O iframe não tem `border:0`** — pode adicionar bordas extras indesejadas
3. **O `padding` do body do iframe (`16px`) pode estar cortando elementos** que usam `width:100%` com `box-sizing` incorreto

### Solução

**Arquivo:** `src/pages/IAW3.tsx` (linhas 252-258)

- Quando a mensagem contém HTML (renderiza `HtmlPreviewMessage`), remover o `max-w-[85%]` e usar `max-w-full w-full` para que o preview ocupe toda a largura disponível
- Remover o `px-4 py-3` padding da bolha para HTML, pois o componente já tem seu próprio layout

**Arquivo:** `src/components/ia-w3/HtmlPreviewMessage.tsx` (linha 30)

- Adicionar `box-sizing:border-box; overflow-x:hidden;` ao estilo base do body do iframe e `*{box-sizing:border-box;}` para garantir que todos os elementos respeitem a largura
- Adicionar `border:0` ao iframe para evitar bordas extras

### Edições

| Arquivo | Mudança |
|---|---|
| `src/pages/IAW3.tsx` | Condicionar classes da bolha: se for HTML, usar `w-full max-w-full p-0` em vez de `max-w-[85%] px-4 py-3` |
| `src/components/ia-w3/HtmlPreviewMessage.tsx` | Adicionar `*{box-sizing:border-box}` e `overflow-x:hidden` no CSS base do iframe; adicionar `border:0` e `style={{border:'none'}}` no elemento iframe |

