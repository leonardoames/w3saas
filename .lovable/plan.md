

## Diagnóstico

O menu dropdown dos 3 pontos **não aparece** porque está preso dentro de um container com `overflow-x-auto` (linha 487). Em CSS, quando `overflow` é definido como `auto`/`hidden` em qualquer eixo, o browser força o outro eixo a também clipar conteúdo. Isso faz o dropdown ser cortado/invisível mesmo com `z-index` alto.

## Solução

1. **Remover `overflow-y-visible`** do container da tabela (não funciona junto com `overflow-x-auto`)
2. **Usar `DropdownMenu` com `modal={false}` + portal** — já está `modal={false}`, mas o conteúdo precisa ser renderizado via portal (fora do container com overflow). Adicionar `forceMount` ou mover para fora do overflow container
3. **Alternativa mais simples**: Remover `overflow-x-auto` do wrapper da tabela e usar `min-w-full` na tabela, ou usar CSS `position: fixed` no dropdown via `container` prop

**Abordagem recomendada**: Adicionar `container={document.body}` (ou equivalente Radix `portal`) ao `DropdownMenuContent` para que o menu seja renderizado no body, escapando do overflow clipping. No Radix/shadcn, o `DropdownMenuContent` já usa portal por padrão, mas o `modal={false}` pode estar desabilitando isso. A solução é remover `modal={false}` ou garantir que o portal funcione.

### Passos de implementação

1. **`src/pages/admin/AdminUsers.tsx`**: Remover `modal={false}` do `<DropdownMenu>` (linha 528) para que o Radix use portal padrão e o dropdown escape do overflow container
2. Se necessário, ajustar o `overflow` do container da tabela para não clipar

