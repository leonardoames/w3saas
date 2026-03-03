

## Plan: Add Aulas and Ferramentas to Admin Plano de Ação

The admin needs two new capabilities when managing a user's action plan: (1) link existing course lessons to the user's plan, and (2) manage "ferramentas" (spreadsheets, tools, solutions) per user. A search dialog allows browsing both.

### Database Changes

**New table `plan_ferramentas`** — stores tools/spreadsheets assigned to users by admins:

```sql
CREATE TABLE public.plan_ferramentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  external_url TEXT,
  type TEXT NOT NULL DEFAULT 'planilha', -- planilha, solucao, ferramenta
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.plan_ferramentas ENABLE ROW LEVEL SECURITY;
-- Admin full access, users read own
```

**New table `plan_aulas`** — links existing lessons to a user's plan:

```sql
CREATE TABLE public.plan_aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.plan_aulas ENABLE ROW LEVEL SECURITY;
-- Admin full access, users read own
```

### Storage

Use existing bucket or create a new `plan-ferramentas` public bucket for uploaded spreadsheets/files.

### Frontend Changes

**1. Update `AdminPlanoAcao.tsx` `UserPlanView`** — add two new tabs:

- **"Aulas"** tab: shows lessons linked to the user's plan. Admin can search and add lessons from existing course modules. Each linked lesson shows title, module name, and a remove button.
- **"Ferramentas"** tab: CRUD for tools/spreadsheets. Admin can add a ferramenta with title, description, type (planilha/solucao/ferramenta), and either upload a file or paste an external URL.

Tab layout becomes: `Plano AMES | Personalizado | Aulas | Ferramentas | Mapa Mental`

**2. New component `SearchLessonsDialog.tsx`** — a search dialog (lupa icon) that:
- Fetches all lessons joined with `course_modules` and `courses`
- Shows them grouped by course/module with search filter
- Lets admin select lessons to link to the user's plan via `plan_aulas`

**3. New component `AddFerramentaDialog.tsx`** — form dialog with:
- Title, description, type select (Planilha / Solução / Ferramenta)
- File upload or external URL field
- Saves to `plan_ferramentas` table

**4. New component `SearchResourcesDialog.tsx`** — unified search (lupa) that opens showing two tabs: "Aulas" and "Ferramentas", allowing admin to browse all registered resources across all users.

### User-Facing View

Update `PlanoAcao.tsx` to also show linked aulas and ferramentas (read-only) so the mentorado can access their assigned resources.

### Summary of files

- **Migration**: create `plan_ferramentas`, `plan_aulas` tables + RLS + storage bucket
- **New**: `SearchLessonsDialog.tsx`, `AddFerramentaDialog.tsx`
- **Edit**: `AdminPlanoAcao.tsx` (add Aulas + Ferramentas tabs), `PlanoAcao.tsx` (show assigned resources)

