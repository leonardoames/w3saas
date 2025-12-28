export type ImpactLevel = 'alto' | 'medio' | 'baixo' | 'muito-alto';

export interface ComercialEvent {
  id: string;
  nome: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim?: string; // YYYY-MM-DD
  impacto: ImpactLevel;
  nichos: string[];
  insight: string;
  dica: string;
  preparacao: string; // ex: "15-30 dias antes"
}

export const COMERCIAL_EVENTS_2026: ComercialEvent[] = [
  // JANEIRO
  {
    id: 'ano-novo-2026',
    nome: 'Ano Novo',
    dataInicio: '2026-01-01',
    impacto: 'medio',
    nichos: ['Moda praia', 'Fitness', 'Organização', 'Bem-estar'],
    insight: 'Consumo não essencial desacelera. Classe C compra mais entre dias 1-10.',
    dica: 'Limpar estoque, ofertas simples, foco em caixa',
    preparacao: '15 dias antes'
  },
  {
    id: 'ferias-janeiro-2026',
    nome: 'Férias Escolares',
    dataInicio: '2026-01-01',
    dataFim: '2026-01-31',
    impacto: 'medio',
    nichos: ['Infantil', 'Lazer', 'Eletrônicos'],
    insight: 'Mais tempo online, mas ticket contido',
    dica: 'Ofertas acessíveis, parcelamento',
    preparacao: 'Durante o mês'
  },
  // FEVEREIRO
  {
    id: 'carnaval-2026',
    nome: 'Carnaval',
    dataInicio: '2026-02-17',
    impacto: 'medio',
    nichos: ['Moda', 'Beleza', 'Bebidas', 'Fantasia'],
    insight: 'Consumo concentrado antes do feriado',
    dica: 'Campanhas curtas, urgência, entrega rápida',
    preparacao: '20 dias antes'
  },
  {
    id: 'pos-carnaval-2026',
    nome: 'Pós-Carnaval',
    dataInicio: '2026-02-18',
    dataFim: '2026-02-28',
    impacto: 'baixo',
    nichos: ['Todos'],
    insight: 'Queda de conversão natural',
    dica: 'Reduzir CAC alvo, focar remarketing',
    preparacao: 'Após Carnaval'
  },
  // MARÇO
  {
    id: 'volta-aulas-2026',
    nome: 'Volta às Aulas (residual)',
    dataInicio: '2026-03-01',
    dataFim: '2026-03-15',
    impacto: 'baixo',
    nichos: ['Infantil', 'Papelaria'],
    insight: 'Última chance de campanhas escolares',
    dica: 'Liquidar estoque escolar remanescente',
    preparacao: 'Início do mês'
  },
  {
    id: 'prep-pascoa-2026',
    nome: 'Preparação Páscoa',
    dataInicio: '2026-03-15',
    dataFim: '2026-03-31',
    impacto: 'medio',
    nichos: ['Chocolates', 'Presentes', 'Infantil'],
    insight: 'Período de planejamento e estoque',
    dica: 'Planejar estoque e kits',
    preparacao: '30 dias antes da Páscoa'
  },
  // ABRIL
  {
    id: 'pascoa-2026',
    nome: 'Páscoa',
    dataInicio: '2026-04-05',
    impacto: 'alto',
    nichos: ['Chocolates', 'Presentes', 'Infantil'],
    insight: 'Forte apelo emocional. Datas emocionais ↑ conversão.',
    dica: 'Kits, tickets médios maiores, prazos claros de entrega',
    preparacao: '30 dias antes'
  },
  {
    id: 'pos-pascoa-2026',
    nome: 'Pós-Páscoa',
    dataInicio: '2026-04-06',
    dataFim: '2026-04-30',
    impacto: 'baixo',
    nichos: ['Todos'],
    insight: 'Conversão cai rapidamente',
    dica: 'Remarketing e queima de estoque sazonal',
    preparacao: 'Após Páscoa'
  },
  // MAIO
  {
    id: 'dia-maes-2026',
    nome: 'Dia das Mães',
    dataInicio: '2026-05-10',
    impacto: 'muito-alto',
    nichos: ['Moda', 'Beleza', 'Presentes', 'Infantil', 'Casa'],
    insight: 'Uma das datas mais fortes do ano. Apelo emocional altíssimo.',
    dica: 'Antecipar 20-30 dias, kits e storytelling',
    preparacao: '30 dias antes'
  },
  // JUNHO
  {
    id: 'dia-namorados-2026',
    nome: 'Dia dos Namorados',
    dataInicio: '2026-06-12',
    impacto: 'alto',
    nichos: ['Moda', 'Beleza', 'Presentes', 'Joias'],
    insight: 'Ticket médio sobe. Classe B compra por status e presente.',
    dica: 'Comunicação emocional, combos de presentes',
    preparacao: '25 dias antes'
  },
  {
    id: 'festas-juninas-2026',
    nome: 'Festas Juninas',
    dataInicio: '2026-06-01',
    dataFim: '2026-06-30',
    impacto: 'medio',
    nichos: ['Moda', 'Alimentos', 'Decoração'],
    insight: 'Período prolongado de consumo temático',
    dica: 'Tematização simples, não exagerar em estoque',
    preparacao: 'Durante o mês'
  },
  // JULHO
  {
    id: 'ferias-julho-2026',
    nome: 'Férias Escolares',
    dataInicio: '2026-07-01',
    dataFim: '2026-07-31',
    impacto: 'medio',
    nichos: ['Infantil', 'Eletrônicos', 'Lazer'],
    insight: 'Aumento de tráfego, conversão variável',
    dica: 'Ofertas acessíveis, parcelamento',
    preparacao: 'Durante o mês'
  },
  {
    id: 'liquidacao-inverno-2026',
    nome: 'Liquidações de Inverno',
    dataInicio: '2026-07-15',
    dataFim: '2026-07-31',
    impacto: 'alto',
    nichos: ['Moda'],
    insight: 'Oportunidade de giro de estoque sazonal',
    dica: 'Giro de estoque, margens controladas',
    preparacao: 'Início de julho'
  },
  // AGOSTO
  {
    id: 'dia-pais-2026',
    nome: 'Dia dos Pais',
    dataInicio: '2026-08-09',
    impacto: 'medio',
    nichos: ['Moda masculina', 'Eletrônicos', 'Ferramentas', 'Bebidas'],
    insight: 'Menor que Dia das Mães, mas relevante',
    dica: 'Comunicação prática e objetiva',
    preparacao: '20 dias antes'
  },
  // SETEMBRO
  {
    id: 'troca-estacao-2026',
    nome: 'Troca de Estação (Primavera)',
    dataInicio: '2026-09-22',
    impacto: 'medio',
    nichos: ['Moda', 'Casa', 'Jardinagem'],
    insight: 'Renovação de consumo, novas coleções',
    dica: 'Lançar novas coleções, comunicar novidades',
    preparacao: '15 dias antes'
  },
  // OUTUBRO
  {
    id: 'dia-criancas-2026',
    nome: 'Dia das Crianças',
    dataInicio: '2026-10-12',
    impacto: 'alto',
    nichos: ['Infantil', 'Brinquedos', 'Games', 'Roupas infantis'],
    insight: 'Estoque e logística são críticos',
    dica: 'Planejar estoque com antecedência, kits de presente',
    preparacao: '30 dias antes'
  },
  // NOVEMBRO
  {
    id: 'black-friday-2026',
    nome: 'Black Friday',
    dataInicio: '2026-11-27',
    impacto: 'muito-alto',
    nichos: ['Todos'],
    insight: 'Volume alto, margem em risco. Datas promocionais ↑ volume, ↓ margem se mal controladas.',
    dica: 'Planejar preço mínimo e CAC máximo com antecedência',
    preparacao: '45-60 dias antes'
  },
  {
    id: 'esquenta-black-2026',
    nome: 'Esquenta Black Friday',
    dataInicio: '2026-11-20',
    dataFim: '2026-11-26',
    impacto: 'alto',
    nichos: ['Todos'],
    insight: 'Consumidores pesquisam preços, remarketing efetivo',
    dica: 'Campanhas de aquecimento e captação de leads',
    preparacao: '30 dias antes'
  },
  // DEZEMBRO
  {
    id: 'natal-2026',
    nome: 'Natal',
    dataInicio: '2026-12-25',
    impacto: 'muito-alto',
    nichos: ['Todos'],
    insight: 'Conversão alta até ~20/12. Após isso, logística crítica.',
    dica: 'Focar em entregas garantidas, comunicar prazos',
    preparacao: '45 dias antes'
  },
  {
    id: 'compras-natal-2026',
    nome: 'Período de Compras Natalinas',
    dataInicio: '2026-12-01',
    dataFim: '2026-12-20',
    impacto: 'muito-alto',
    nichos: ['Todos'],
    insight: 'Período mais intenso de vendas do ano',
    dica: 'Estoque preparado, logística otimizada, atendimento reforçado',
    preparacao: '30 dias antes'
  },
  {
    id: 'pos-natal-2026',
    nome: 'Pós-Natal / Ano Novo',
    dataInicio: '2026-12-26',
    dataFim: '2026-12-31',
    impacto: 'baixo',
    nichos: ['Todos'],
    insight: 'Queda natural, foco em caixa',
    dica: 'Queima de estoque, preparar balanço do ano',
    preparacao: 'Após Natal'
  }
];

