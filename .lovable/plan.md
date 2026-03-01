

## Diagnóstico: Dados incorretos na sincronização Shopee

### Problemas identificados no código atual

1. **Faturamento zerado/incorreto**: O `get_order_detail` só retorna `total_amount` se for solicitado em `response_optional_fields`. O código atual só pede `order_status`, então `order.total_amount` retorna `undefined` → `parseFloat("0")` → zero.

2. **Data dos pedidos incorreta**: O código usa `create_time` (quando o pedido foi criado), mas para faturamento o correto é usar `pay_time` (quando o pagamento foi confirmado).

3. **Sessões incorretas**: A API de pedidos da Shopee não fornece dados de visitas/sessões. O campo `sessoes` não deveria ser preenchido por esta função.

4. **ROAS**: O ROAS depende de dados de investimento (Shopee Ads API, endpoint separado). A API de pedidos não fornece isso — o campo `investimento_trafego` deve ficar zerado.

### Solução

Corrigir a Edge Function `sync-shopee` com as seguintes mudanças:

| Problema | Correção |
|---|---|
| `response_optional_fields` incompleto | Solicitar `total_amount,pay_time,escrow_amount,buyer_total_amount` |
| Data errada | Usar `pay_time` (data do pagamento) em vez de `create_time` |
| Sessões inventadas | Não preencher `sessoes` (deixar 0) |
| Faturamento | Usar `escrow_amount` (valor líquido que o vendedor recebe) como faturamento principal, com fallback para `total_amount` |

### Arquivo editado

`supabase/functions/sync-shopee/index.ts` — atualizar `response_optional_fields`, lógica de data e campo de valor.

