

## Plano: Preview visual + botão "Ver Código" para respostas HTML/CSS da IA W3

### O que muda

Quando a IA retorna conteúdo HTML (especialmente nos modos Copy Site e Marketplace), a mensagem do assistente terá duas abas:

1. **Preview** -- renderiza o HTML+CSS em um iframe isolado (para que os estilos w3- não vazem para o app)
2. **Código** -- mostra o HTML bruto em um bloco `<pre><code>` com botão de copiar

### Detecção

Uma função `hasHtmlContent(content)` verifica se a resposta contém tags como `<style>`, `<div class="w3-`, ou `<table` -- indicando conteúdo visual gerado. Se não tiver, renderiza normalmente como hoje (prose com dangerouslySetInnerHTML).

### Implementação

**Arquivo:** `src/pages/IAW3.tsx`

1. Adicionar estado `previewModes: Record<number, 'preview' | 'code'>` para controlar aba por mensagem
2. Criar função `hasHtmlContent(html: string): boolean`
3. Para mensagens com HTML detectado:
   - Renderizar duas abas (Preview / Código) usando botões toggle
   - **Preview**: usar um `<iframe srcDoc={...}>` com sandbox para isolar CSS. O iframe recebe o HTML completo com `<style>` e renderiza visualmente sem interferir no app
   - **Código**: `<pre>` com o HTML bruto (com syntax highlighting básico via escape) e botão de copiar o código fonte
4. Para mensagens sem HTML: manter renderização atual (prose + dangerouslySetInnerHTML)
5. Adicionar ícone `Eye` e `Code` do lucide-react nos botões de toggle
6. O botão "Copiar" existente no hover copia o código-fonte HTML quando na aba código

### Componente visual (dentro do bubble da mensagem)

```text
┌─────────────────────────────────────────┐
│ [👁 Preview]  [</> Código]              │
├─────────────────────────────────────────┤
│                                         │
│   (iframe com HTML renderizado)         │
│   ou                                    │
│   (bloco <pre> com código fonte)        │
│                                         │
└─────────────────────────────────────────┘
```

### Resumo de edições

| Arquivo | Mudança |
|---|---|
| `src/pages/IAW3.tsx` | Adicionar detecção de HTML, toggle preview/código com iframe isolado, e bloco de código com botão copiar |

