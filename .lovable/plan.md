

## Plan: Add dedicated "Plano de Ação" tab in Admin area

The admin area already has the `AdminPlanoAcao` page built (`src/pages/admin/AdminPlanoAcao.tsx`) with full CRUD for tasks per user, but it's not connected to the navigation or routes. The fix is simple:

### Changes

1. **Add route in `App.tsx`**
   - Register `/admin/plano-acao` route pointing to `AdminPlanoAcao`, wrapped in `ProtectedRoute requireAdmin`

2. **Add nav link in `AdminLayout.tsx`**
   - Add a "Plano de Ação" entry to the `adminLinks` array with `ClipboardList` icon, linking to `/admin/plano-acao`

That's it -- the page and all CRUD logic (add/edit/delete tasks per user, Miro embeds, AMES sections) already exist in `AdminPlanoAcao.tsx`.

