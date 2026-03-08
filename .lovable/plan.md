

## Integration Audit & Fixes

### Current Status of All Integrations

| Integration | OAuth | Sync Function | Config.toml | Status |
|---|---|---|---|---|
| Nuvemshop | No (manual tokens) | `sync-nuvemshop` | Present | Working |
| Shopee (Vendas) | `shopee-oauth` | `sync-shopee` | **MISSING both** | Broken (JWT gate blocks callback) |
| Shopee ADS | `shopee-ads-oauth` | `sync-shopee-ads` | **MISSING both** | Broken (JWT gate blocks callback) |
| Shopify | `shopify-oauth` | `sync-shopify` | `shopify-oauth` present, `sync-shopify` present | Working |
| Olist Tiny | No (manual token) | `sync-olist_tiny` | Present | Working |
| Mercado Livre | No (manual tokens) | **No sync function** | N/A | UI-only (no sync) |
| Tray | No (manual tokens) | **No sync function** | N/A | UI-only (no sync) |
| Loja Integrada | No (manual tokens) | **No sync function** | N/A | UI-only (no sync) |

### Issues Found

**1. Critical: Missing `config.toml` entries**
Four edge functions are missing `verify_jwt = false`:
- `sync-shopee` — handles its own auth but gateway blocks without config
- `sync-shopee-ads` — same issue
- `shopee-oauth` — the `callback` action receives redirects from Shopee with no JWT; gateway will reject
- `shopee-ads-oauth` — same issue

These functions all handle authentication internally. Without `verify_jwt = false`, the Supabase gateway enforces JWT validation before the function even runs, causing the OAuth callback flow and manual sync triggers to potentially fail.

**Fix:** Add four entries to `supabase/config.toml`:
```toml
[functions.sync-shopee]
verify_jwt = false

[functions.sync-shopee-ads]
verify_jwt = false

[functions.shopee-oauth]
verify_jwt = false

[functions.shopee-ads-oauth]
verify_jwt = false
```

**2. No sync functions for Mercado Livre, Tray, Loja Integrada**
These platforms have UI cards and can store credentials, but clicking "Sincronizar" will call a non-existent edge function (`sync-mercado_livre`, `sync-tray`, `sync-loja_integrada`) and fail. This is by design (planned for future) per existing project memory, so no code change needed — but the "Sincronizar" button should ideally be hidden for platforms without a sync function to avoid user confusion.

**Fix:** In `Integracoes.tsx`, only show the "Sincronizar" button for platforms that have a sync function. Add a set of supported sync platforms and conditionally render the button.

### Plan Summary

1. **Add 4 missing entries to `config.toml`** for `sync-shopee`, `sync-shopee-ads`, `shopee-oauth`, `shopee-ads-oauth`
2. **Hide "Sincronizar" button** for platforms without sync functions (mercado_livre, tray, loja_integrada)

