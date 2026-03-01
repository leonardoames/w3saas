

## Plano: Integração OAuth Shopee (fluxo profissional multi-usuário)

### Arquitetura

O fluxo segue o mesmo padrão já implementado para Shopify: Edge Function gera a URL assinada no backend, o usuário é redirecionado para a Shopee, e uma página de callback troca o `code` pelo `access_token`.

```text
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Frontend   │────→│  Edge Function       │────→│  Shopee API     │
│  Botão      │     │  shopee-oauth        │     │  auth_partner   │
│  Conectar   │     │  (HMAC-SHA256 sign)  │     │                 │
└─────────────┘     └──────────────────────┘     └────────┬────────┘
                                                          │ redirect
                    ┌──────────────────────┐     ┌────────▼────────┐
                    │  Edge Function       │←────│  Callback Page  │
                    │  shopee-oauth?cb     │     │  /shopee/cb     │
                    │  (token exchange)    │     └─────────────────┘
                    └──────────────────────┘
```

### Credenciais

As chaves **Partner ID** e **Partner Key** (Live) serão armazenadas como secrets do backend — o lojista **não** precisa fornecê-las. Ele apenas clica "Conectar" e autoriza na Shopee.

- `SHOPEE_PARTNER_ID` = `2030510`
- `SHOPEE_PARTNER_KEY` = `shpk6f42506e76625259655a534154534e546741526f51676e6c465565446874`

### Edições

| Arquivo | Mudança |
|---|---|
| **Secrets** | Adicionar `SHOPEE_PARTNER_ID` e `SHOPEE_PARTNER_KEY` |
| **`supabase/functions/shopee-oauth/index.ts`** | Nova Edge Function: action=`authorize` (gera HMAC-SHA256 sign + URL) e action=`callback` (troca code por access_token via `/api/v2/auth/token/get`) |
| **`supabase/config.toml`** | Adicionar `[functions.shopee-oauth]` com `verify_jwt = false` |
| **`src/pages/ShopeeCallback.tsx`** | Nova página de callback (mesmo padrão do ShopifyCallback) |
| **`src/App.tsx`** | Adicionar rota `/app/integracoes/shopee/callback` |
| **`src/pages/Integracoes.tsx`** | Mudar Shopee para `oauth: true`, remover campos manuais, e adaptar `handleConnect` para invocar `shopee-oauth?action=authorize` |

### Detalhes da Edge Function `shopee-oauth`

**action=authorize:**
1. Valida JWT do usuário
2. Calcula `timestamp` = `Math.floor(Date.now() / 1000)`
3. `baseString` = `partnerId + apiPath + timestamp`
4. `sign` = HMAC-SHA256(`partnerKey`, `baseString`).hex()
5. Monta URL: `https://partner.shopeemobile.com/api/v2/shop/auth_partner?partner_id=...&timestamp=...&sign=...&redirect=...`
6. Salva `user_id` + `nonce` no state (base64)
7. Upsert `user_integrations` com `sync_status: "pending_oauth"`
8. Retorna `{ auth_url }` para o frontend redirecionar

**action=callback:**
1. Recebe `code`, `shop_id`, `state` do frontend
2. Decodifica state para obter `user_id`
3. Calcula nova assinatura para `/api/v2/auth/token/get`
4. POST para Shopee com `code`, `shop_id`, `partner_id`
5. Recebe `access_token` + `refresh_token`
6. Salva tokens em `user_integrations`, marca `is_active: true`, `sync_status: "connected"`

### Mudança no Frontend (Integracoes.tsx)

A Shopee passa de formulário manual para OAuth com um clique:
- `oauth: true` na definição da plataforma
- `fields: []` (sem campos para o lojista preencher)
- No `handleConnect`, quando `platform.id === "shopee"`, invoca `shopee-oauth?action=authorize` e redireciona para a `auth_url` retornada

### Redirect URL para cadastrar na Shopee

`https://app.leonardoames.com.br/app/integracoes/shopee/callback`

Esta URL precisa ser registrada no console da Shopee Open Platform como Auth Redirect URL.

