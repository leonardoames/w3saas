

## Plano de Implementacao

### 1. Kanban com rolagem lateral (CRM de Influenciadores)

Atualmente o board usa `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6` que forca as 6 colunas a "quebrarem" em linhas no mobile/tablet.

**Solucao**: Trocar o grid por um container `flex` com `overflow-x-auto` e largura minima fixa por coluna (~200px). As colunas nunca quebram -- o usuario rola lateralmente para ver todas.

**Arquivo**: `src/pages/CRMInfluenciadores.tsx` (linha 545)
- Trocar `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6` por `flex gap-3 overflow-x-auto`
- Cada coluna recebe `min-w-[200px] w-[200px] lg:flex-1` para ter largura fixa em telas menores e expandir no desktop

---

### 2. Sidebar reorganizada com menus sanfona (accordion)

Atualmente o sidebar renderiza uma lista plana de links. A nova estrutura agrupa os itens em seções colapsaveis usando o Collapsible do Radix (ja instalado).

**Nova organizacao dos menus:**

| Grupo | Itens |
|---|---|
| **Meu E-commerce** | Dashboard, Plano de Acao, CRM de Influenciadores, Integracoes |
| **Simulacoes** | Calculadora, Simulacao de Cenarios |
| **Educacao** | Aulas da Mentoria, Calendario Comercial |
| **IA W3** | IA W3 (link direto, sem submenu) |
| **Mais sobre W3** | Solucoes da W3, Catalogo de Marcas |

**Comportamento:**
- Cada grupo tem um titulo clicavel que abre/fecha (sanfona)
- O grupo que contem a rota ativa fica aberto por padrao
- Quando o sidebar esta colapsado (icones only), os grupos nao aparecem -- apenas os icones dos itens com tooltips (comportamento atual)
- No mobile (drawer), os grupos funcionam normalmente como sanfona

**Arquivo**: `src/components/layout/Sidebar.tsx`
- Substituir o array `menuItems` plano por uma estrutura `menuGroups` com `title`, `icon` e `items[]`
- Usar `Collapsible`, `CollapsibleTrigger` e `CollapsibleContent` do Radix para cada grupo
- Usar `useLocation` para detectar qual grupo deve iniciar aberto
- Manter `SidebarNavLink` para cada item individual
- Admin items (Cerebro IA, Admin) continuam aparecendo separados no final

### Detalhes tecnicos

**Arquivos modificados:**
- `src/pages/CRMInfluenciadores.tsx` -- kanban flex + overflow-x-auto
- `src/components/layout/Sidebar.tsx` -- reestruturacao com grupos colapsaveis

**Dependencias usadas (ja instaladas):**
- `@radix-ui/react-collapsible` via `src/components/ui/collapsible.tsx`

**Estrutura de dados dos grupos:**
```typescript
const menuGroups = [
  {
    title: "Meu E-commerce",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/app" },
      { title: "Plano de Acao", icon: ListChecks, path: "/app/plano-acao" },
      { title: "CRM de Influenciadores", icon: Users, path: "/app/crm-influenciadores" },
      { title: "Integracoes", icon: Plug, path: "/app/integracoes" },
    ],
  },
  {
    title: "Simulacoes",
    icon: Calculator,
    items: [
      { title: "Calculadora", icon: Calculator, path: "/app/calculadora" },
      { title: "Simulacao de Cenarios", icon: GitCompare, path: "/app/simulacao" },
    ],
  },
  {
    title: "Educacao",
    icon: GraduationCap,
    items: [
      { title: "Aulas da Mentoria", icon: GraduationCap, path: "/app/aulas" },
      { title: "Calendario Comercial", icon: CalendarDays, path: "/app/calendario" },
    ],
  },
];

// IA W3 - link direto (sem submenu)
const standaloneItems = [
  { title: "IA W3", icon: Sparkles, path: "/app/ia-w3" },
];

const moreAboutW3 = {
  title: "Mais sobre W3",
  icon: ShoppingBag,
  items: [
    { title: "Solucoes da W3", icon: ShoppingBag, path: "/app/produtos" },
    { title: "Catalogo de Marcas", icon: Store, path: "/app/catalogo" },
  ],
};
```

**Logica de auto-abertura**: Cada grupo verifica se `location.pathname` corresponde a algum dos seus items para definir o estado inicial `open`.

