

## Plan: Auto-migrate orphan `sku_reposicao` records to Products catalog

### Problem
Records created in "Reposição de Estoque" before the centralized catalog was implemented have `product_id = null` and don't appear in "Meus Produtos".

### Solution
Add an automatic migration function that runs when the user opens the "Meus Produtos" page. It scans `sku_reposicao` records where `product_id IS NULL`, creates corresponding `products` entries, and links them.

### Implementation

**1. New hook/function: `useSyncOrphanReposicao`** (in `src/hooks/useProducts.ts`)

- On mount (when `MeusProdutos` page loads), query `sku_reposicao` where `product_id IS NULL`
- For each orphan record:
  - Check if a product with the same `sku + user_id` already exists in `products`
  - If yes: link the `sku_reposicao` record to it (update `product_id`)
  - If no: create a new product from the reposicao fields (`nome_peca` → `nome`, etc.), then update `sku_reposicao.product_id`
- Use a `useRef` flag to run only once per session (avoid repeated runs)
- Show a toast summarizing: "X produtos sincronizados do estoque"
- Wrap everything in try/catch — never block the page

**2. Update `src/pages/MeusProdutos.tsx`**

- Call the sync hook at the top of the component
- Show a subtle loading indicator ("Sincronizando produtos...") while migration runs
- After completion, invalidate both `products` and `sku_reposicao` query caches

### Files changed
- `src/hooks/useProducts.ts` — add `useSyncOrphanReposicao` hook
- `src/pages/MeusProdutos.tsx` — call the hook on mount

No database migrations needed — uses existing tables and RLS policies.

