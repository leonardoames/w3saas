

## Plano de Implementacao

### 1. Placeholders com menor destaque (global)

Atualmente os placeholders usam `placeholder:text-muted-foreground` nos componentes `Input` e `Textarea`. O problema e que `--muted-foreground` tem contraste alto (quase preto no light, quase branco no dark).

**Solucao**: Adicionar opacidade ao placeholder nos dois componentes base:
- `src/components/ui/input.tsx`: trocar `placeholder:text-muted-foreground` por `placeholder:text-muted-foreground/50`
- `src/components/ui/textarea.tsx`: mesma alteracao

Isso aplica 50% de opacidade ao texto placeholder em todo o SaaS de forma centralizada.

### 2. Layout lado a lado em tablet na Simulacao

Atualmente o grid usa `grid-cols-1 lg:grid-cols-2`, fazendo com que em tablet (breakpoint `md`) os cards fiquem empilhados.

**Solucao**: Em `src/pages/SimulacaoCenarios.tsx`, trocar para `grid-cols-1 md:grid-cols-2` no container dos cenarios, ativando o layout lado a lado a partir de 768px.

### 3. Novo grafico de crescimento projetado (10% ao ano)

Adicionar um segundo grafico abaixo do existente mostrando a projecao de crescimento de 10% ao ano por 5 anos, baseado no faturamento anual do cenario atual e do novo cenario.

**Solucao**: Criar um novo componente `src/components/simulacao/GrowthProjectionChart.tsx` que:
- Recebe o faturamento anual de cada cenario
- Calcula projecao composta de 10% ao ano por 5 anos (Ano 1 a Ano 5)
- Exibe um grafico de barras (BarChart do Recharts) com duas series (Atual e Novo) lado a lado
- So aparece quando pelo menos um cenario estiver preenchido

Integrar o novo componente em `SimulacaoCenarios.tsx` abaixo do grafico existente.

---

### Detalhes tecnicos

**Arquivos modificados:**
- `src/components/ui/input.tsx` - placeholder opacity
- `src/components/ui/textarea.tsx` - placeholder opacity
- `src/pages/SimulacaoCenarios.tsx` - breakpoint md + integracao do novo grafico

**Arquivo criado:**
- `src/components/simulacao/GrowthProjectionChart.tsx` - grafico de projecao com BarChart (Recharts), 5 anos, crescimento composto de 10%

**Logica de projecao:**
```
ano1 = faturamentoAnual
ano2 = ano1 * 1.10
ano3 = ano2 * 1.10
...
```

