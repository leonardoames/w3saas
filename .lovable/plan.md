

# Plan: Optimize Sidebar — Exclusive Accordion + Admin Section Separator

## Changes (single file: `src/components/layout/Sidebar.tsx`)

### 1. Exclusive Accordion (only one group open at a time)
- Replace individual `Collapsible` per group with a single controlled state: `openGroup: string | null`
- On page load, set `openGroup` to the group whose items match the current `pathname`
- Clicking a group trigger sets `openGroup` to that group (or `null` if already open)
- Animate open/close with `grid-template-rows` transition (200ms ease) on the content wrapper — CSS-only, no library needed
- The `SidebarGroup` component receives `isOpen` and `onToggle` props instead of using `Collapsible`

### 2. Admin/System Section Separator
- After standalone items (IA W3), render a divider + label block only when `isAdmin` is true:
  - `border-top: 1px solid` with color `border-border/30` (matches dark theme ~#222)
  - Label "SISTEMA" — `uppercase text-[10px] opacity-30 tracking-wider px-3 pt-3 pb-1`
- Cérebro IA and Admin links rendered below this divider
- These items use a variant style on `SidebarNavLink`: new prop `variant="system"` that applies:
  - Inactive: `text-muted-foreground/50` (more faded than normal items)
  - Active: subtle `bg-accent/40` background only — no left orange border (skip `sidebar-item-active` class, use inline active styles)

### 3. No changes to:
- Collapsed sidebar behavior
- Routes, paths, or menu item definitions
- Mobile drawer logic (same accordion behavior applies there too via shared `renderExpandedNav`)

## Technical Details

- Replace `Collapsible` with a simple `div` + controlled height animation using `overflow-hidden` and `max-height` or CSS `grid-rows` trick
- `useState<string | null>` for `openGroup`, initialized via `useMemo` scanning `allGroups` against `location.pathname`
- `SidebarNavLink` gets optional `variant?: "system"` prop; when set, uses different active class

### Files to edit:
1. **`src/components/layout/Sidebar.tsx`** — accordion state, admin section, pass variant
2. **`src/components/layout/SidebarNavLink.tsx`** — add `variant="system"` support with different active style
3. **`src/index.css`** — add `.sidebar-item-system-active` class (bg only, no border-left)

