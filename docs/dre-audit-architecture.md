# Auditoria DRE — SaaS E-commerce

## 1) Resumo executivo

### Como estava
- A DRE era uma visão mensal simples baseada em:
  - `metrics_diarias.faturamento` como receita principal.
  - `daily_results.investimento` como marketing.
  - percentuais manuais (CMV, impostos, taxas, frete) aplicados sobre receita bruta.
  - despesas fixas e avulsas manuais.
- O resultado final era `lucroOperacional`, sem camada explícita de **receita líquida**, **lucro bruto** e sem tratamento formal de **descontos/reembolsos/chargebacks**.

### Problemas críticos encontrados
- Mistura parcial de fontes: receita vinha de `metrics_diarias`, investimento vinha de `daily_results`.
- Sem reconciliação de fontes por dia (risco de sub/superestimação).
- DRE sem separação formal de: receita bruta, deduções de receita, receita líquida, lucro bruto, lucro líquido.
- Sem estrutura nativa para registrar descontos, reembolsos e chargebacks.
- Sem alertas de integridade para dados faltantes ou inconsistentes.

### O que foi corrigido nesta implementação
- Criada reconciliação diária entre `metrics_diarias` e `daily_results` com regra de precedência.
- Novo motor de cálculo com camadas: receita bruta → deduções → receita líquida → custos variáveis → lucro bruto → despesas operacionais → lucro líquido.
- Nova entidade `dre_ajustes_mensais` para registrar descontos, reembolsos, chargebacks e ajustes operacionais.
- DRE enriquecida com métricas de apoio: ticket médio, ROAS, CPA, ROI e taxa de conversão.
- Adicionados alertas de integridade financeira na tela DRE.

---

## 2) Mapa da implementação atual

### Rotas / páginas
- `src/pages/DRE.tsx`: tela principal da DRE mensal.
- Rota: `/app/dre` (`src/App.tsx`, `src/components/layout/Sidebar.tsx`).

### Hooks / cálculo
- `src/hooks/useDRE.ts`:
  - Leitura de config, despesas fixas/avulsas, receitas avulsas.
  - Leitura de `metrics_diarias` e `daily_results` por mês atual e anterior.
  - Reconciliação por dia e cálculo final de DRE.
  - Mutations para config e itens manuais.

### Componentes DRE
- `src/components/dre/DREStatement.tsx`:
  - Estrutura em blocos financeiros com comparação mensal.
  - KPIs auxiliares e seção de ajustes manuais.
- `src/components/dre/DREConfigPanel.tsx`:
  - Configuração de percentuais e gestão de despesas/receitas manuais.
- `src/components/dre/AddItemDialog.tsx`, `AddDespesaFixaDialog.tsx`, `dreConstants.ts`.

### Banco / tabelas
- Existentes:
  - `dre_config`
  - `dre_despesas_fixas`
  - `dre_despesas_avulsas`
  - `dre_receitas_avulsas`
  - `metrics_diarias`
  - `daily_results`
- Nova tabela:
  - `dre_ajustes_mensais`

### Integrações / ingestão
- `supabase/functions/sync-olist_tiny/index.ts` abastece `metrics_diarias` (faturamento, quantidade, etc.).
- `AcompanhamentoDiario` permite entrada manual/import de `daily_results`.

---

## 3) Gaps encontrados

### Lógica financeira
- Não havia deduções explícitas (descontos/reembolsos/chargebacks).
- Lucro era mostrado como operacional estimado, sem separação clara de estágios financeiros.

### Modelagem
- Ausência de tabela específica para ajustes de dedução/qualidade da receita.
- Ausência de histórico de custo por produto e regra temporal por taxa (pendente para próxima fase).

### UX
- DRE sem bloco explícito de integridade de dados.
- Nomenclatura levava o usuário direto de receita bruta para resultado, sem destacar receita líquida.

### Confiabilidade
- Sem reconciliação explícita de múltiplas fontes por dia.

### Performance
- Cálculo ainda em camada de aplicação; ainda não há snapshot materializado diário/mensal.

---

## 4) Melhorias implementadas

