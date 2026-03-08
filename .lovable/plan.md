

## Fix: Normalize date keys and parsing in Dashboard

The root cause is a timezone mismatch: dates from the database may include time/timezone components, causing `parseISO` to shift dates when converting to local time. Additionally, date keys in `dateMap` may not group properly if they contain time components.

### Changes to `src/pages/Dashboard.tsx`

**1. Normalize date keys in `loadData`** — Use `substring(0, 10)` on both `dailyData` and `metricsData` loops to extract only `YYYY-MM-DD`.

**2. Normalize date keys in `effectiveData` useMemo** — Same `substring(0, 10)` fix for platform-specific filtering.

**3. Normalize date parsing in `filtered` and `prevFiltered`** — Use `parseISO(m.data.substring(0, 10))` to ensure local timezone interpretation.

**4. Add null safety** — Guard against null `data` values before calling `substring`.

All changes are in a single file: `src/pages/Dashboard.tsx`. No database or backend changes needed.

