

## Plano: Preview maior com simulação de tela mobile

### O que muda

**Arquivo:** `src/components/ia-w3/HtmlPreviewMessage.tsx`

1. Aumentar altura do iframe de `min-h-[400px]` para `min-h-[700px]`
2. Adicionar toggle de viewport: **Desktop** (100% largura) e **Mobile** (375px centralizado, com borda de "device frame")
3. No modo mobile, o iframe terá `width: 375px` e `max-height: 812px` (simulando iPhone), centralizado com uma borda arredondada estilo device frame
4. Adicionar ícones `Monitor` e `Smartphone` do lucide-react nos botões de toggle

### Visual

```text
┌──────────────────────────────────────────────┐
│ [👁 Preview] [</> Código]   [🖥 Desktop] [📱 Mobile]   [Copiar] │
├──────────────────────────────────────────────┤
│                                              │
│   Desktop: iframe 100% width, 700px height   │
│   Mobile:  iframe 375px centered, device frame│
│                                              │
└──────────────────────────────────────────────┘
```

### Edição

| Arquivo | Mudança |
|---|---|
| `src/components/ia-w3/HtmlPreviewMessage.tsx` | Adicionar estado `device`, toggle Desktop/Mobile, iframe maior, simulação de tela mobile com 375px centralizado |

