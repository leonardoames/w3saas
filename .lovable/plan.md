

## Diagnosis

The discrepancy between the KPI "Faturamento Total" (R$ 105k) and the chart peak (R$ 220k) is caused by **two different data scopes**:

1. **KPIs** correctly filter revenue to only `is_mentorado = true` users (via `revenueAgg` joined to `profilesQuery` which filters by `is_mentorado`).
2. **Chart (`monthlyRevenue`)** sums revenue from **ALL users** in `daily_results` and `metrics_diarias` — including non-mentorado users — because it reads raw query data without filtering by user IDs.

Additionally, there's a potential **double-counting** issue: if a user has entries in both `daily_results` (manual) and `metrics_diarias` (integration) for the same date/platform, both values are summed in the chart.

## Plan

### Fix `monthlyRevenue` in `useDashAdmin.ts`

Filter the chart aggregation to only include `user_id`s that belong to mentorado profiles:

1. Extract the set of mentorado `user_id`s from `profilesQuery.data`
2. In the `monthlyRevenue` memo, skip rows whose `user_id` is not in the mentorado set
3. This ensures chart data matches KPI data scope

```text
monthlyRevenue memo:
  const mentoradoIds = new Set(profilesQuery.data?.map(p => p.user_id) || []);
  
  for (const row of dailyRows) {
    if (!mentoradoIds.has(row.user_id)) continue;  // ← add this filter
    ...
  }
  for (const row of metricsRows) {
    if (!mentoradoIds.has(row.user_id)) continue;  // ← add this filter
    ...
  }
```

This is a single change in `src/hooks/useDashAdmin.ts` affecting the `monthlyRevenue` useMemo block (~3 lines added).

