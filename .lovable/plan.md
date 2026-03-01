

## Plano: Criar Edge Function `sync-shopee`

### Problema

O erro "Failed to send a request to the Edge Function" ocorre porque a função `sync-shopee` não existe. O frontend chama `supabase.functions.invoke("sync-shopee")` ao clicar em "Sincronizar", mas essa função nunca foi criada.

### Solução

Criar a Edge Function `sync-shopee` seguindo o mesmo padrão read-only das outras integrações (nuvemshop, shopify, olist_tiny).

### Detalhes técnicos

A Shopee API exige assinatura HMAC-SHA256 em todas as requisições. O fluxo será:

1. Autenticar o usuário via JWT
2. Buscar credenciais (access_token, shop_id) da tabela `user_integrations`
3. Chamar `GET /api/v2/order/get_order_list` (somente leitura) para os últimos 90 dias
4. Para cada lote, chamar `GET /api/v2/order/get_order_detail` para obter valores
5. Agregar por dia e salvar na tabela `metrics_diarias` com `platform: "shopee"`
6. Atualizar `last_sync_at` na integração

Todas as chamadas são **GET** (read-only) — nenhuma alteração é feita na conta Shopee.

### Edições

| Arquivo | Mudança |
|---|---|
| `supabase/functions/sync-shopee/index.ts` | Nova Edge Function com paginação, HMAC sign, rate limiting e upsert em `metrics_diarias` |
| `supabase/config.toml` | Já tem `shopee-oauth`, precisa adicionar `[functions.sync-shopee]` com `verify_jwt = false` (config.toml é automático, será adicionado pela plataforma ao criar a função) |

