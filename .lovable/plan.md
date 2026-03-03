

## Plan: Add "Shopee ADS" Integration

The user created a separate Shopee Open Platform app specifically for marketing/ads data. We need to add it as a distinct integration alongside the existing "Shopee" (sales).

### What changes

1. **Store new secrets** — `SHOPEE_ADS_PARTNER_ID` (2030838) and `SHOPEE_ADS_PARTNER_KEY` via the secrets tool.

2. **New edge function `shopee-ads-oauth`** — Clone of `shopee-oauth` but using the ADS partner credentials and platform identifier `shopee_ads`. Callback redirect to `/app/integracoes/shopee-ads/callback`.

3. **New edge function `sync-shopee-ads`** — Clone of `sync-shopee` but using ADS credentials. Instead of fetching orders, it will call the Shopee Marketing API (`/api/v2/marketing/...`) to pull ad spend and campaign metrics, storing them in `metrics_diarias` with `platform = 'shopee_ads'`.

4. **New callback page `ShopeeAdsCallback.tsx`** — Clone of `ShopeeCallback.tsx` pointing to `shopee-ads-oauth?action=callback`.

5. **Update `supabase/config.toml`** — Add `[functions.shopee-ads-oauth]` and `[functions.sync-shopee-ads]` with `verify_jwt = false`.

6. **Update `src/pages/Integracoes.tsx`**:
   - Add `shopee_ads` entry to `platformLogos` (reuse Shopee logo).
   - Add new platform object: id `shopee_ads`, name "Shopee ADS", description about marketing metrics, `oauth: true`, empty fields.
   - Route OAuth calls for `shopee_ads` to `shopee-ads-oauth`.
   - Route sync calls to `sync-shopee-ads`.

7. **Update `src/lib/platformConfig.ts`** — Add `shopee_ads` to `PlatformType` union and `PLATFORMS_LIST`.

8. **Update `src/App.tsx`** — Add route `/integracoes/shopee-ads/callback` → `ShopeeAdsCallback`.

### Notes
- The Shopee Marketing API requires the same OAuth flow but with different partner credentials. The `shopee_ads` platform identifier keeps data separate from the sales integration.
- The sync function will initially focus on ad spend data that maps to `investimento_trafego` in `metrics_diarias`.

