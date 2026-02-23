

# Shopify OAuth por Usuario - Cada usuario fornece suas proprias credenciais

## Problema

Apps criados no Shopify Partners como "Custom" so podem ser instalados em lojas do mesmo grupo/organizacao. Para permitir que qualquer loja se conecte, precisamos do fluxo OAuth -- mas com cada usuario fornecendo seu proprio **Client ID** e **Client Secret** (do app que ele criou no Shopify Partners).

## Como vai funcionar

1. O usuario clica em **"Conectar Shopify"** na pagina de Integracoes
2. Um dialog pede 3 campos: **Client ID**, **Client Secret** e **Dominio da loja** (ex: `minha-loja.myshopify.com`)
3. Esses dados sao salvos temporariamente e o usuario e redirecionado para a tela de autorizacao da Shopify
4. Apos autorizar, a Shopify redireciona de volta para o app com um `code`
5. Uma Edge Function troca o `code` pelo **Access Token** permanente usando o Client ID/Secret do usuario
6. O Access Token e salvo nas credenciais da integracao e a conexao fica ativa

## Mudancas tecnicas

### 1. Nova Edge Function: `shopify-oauth`

Duas rotas:

- **`/shopify-oauth?action=authorize`** (POST): Recebe `client_id`, `client_secret`, `shop_domain` e `user_id`. Salva client_id e client_secret nas credenciais do usuario (tabela `user_integrations`), gera um `state` com nonce + user_id, e retorna a URL de redirecionamento da Shopify com escopos `read_orders`.

- **`/shopify-oauth?action=callback`** (POST): Recebe `code`, `shop`, `state`. Extrai o `user_id` do state, busca as credenciais (client_id/client_secret) salvas na integracao do usuario, troca o code pelo access_token via POST para `https://{shop}/admin/oauth/access_token`, e salva o token permanente.

### 2. Nova pagina: `ShopifyCallback.tsx`

Pagina em `/app/integracoes/shopify/callback` que:
- Captura os query params `code`, `shop` e `state` da URL
- Chama a Edge Function com `action=callback`
- Mostra um spinner durante o processamento
- Redireciona para `/app/integracoes` com toast de sucesso/erro

### 3. Atualizacao: `App.tsx`

Adicionar rota `/app/integracoes/shopify/callback` apontando para `ShopifyCallback`.

### 4. Atualizacao: `Integracoes.tsx`

- Alterar os campos da Shopify de `access_token` + `store_url` para `client_id` + `client_secret` + `shop_domain`
- O botao "Conectar" da Shopify vai:
  1. Salvar client_id/client_secret via Edge Function
  2. Redirecionar o usuario para a URL de autorizacao da Shopify
- Apos conectado, os botoes "Sincronizar" e "Desconectar" continuam funcionando normalmente

### 5. Atualizacao: `sync-shopify/index.ts`

Sem mudancas -- a funcao ja le `access_token` e `store_url` das credenciais salvas, que serao preenchidas automaticamente pelo fluxo OAuth.

### 6. Redirect URI

A URL de callback configurada no Shopify Partners deve ser:
```
https://w3saas.lovable.app/app/integracoes/shopify/callback
```

### 7. Seguranca

- O `state` contem um nonce + `user_id` codificado em base64 para prevenir CSRF
- Client ID e Client Secret ficam armazenados por usuario na tabela `user_integrations` (campo `credentials` JSONB)
- A Edge Function usa service role para salvar o token permanente

