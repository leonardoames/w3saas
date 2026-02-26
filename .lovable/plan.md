

# Plano de Alteracoes - Feedback W3 SAAS

Baseado no PDF, identifiquei 6 solicitacoes. Segue o plano organizado:

---

## 1. Dashboard: Adicionar filtros "Hoje" e "Ontem"

**Arquivo:** `src/components/dashboard/PeriodFilter.tsx`

Adicionar dois novos botoes de periodo no array `periods`:
- **Hoje** (`today`): range de hoje ate hoje
- **Ontem** (`yesterday`): range de ontem ate ontem

Serao inseridos antes do "7D" existente.

---

## 2. Dashboard: Adicionar filtro por canal/plataforma

**Arquivos:** `src/pages/Dashboard.tsx`, `src/components/dashboard/PlatformSelect.tsx`

- Adicionar um seletor de plataforma (ex: "Todos", "Shopify", "Olist Tiny", "Nuvemshop", etc.) no bloco de filtros do Dashboard.
- Ao carregar `metrics_diarias`, agrupar tambem por `platform`.
- Quando uma plataforma e selecionada, filtrar os dados de `metrics_diarias` pela coluna `platform`, enquanto `daily_results` (manual) permanece visivel apenas no modo "Todos".

---

## 3. Remover CRM de Influenciadores do SAAS

**Arquivos:**
- `src/App.tsx` — remover rota `/app/crm-influenciadores`
- `src/components/layout/Sidebar.tsx` — remover item "CRM de Influenciadores" do menu
- `src/pages/CRMInfluenciadores.tsx` — pode ser mantido no repositorio mas nao sera acessivel

---

## 4. Precificadora: Adicionar nome e SKU ao salvar produto

**Arquivos:** `src/components/precificadora/SaveProductDialog.tsx`

O dialog de salvar produto ja salva na tabela `saved_products` que possui colunas `name` e `sku`. Verificar se o dialog ja expoe esses campos; caso contrario, adicionar inputs de "Nome do Produto" e "SKU" no formulario de salvamento.

---

## 5. Produtos da Mentoria: CRUD para administradores

**Arquivos:** `src/pages/Produtos.tsx`

Atualmente os produtos sao hardcoded (mock). O plano e:
- Criar tabela `mentoria_products` no banco (id, title, description, image_url, details_url, whatsapp_url, order, created_at) com RLS para admins gerenciarem e todos lerem.
- Atualizar `Produtos.tsx` para buscar do banco e, se admin, exibir botoes de Adicionar/Editar/Remover.
- Criar componente de dialog para formulario de produto.

---

## 6. IA W3: Otimizar layout para tela cheia

**Arquivo:** `src/pages/IAW3.tsx`

O feedback menciona que "o tamanho nao esta otimizado pra tela". Ajustar:
- Aumentar `max-w-3xl` das mensagens e input para `max-w-4xl` ou `max-w-5xl`.
- Garantir que em telas grandes o chat ocupe mais espaco horizontal.

---

## Sobre o "Cerebro IA"

O PDF pergunta "Esse cerebro IA so os ADMs conseguem melhorar?" — Sim, o sistema atual (pagina `/app/ia-w3/cerebro`) ja e restrito a admins via RLS e rota protegida. Nao ha alteracao necessaria, apenas esclarecer ao usuario que somente administradores podem alimentar a base de conhecimento.

---

## Ordem de implementacao sugerida

1. Remover CRM Influenciadores (rapido, limpeza)
2. Filtros "Hoje/Ontem" no Dashboard
3. Filtro por canal no Dashboard
4. Nome/SKU na Precificadora
5. Layout IA W3
6. CRUD Produtos da Mentoria (mais complexo, requer migracao de banco)