export function getEventsForMonth(month: number): ComercialEvent[] {
  // month is 0-indexed (0 = January)
  const monthStr = String(month + 1).padStart(2, '0');
  return COMERCIAL_EVENTS_2026.filter(event => {
    const startMonth = event.dataInicio.substring(5, 7);
    const endMonth = event.dataFim?.substring(5, 7);
    
    if (startMonth === monthStr) return true;
    if (endMonth === monthStr) return true;
    
    // Check if month is within range
    if (event.dataFim) {
      const start = parseInt(event.dataInicio.substring(5, 7));
      const end = parseInt(event.dataFim.substring(5, 7));
      const current = month + 1;
      if (current >= start && current <= end) return true;
    }
    
    return false;
  });
}

export function getImpactColor(impact: ImpactLevel): string {
  switch (impact) {
    case 'muito-alto':
      return 'bg-red-500 text-white';
    case 'alto':
      return 'bg-orange-500 text-white';
    case 'medio':
      return 'bg-yellow-500 text-black';
    case 'baixo':
      return 'bg-gray-400 text-white';
    default:
      return 'bg-gray-400 text-white';
  }
}

export function getImpactLabel(impact: ImpactLevel): string {
  switch (impact) {
    case 'muito-alto':
      return 'Muito Alto';
    case 'alto':
      return 'Alto';
    case 'medio':
      return 'Médio';
    case 'baixo':
      return 'Baixo';
    default:
      return impact;
  }
}
