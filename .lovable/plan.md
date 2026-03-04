

## Plan: Fix Shopee ADS Sync - Correct API Endpoints

### Root Cause

The edge function logs show: `Shopee Marketing API 404: {"error":"error_not_found"}`. The function is calling **non-existent endpoints**:
- `/api/v2/marketing/get_all_campaign_list` -- does NOT exist
- `/api/v2/marketing/get_campaign_daily_performance` -- does NOT exist

After investigating the Shopee Open Platform SDK source code, the correct Shopee Ads namespace is `/api/v2/ads/`, not `/api/v2/marketing/`.

### Correct Approach

The Shopee Ads API provides a single aggregated endpoint that returns daily performance across **all** CPC ads -- no need to list campaigns individually:

```text
GET /api/v2/ads/get_all_cpc_ads_daily_performance
  Query params: start_date, end_date, access_token, partner_id, shop_id, timestamp, sign
```

This eliminates the two-step approach (list campaigns → fetch per-campaign performance) and returns aggregated daily metrics including cost, clicks, impressions, gmv, direct_gmv, orders, etc.

### Changes to `supabase/functions/sync-shopee-ads/index.ts`

1. **Replace `shopeePost` with `shopeeGet`** -- the Ads API uses GET requests, not POST
2. **Replace the two-step campaign iteration** with a single call to `/api/v2/ads/get_all_cpc_ads_daily_performance`
3. **Fix the API path namespace**: `/api/v2/ads/` instead of `/api/v2/marketing/`
4. **Map response fields to `metrics_diarias`**:

```text
Shopee Ads API field     →  metrics_diarias column
──────────────────────────────────────────────────
cost                     →  investimento_trafego
clicks                   →  sessoes
direct_gmv               →  faturamento + vendas_valor (per user preference: ROAS direto)
direct_order_num         →  vendas_quantidade
```

5. **Keep 90-day sync window** as requested
6. **Add detailed logging** of API responses for debugging
7. **Handle date pagination** if the API limits the date range per request (chunk into 30-day windows)

### Summary of files
- **Edit**: `supabase/functions/sync-shopee-ads/index.ts` -- rewrite API calls to use correct `/api/v2/ads/` GET endpoints

