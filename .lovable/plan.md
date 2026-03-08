

## Plan: Add Bagy Integration

### What needs to change

1. **Add Bagy logo asset** — Need a Bagy platform logo at `src/assets/platforms/bagy.png`. Since no logo file exists, I'll use a placeholder approach (reference the image in code; user will need to provide an actual logo file, or I can use the existing placeholder pattern).

2. **`src/pages/Integracoes.tsx`** — Three additions:
   - Import bagy logo (placeholder initially)
   - Add `bagy` to `platformLogos` map
   - Add Bagy entry to the `platforms` array with fields: `api_key` (API Key). Bagy uses a REST API with token auth. Docs URL: `https://bagypro.com/desenvolvedores`

3. **`src/lib/platformConfig.ts`** — Add `'bagy'` to the `PlatformType` union and add `{ id: 'bagy', label: 'Bagy', color: 'bg-pink-600' }` to `PLATFORMS_LIST`.

4. **`src/components/dashboard/PlatformSelect.tsx`** (if it reads from platformConfig, no extra change needed — it auto-picks from the list).

### Details

- Bagy will be a **credential-based** integration (not OAuth), requiring an API Key field.
- It will NOT be added to `SYNCABLE_PLATFORMS` since there's no `sync-bagy` edge function yet — the Sync button won't appear.
- No database changes needed — `user_integrations` already stores arbitrary platform strings.
- For the logo, I'll create a simple SVG placeholder or reference a missing image gracefully. Ideally the user provides a `bagy.png`.

### Files to edit
- `src/pages/Integracoes.tsx` — add platform entry + logo import
- `src/lib/platformConfig.ts` — add to type + list

