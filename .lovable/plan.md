

# Corrigir Redirect URI do Shopify OAuth

## Problema

O erro `invalid_request: The redirect_uri is not whitelisted` significa que a URL de callback enviada ao Shopify nao esta cadastrada nas configuracoes do app no Shopify Partners.

## Causa raiz

A Edge Function `shopify-oauth` esta usando a URL fixa:
```
https://w3saas.lovable.app/app/integracoes/shopify/callback
```

Porem o dominio primario do projeto e `app.leonardoames.com.br`, e o Shopify pode estar esperando esse dominio ou vice-versa.

## Solucao

### Passo 1 - Configuracao no Shopify Partners (feito por voce)

No painel do Shopify Partners, nas configuracoes do seu app, adicione **ambas** as URLs na lista de "Allowed redirection URL(s)":

```
https://w3saas.lovable.app/app/integracoes/shopify/callback
https://app.leonardoames.com.br/app/integracoes/shopify/callback
```

### Passo 2 - Atualizar a Edge Function para usar o dominio correto

Vou atualizar a Edge Function `shopify-oauth/index.ts` para usar `app.leonardoames.com.br` como redirect URI, ja que este e o dominio primario do projeto.

**Arquivo:** `supabase/functions/shopify-oauth/index.ts`

Alterar a linha:
```typescript
const REDIRECT_URI = "https://w3saas.lovable.app/app/integracoes/shopify/callback";
```
Para:
```typescript
const REDIRECT_URI = "https://app.leonardoames.com.br/app/integracoes/shopify/callback";
```

### Resumo

- Uma unica linha de codigo precisa mudar na Edge Function
- Voce precisa garantir que a URL correta esteja cadastrada no Shopify Partners
- Recomendo cadastrar ambos os dominios no Shopify Partners para evitar problemas futuros

