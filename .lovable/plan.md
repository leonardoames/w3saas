

## Plano: Acompanhamento Diario + Reestruturacao do Dashboard

### Visao Geral

Criar uma nova pagina "Acompanhamento Diario" como hub central de entrada de dados, com nova tabela simplificada (sem dimensao de plataforma), e fazer o Dashboard consumir esses mesmos dados.

---

### 1. Nova Tabela no Banco de Dados

Criar tabela `daily_results` com esquema simplificado:

```sql
CREATE TABLE public.daily_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL,
  investimento numeric DEFAULT 0,
  sessoes integer DEFAULT 0,
  pedidos_pagos integer DEFAULT 0,
  receita_paga numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, data)
);

ALTER TABLE public.daily_results ENABLE ROW LEVEL SECURITY;
```

**Politicas RLS:**
- SELECT: usuario ve apenas seus proprios registros (`auth.uid() = user_id`), admin ve todos
- INSERT: usuario insere apenas com seu proprio `user_id`
- UPDATE: usuario atualiza apenas seus registros, admin atualiza qualquer um
- DELETE: usuario deleta apenas seus registros, admin deleta qualquer um

**Trigger** para atualizar `updated_at` automaticamente.

Campos calculados (computados no frontend, nao armazenados):
- ROAS = receita_paga / investimento
- Custo de Midia (%) = investimento / receita_paga * 100
- CPA = investimento / pedidos_pagos
- Taxa Conversao (%) = pedidos_pagos / sessoes * 100
- Ticket Medio = receita_paga / pedidos_pagos
- CPS = investimento / sessoes

---

### 2. Nova Pagina: Acompanhamento Diario

**Arquivo:** `src/pages/AcompanhamentoDiario.tsx`

**Layout da pagina:**

A) **Barra de filtros** (topo):
- Filtro de periodo (7D, 14D, 30D, Mes, Personalizado) -- reutiliza `PeriodFilter`
- Input de busca por data

B) **Botoes de acao:**
- "Adicionar manualmente" -- abre modal
- "Importar planilha" -- input de arquivo CSV/XLSX

C) **Tabela principal** (componente novo `DailyResultsTable`):

| Data | Valor Investido (R$) | Sessoes | Pedidos pagos | Receita paga (R$) | ROAS | Custo de Midia (%) | CPA (R$) | TX CONV. (%) | Ticket Medio (R$) | CPS (R$) | Acoes |
|------|---------------------|---------|---------------|-------------------|------|---------------------|----------|--------------|-------------------|----------|-------|

Regras:
- Ordenado por data decrescente
- Header fixo (sticky)
- Zebra rows (alternancia de cor)
- Numeros formatados pt-BR (R$, %)
- ROAS baixo (<2) em vermelho, alto (>5) em verde
- Paginacao com 15 itens por pagina

D) **Modal de edicao/adicao** (componente novo `DailyResultModal`):
- Campos: Data, Investimento (R$), Sessoes, Pedidos Pagos, Receita Paga (R$)
- Ao salvar: upsert por (user_id, data)
- Preview dos campos calculados em tempo real no modal

E) **Importacao CSV:**
- Aceita CSV com colunas: Data, Valor Investido, Sessoes, Pedidos pagos, Receita paga
- Aceita formatos pt-BR (dd/mm/yyyy, virgula como decimal)
- Preview da tabela antes de confirmar importacao
- Upsert por (user_id + data)
- Exibe contagem de criados vs atualizados

---

### 3. Dashboard Simplificado

**Arquivo:** `src/pages/Dashboard.tsx`

Mudancas:
- Remover toda a logica de importacao (tabs "Importar Dados", cards de import, screenshot, AI, bulk entry)
- Remover `parseGenericCSV`, `ScreenshotImportCard`, `consolidateMetrics` e estados relacionados
- Substituir leitura de `metrics_diarias` por `daily_results`
- Adicionar card CTA: "Gerencie seus dados no Acompanhamento Diario" com botoes "Ir para Acompanhamento Diario" e "Importar planilha"

KPIs recalculados a partir de `daily_results`:
- Faturamento = sum(receita_paga)
- Investimento = sum(investimento)
- Vendas = sum(pedidos_pagos)
- Sessoes = sum(sessoes)
- ROAS medio = sum(receita_paga) / sum(investimento)
- Ticket medio = sum(receita_paga) / sum(pedidos_pagos)
- Custo por venda = sum(investimento) / sum(pedidos_pagos)
- Taxa de conversao = sum(pedidos_pagos) / sum(sessoes) * 100

Grafico "Evolucao de Faturamento" plota `receita_paga` por data.

---

### 4. Roteamento e Navegacao

**`src/App.tsx`:**
- Adicionar rota `/app/acompanhamento` para o novo componente

**`src/components/layout/Sidebar.tsx`:**
- Adicionar "Acompanhamento Diario" no grupo "Meu E-commerce" com icone `BarChart3`, posicionado apos "Dashboard"

---

### 5. Permissoes / Admin

- RLS garante que usuarios normais so veem seus proprios dados
- Admin pode ver dados de qualquer usuario (politica RLS com `is_admin_user`)
- No futuro, admin pode selecionar usuario para visualizar (nao implementado nesta fase inicial, mas a RLS ja permite)

---

### Arquivos criados/modificados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabela `daily_results` + RLS + trigger |
| `src/pages/AcompanhamentoDiario.tsx` | **Novo** -- pagina principal |
| `src/components/acompanhamento/DailyResultsTable.tsx` | **Novo** -- tabela com todas as colunas |
| `src/components/acompanhamento/DailyResultModal.tsx` | **Novo** -- modal adicionar/editar |
| `src/components/acompanhamento/ImportPreviewDialog.tsx` | **Novo** -- preview antes de importar CSV |
| `src/pages/Dashboard.tsx` | Modificado -- ler de `daily_results`, remover imports, adicionar CTA |
| `src/App.tsx` | Modificado -- adicionar rota |
| `src/components/layout/Sidebar.tsx` | Modificado -- adicionar item no menu |

### Detalhes tecnicos

**Tabela `daily_results` vs `metrics_diarias`:**
A tabela `metrics_diarias` existente permanece intacta (para nao quebrar dados historicos). A nova `daily_results` e a fonte de verdade para o novo fluxo. Os dados antigos de `metrics_diarias` nao sao migrados automaticamente nesta fase.

**Componente `DailyResultsTable`:**
- 11 colunas de dados + 1 de acoes
- Scroll horizontal em telas menores
- Header sticky com `position: sticky; top: 0`
- Zebra rows com `even:bg-muted/20`
- ROAS com badges coloridos (vermelho < 2, verde > 5)

**Componente `DailyResultModal`:**
- 4 campos editaveis: investimento, sessoes, pedidos_pagos, receita_paga
- 1 campo data (date picker)
- Secao inferior com preview dos 6 campos calculados em tempo real
- Upsert no Supabase com `onConflict: "user_id, data"`

**Import CSV com preview:**
- Parse do arquivo usando funcoes existentes de `metricsImport.ts` adaptadas
- Dialog de preview mostrando tabela com dados parseados
- Botao "Confirmar importacao" que faz upsert em batch
- Contagem de linhas novas vs atualizadas (comparando com dados existentes)

