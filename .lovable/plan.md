

# Plano: Melhorias de UI/UX do Dashboard

## Resumo do Feedback
O feedback geral é positivo - a base do dashboard está sólida, ícones padronizados e menu lateral bem resolvido. As observações são ajustes pontuais de hierarquia visual e diagramação.

---

## Alterações Propostas

### 1. Remover/Suavizar Divisórias Desnecessárias
**Problema:** Algumas divisórias têm contraste além do necessário.
**Solução:** Suavizar as bordas dos cards para um visual mais fluido.

**Arquivos:** `KPICard.tsx`, `MetricCard.tsx`, `Dashboard.tsx`

---

### 2. Melhorar Contraste de Hierarquia (Título vs Resultado)
**Problema:** Títulos dos cards têm mesmo peso visual que os valores.
**Solução:** Usar um cinza mais claro para títulos, mantendo os valores em destaque.

**Arquivos:** `KPICard.tsx`, `MetricCard.tsx`

---

### 3. Adicionar Ícones nos Cards de Métricas Secundárias
**Problema:** Os cards de Ticket Médio, Custo por Venda e Taxa de Conversão não têm ícones.
**Solução:** Adicionar ícones com fundo arredondado, similar aos KPI Cards principais.

**Arquivo:** `MetricCard.tsx`

---

### 4. Aumentar Tamanho dos Valores nas Métricas Secundárias
**Problema:** Os valores dos cards secundários ficam pequenos.
**Solução:** Igualar proporção com os KPI Cards principais.

**Arquivo:** `MetricCard.tsx`

---

### 5. Mover Filtros para a Direita do Gráfico
**Problema:** Filtros ocupam espaço vertical, exigindo scroll.
**Solução:** Reorganizar layout com gráfico à esquerda e métricas/filtros à direita, tudo visível na mesma tela.

**Arquivo:** `Dashboard.tsx`

---

### 6. Texto Branco nos Botões de Período Ativos
**Problema:** Cor da fonte não é branca nos botões selecionados.
**Solução:** Garantir texto branco quando o botão está selecionado.

**Arquivo:** `PeriodFilter.tsx`

---

### 7. Ajustar Cor Laranja do Gráfico
**Problema:** Laranja pastel não segue a paleta principal.
**Solução:** Usar laranjas mais vivos da paleta: `#F47917` ou `#F55900` (já definidos como `--primary`).

**Arquivo:** `RevenueChart.tsx`, `src/index.css`

---

### 8. Suavizar Contraste do Campo de Email na Tela de Login
**Problema:** Campo tem contraste muito forte.
**Solução:** Usar tons de cinza mais suaves.

**Arquivo:** Verificar tela de Auth (menor prioridade)

---

## Detalhamento Técnico

### KPICard.tsx - Melhorias

```typescript
// Antes: text-muted-foreground (muito escuro)
// Depois: text-muted-foreground/70 (mais suave)

// Ícone dentro de forma arredondada
<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
  <Icon className="h-4 w-4 text-primary" />
</div>
```

### MetricCard.tsx - Adicionar Ícones e Melhorar Tamanho

```typescript
interface MetricCardProps {
  title: string;
  value: string;
  icon: LucideIcon;      // Novo
  iconColor?: string;     // Novo (opcional)
}

// Ícone em caixa arredondada
// Título em cinza mais claro
// Valor maior: text-2xl (era text-xl)
```

### Dashboard.tsx - Reorganização do Layout

```typescript
// Atual:
// KPI Cards (4 colunas)
// Filtros (linha separada)
// Métricas secundárias (3 colunas)
// Gráfico (largura total)

// Proposto:
// KPI Cards (4 colunas)
// Seção com:
//   - Gráfico (2/3 ou 60% largura)
//   - Coluna lateral (1/3 ou 40% largura):
//     - Filtros
//     - Métricas secundárias empilhadas
```

### PeriodFilter.tsx - Texto Branco

```typescript
// Garantir que botões selecionados tenham texto branco
variant={selectedPeriod === period.value ? "default" : "outline"}
// O variant="default" já usa primary-foreground (branco)
// Verificar se está funcionando corretamente
```

---

## Ordem de Implementação

1. **Hierarquia visual** - Ajustar cores dos títulos
2. **MetricCard** - Adicionar ícones e aumentar valores
3. **KPICard** - Ícone dentro de forma
4. **Layout** - Reorganizar gráfico + filtros + métricas
5. **Bordas** - Suavizar divisórias
6. **Cor do gráfico** - Usar laranja mais vivo

---

## Resultado Esperado
- Interface mais limpa e fluida
- Hierarquia visual clara (títulos < valores)
- Todas as informações visíveis sem scroll excessivo
- Consistência visual nos ícones
- Cores mais vivas seguindo a paleta da marca