1. **Engine de cálculo DRE evoluída (`useDRE`)**
   - Reconciliação diária de receita/investimento/sessões/pedidos.
   - Separação de camadas financeiras.
   - Cálculo de KPIs de apoio.

2. **Nova tabela `dre_ajustes_mensais`**
   - Categorias suportadas:
     - `descontos`
     - `reembolsos`
     - `chargebacks`
     - `outras_receitas`
     - `outras_despesas_operacionais`
   - RLS e trigger de `updated_at`.

3. **UI DRE aprimorada**
   - Blocos com receita bruta/líquida, custos variáveis, lucro bruto, lucro líquido.
   - Seção de ajustes manuais e indicadores auxiliares.
   - Alertas de integridade financeira.

---

## 5) Fórmulas oficiais da DRE

> Base de competência mensal (por `data` no mês selecionado).

- **Receita Integrações** = soma diária reconciliada de receita (`metrics_diarias.faturamento` com fallback `daily_results.receita_paga`).
- **Receita Manual** = `receitas_avulsas` + ajustes `outras_receitas`.
- **Receita Bruta** = Receita Integrações + Receita Manual.
- **Deduções de Receita** = descontos + reembolsos + chargebacks (ajustes mensais).
- **Receita Líquida** = Receita Bruta − Deduções de Receita.
- **Custo do Produto (CMV em valor)** = Receita Líquida × (`cmv_pct` / 100).
- **Impostos (valor)** = Receita Líquida × (`impostos_pct` / 100).
- **Taxas (valor)** = Receita Líquida × (`taxas_plataforma_pct` / 100).
- **Frete Líquido (valor)** = Receita Líquida × (`frete_liquido_pct` / 100).
- **Custos Variáveis** = CMV + Impostos + Taxas + Frete.
- **Lucro Bruto** = Receita Líquida − Custos Variáveis.
- **Investimento em Marketing** = soma diária reconciliada de investimento.
- **Despesas Operacionais** = investimento + despesas fixas ativas + despesas avulsas + ajustes de outras despesas operacionais.
- **Lucro Operacional** = Lucro Bruto − Despesas Operacionais.
- **Lucro Líquido** = Lucro Operacional (nesta versão).
- **Margem Líquida** = Lucro Líquido / Receita Líquida × 100.
- **Ticket Médio** = Receita Líquida / Pedidos Pagos.
- **CPA** = Investimento / Pedidos Pagos.
- **ROAS** = Receita Líquida / Investimento.
- **ROI** = Lucro Líquido / Investimento × 100.
- **Taxa de Conversão** = Pedidos Pagos / Sessões × 100.
- **Lucro por Produto / Campanha** = **pendente** por ausência de granularidade confiável em `order_items` + atribuição campanha-produto.

---

## 6) Estrutura de dados final (estado atual)

- `dre_config(user_id, cmv_pct, impostos_pct, taxas_plataforma_pct, frete_liquido_pct)`
- `dre_despesas_fixas(user_id, descricao, categoria, valor, is_active)`
- `dre_despesas_avulsas(user_id, mes_referencia, descricao, categoria, valor)`
- `dre_receitas_avulsas(user_id, mes_referencia, descricao, categoria, valor)`
- `dre_ajustes_mensais(user_id, mes_referencia, descricao, categoria, valor)`
- `metrics_diarias(data, faturamento, investimento_trafego, sessoes, vendas_quantidade, platform)`
- `daily_results(data, receita_paga, investimento, sessoes, pedidos_pagos)`

---

## 7) Próximos passos recomendados

### MVP+ (curto prazo)
- Materializar snapshot mensal (`dre_monthly_snapshots`) para performance e auditoria histórica.
- Adicionar “fonte dominante” e score de confiança por mês.

### V2
- Modelo transacional real: `orders`, `order_items`, `payment_events`, `refund_events`, `chargeback_events`.
- Custo histórico por produto (`product_cost_history`) e aplicação por competência.
- Regras temporais de taxas (`gateway_fee_rules`, `checkout_fee_rules`, `tax_rules`, `shipping_rules`).

### V3
- Atribuição robusta por campanha/produto (`attribution_records`).
- Lucro por SKU, campanha, canal e coorte.
- Motor de alertas automáticos de qualidade com severidade e playbook de correção.
