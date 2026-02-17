

## Plano: Precificadora, Produtos Salvos, Cenarios Salvos, Meta de Faturamento

### Visao Geral

Quatro grandes mudancas:
1. Renomear "Calculadora" para "Precificadora de E-commerce" e remover margem desejada
2. Salvar produtos precificados no banco de dados
3. Salvar cenarios simulados no banco de dados com historico acessivel
4. Campo de meta de faturamento no perfil do usuario, refletido no Dashboard

---

### 1. Renomear Calculadora para Precificadora de E-commerce

**Arquivos modificados:**
- `src/components/layout/Sidebar.tsx` -- mudar titulo de "Calculadora" para "Precificadora" e icone para `Tag` (ou manter `Calculator`)
- `src/pages/Calculadora.tsx` -- mudar titulo h1 e descricao, remover campo "Margem Desejada" e toda logica de comparacao com margem desejada (funcao `getMarginColor` e textos "Acima da meta" / "Meta: X%")

**Remocao da margem desejada:**
- Remover campo `desiredMargin` do estado `inputs`
- Remover o bloco JSX do input "Margem Desejada" (linhas 163-179)
- Simplificar `getMarginColor()` -- margem positiva = verde, margem negativa = vermelho, sem comparacao com meta
- Remover texto condicional "Acima da meta" / "Meta: X%" no bloco de resultados

---

### 2. Salvar Produtos Precificados (Banco de Dados)

**Nova tabela `saved_products`:**

```text
id          uuid PK default gen_random_uuid()
user_id     uuid NOT NULL
name        text NOT NULL
sku         text (opcional)
selling_price        numeric
product_cost         numeric
media_cost_pct       numeric
fixed_costs_pct      numeric
taxes_pct            numeric
gateway_fee_pct      numeric
platform_fee_pct     numeric
extra_fees_pct       numeric
created_at  timestamptz default now()
updated_at  timestamptz default now()
```

**RLS:** usuario so ve/edita/deleta seus proprios produtos.

**Mudancas na UI (Calculadora.tsx):**
- Adicionar botao "Salvar Produto" no topo ou ao lado dos resultados
- Modal/dialog para digitar nome do produto e SKU (opcional) antes de salvar
- Botao "Meus Produtos" que abre um dialog/drawer com tabela listando produtos salvos (nome, SKU, preco de venda, lucro, margem)
- Ao clicar em um produto salvo, preenche os campos da precificadora com os valores daquele produto
- Botao de excluir produto salvo

**Novos componentes:**
- `src/components/precificadora/SaveProductDialog.tsx` -- modal para nomear e salvar
- `src/components/precificadora/SavedProductsList.tsx` -- lista/tabela de produtos salvos

---

### 3. Salvar Cenarios Simulados (Banco de Dados)

**Nova tabela `saved_scenarios`:**

```text
id               uuid PK default gen_random_uuid()
user_id          uuid NOT NULL
name             text NOT NULL
current_visits   numeric
current_rate     numeric
current_ticket   numeric
new_visits       numeric
new_rate         numeric
new_ticket       numeric
created_at       timestamptz default now()
updated_at       timestamptz default now()
```

**RLS:** usuario so ve/edita/deleta seus proprios cenarios.

**Mudancas na UI (SimulacaoCenarios.tsx):**
- Botao "Salvar Cenario" no header -- abre dialog para nomear o cenario
- Salva os valores de ambos os cenarios (atual + novo) no banco
- Botao "Historico de Cenarios" no header -- navega para sub-rota `/app/simulacao/historico`

**Nova pagina: Historico de Cenarios**
- Rota: `/app/simulacao/historico`
- Tabela com colunas: Nome, Data de criacao, Visitas (atual/novo), Taxa Conv. (atual/novo), Ticket (atual/novo), Acoes
- Ao clicar em "Carregar", preenche os campos da simulacao
- Botao de excluir cenario
- Botao "Voltar para Simulacao" no topo

**Novos arquivos:**
- `src/pages/SimulacaoHistorico.tsx` -- pagina do historico
- `src/components/simulacao/SaveScenarioDialog.tsx` -- modal para nomear cenario

**Roteamento (App.tsx):**
- Adicionar rota `/simulacao/historico` apontando para `SimulacaoHistorico`

---

### 4. Meta de Faturamento no Perfil

**Mudanca no banco:**
- Adicionar coluna `revenue_goal` (numeric, nullable, default null) na tabela `profiles`

**Mudancas na UI:**

A) **Sidebar ou secao "Meu E-commerce":**
- Na Dashboard, adicionar um card/secao para definir meta de faturamento mensal
- Input com valor em R$, salva no perfil do usuario via update na tabela `profiles`

B) **Dashboard -- refletir a meta:**
- No KPI "Faturamento", mostrar uma barra de progresso ou texto indicando % da meta atingida
- Exemplo: "R$ 45.000 de R$ 100.000 (45%)" abaixo do valor de faturamento
- Se meta nao definida, mostrar link "Definir meta de faturamento"

**Novos componentes:**
- `src/components/dashboard/RevenueGoalCard.tsx` -- card para definir/editar meta
- Ou integrar diretamente no KPICard de faturamento com um indicador de progresso

---

### Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar `saved_products`, `saved_scenarios`, adicionar `revenue_goal` em `profiles` |
| `src/pages/Calculadora.tsx` | Renomear, remover margem desejada, adicionar salvar/carregar produtos |
| `src/components/precificadora/SaveProductDialog.tsx` | **Novo** |
| `src/components/precificadora/SavedProductsList.tsx` | **Novo** |
| `src/pages/SimulacaoCenarios.tsx` | Adicionar salvar cenario e botao historico |
| `src/pages/SimulacaoHistorico.tsx` | **Novo** -- tabela de cenarios salvos |
| `src/components/simulacao/SaveScenarioDialog.tsx` | **Novo** |
| `src/components/layout/Sidebar.tsx` | Renomear "Calculadora" para "Precificadora" |
| `src/App.tsx` | Adicionar rota `/simulacao/historico` |
| `src/pages/Dashboard.tsx` | Mostrar progresso da meta de faturamento |
| `src/components/dashboard/RevenueGoalCard.tsx` | **Novo** -- card para definir meta |

### Detalhes Tecnicos

**Precificadora -- remocao da margem desejada:**
- O campo `desiredMargin` sai do estado e do JSX
- A funcao `getMarginColor` passa a usar apenas `results.margin > 0` (verde) vs `<= 0` (vermelho)
- O texto "Acima da meta" e "Meta: X%" e removido dos resultados

**Produtos salvos -- fluxo:**
1. Usuario preenche precificadora normalmente
2. Clica "Salvar Produto" -> dialog pede nome (obrigatorio) e SKU (opcional)
3. Salva todos os inputs no banco (preco, custo, percentuais)
4. Na lista "Meus Produtos", ao clicar "Carregar", preenche os campos
5. Pode editar e salvar novamente (update)

**Cenarios salvos -- fluxo:**
1. Usuario preenche ambos os cenarios
2. Clica "Salvar Cenario" -> dialog pede nome
3. Salva os 6 valores (3 do atual + 3 do novo) no banco
4. Historico acessivel via botao ou sub-rota `/app/simulacao/historico`
5. Tabela mostra todos os cenarios salvos, com opcao de carregar ou excluir

**Meta de faturamento:**
- Salva na coluna `revenue_goal` do `profiles`
- Dashboard le o valor e compara com `sum(receita_paga)` do periodo selecionado
- Exibe barra de progresso no card de faturamento

