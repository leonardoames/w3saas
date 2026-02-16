

## Reorganizar hierarquia visual do Sidebar

O problema atual e que as secoes (titulos dos grupos) e os subitens tem estilos muito parecidos -- mesma cor, tamanho e peso de fonte -- dificultando a distincao visual entre o que e secao e o que e link navegavel.

### Mudancas planejadas

**1. Titulos das secoes (CollapsibleTrigger) -- mais discretos e com cara de "label"**
- Texto em `text-xs` e `uppercase` com `tracking-wider` para parecer um label de secao
- Cor `text-muted-foreground/70` (mais apagado que os links)
- Remover o fundo no hover (trocar por apenas `hover:text-sidebar-foreground`)
- Manter o icone do grupo menor (`h-3.5 w-3.5`) e mais apagado
- Adicionar `mt-4` entre grupos para separar visualmente as secoes (exceto o primeiro)

**2. Links dos subitens (SidebarNavLink) -- mais destacados e com indentacao clara**
- Aumentar indentacao de `ml-4` para `ml-6` e adicionar uma borda esquerda sutil (`border-l border-border/50`) no container dos subitens
- Reduzir o padding vertical dos links de `py-3` para `py-2` e fonte de `text-base` para `text-sm`
- Icones dos subitens ficam com `h-4 w-4` (menores que atualmente)

**3. Separacao visual entre grupos**
- Adicionar um `Separator` (ou `border-t`) sutil entre cada grupo

### Resultado visual esperado

```text
MEU E-COMMERCE            <-- label pequeno, uppercase, cor apagada
  | Dashboard             <-- link identado, borda lateral, destaque
  | Plano de Acao
  | CRM Influenciadores
  | Integracoes

SIMULACOES
  | Calculadora
  | Simulacao de Cenarios

EDUCACAO
  ...
```

### Arquivos modificados

- `src/components/layout/Sidebar.tsx` -- estilos do `SidebarGroup` (trigger + container dos itens)
- `src/components/layout/SidebarNavLink.tsx` -- ajuste de tamanho de fonte, padding e icone dos subitens

### Detalhes tecnicos

**Sidebar.tsx - CollapsibleTrigger (linha 97):**
- De: `text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent`
- Para: `text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 hover:text-sidebar-foreground`

**Sidebar.tsx - Container dos subitens (linha 103):**
- De: `ml-4 space-y-0.5 py-1`
- Para: `ml-6 space-y-0.5 py-1 border-l border-border/40 pl-0`

**Sidebar.tsx - Espacamento entre grupos:**
- Adicionar `first:mt-0 mt-4` em cada grupo ou usar `space-y-4` no container pai

**SidebarNavLink.tsx:**
- Texto de `text-base` para `text-sm`
- Padding de `py-3` para `py-2`
- Icone de `h-5 w-5` para `h-4 w-4`
