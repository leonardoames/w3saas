

# Adicionar link de guia na integração Shopify

## Mudança

Trocar o `docsUrl` da plataforma Shopify no arquivo `src/pages/Integracoes.tsx` de `https://shopify.dev/docs/api` para `https://integra-o-w3-app-142364288732.us-west1.run.app/`, que é o guia personalizado de integração.

## Arquivo

**`src/pages/Integracoes.tsx`** — linha 80, alterar:

```typescript
docsUrl: "https://shopify.dev/docs/api",
```

Para:

```typescript
docsUrl: "https://integra-o-w3-app-142364288732.us-west1.run.app/",
```

O botão "Docs" existente no card da Shopify passará a apontar para o guia personalizado. Posso também renomear o texto do botão de "Docs" para "Guia" se preferir.

