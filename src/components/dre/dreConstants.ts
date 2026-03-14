export const FIXED_EXPENSE_PRESETS = [
  {
    categoria: "Pessoal",
    items: [
      "Pró-labore / Salário do dono",
      "Salários de funcionários",
      "Encargos trabalhistas (FGTS, INSS patronal)",
    ],
  },
  {
    categoria: "Estrutura",
    items: [
      "Aluguel de escritório / depósito",
      "Energia elétrica",
      "Internet e telefone",
      "Água e saneamento",
      "IPTU (rateio mensal)",
    ],
  },
  {
    categoria: "Tecnologia e Plataformas",
    items: [
      "Plataforma de e-commerce (Nuvemshop, Shopify, etc.)",
      "ERP / Sistema de gestão (Tiny, Bling, etc.)",
      "Ferramentas de marketing (RD Station, Klaviyo, etc.)",
      "Certificado digital",
      "Domínio e hospedagem",
      "Outros SaaS e softwares",
    ],
  },
  {
    categoria: "Financeiro e Jurídico",
    items: [
      "Contador / Assessoria fiscal",
      "Advogado / Assessoria jurídica",
      "Tarifas bancárias e IOF",
      "Antecipação de recebíveis (custo médio mensal)",
    ],
  },
  {
    categoria: "Logística Fixa",
    items: [
      "Aluguel de galpão / fulfillment",
      "Seguro de estoque",
      "Embalagens (custo fixo mensal estimado)",
    ],
  },
  {
    categoria: "Marketing Fixo",
    items: [
      "Criação de conteúdo / Social media",
      "Influenciadores (contratos fixos)",
      "Fotografia e vídeo recorrente",
    ],
  },
  {
    categoria: "Outros",
    items: ["Outros custos fixos"],
  },
];

export const ONETIME_EXPENSE_CATEGORIES = [
  "Compra de estoque extra",
  "Manutenção",
  "Equipamentos",
  "Viagem/Evento",
  "Imposto avulso",
  "Devolução/Reembolso",
  "Outros",
];

export const ONETIME_REVENUE_CATEGORIES = [
  "Venda Física",
  "Serviço",
  "Consultoria",
  "Liquidação de estoque",
  "Outras receitas",
];

export const DRE_TOOLTIPS = {
  cmv: "Quanto você gasta para comprar ou produzir os produtos que vende. Ex: se vende por R$100 e pagou R$40 no fornecedor, seu CMV é 40%",
  impostos: "Simples Nacional, MEI (DAS), Lucro Presumido, etc. Consulte seu contador para saber a alíquota correta",
  taxas: "Taxas de marketplace (Mercado Livre, Shopee), taxas de cartão (3-5%), taxas de boleto, etc.",
  frete: "Diferença entre o frete que você paga à transportadora e o que cobra do cliente. Se oferece frete grátis, coloque o percentual total do frete sobre as vendas",
  despesasAvulsas: "Gastos que não se repetem todo mês — compras pontuais, manutenções, impostos extras, etc.",
  receitasAvulsas: "Receitas que não passam pelas suas integrações — vendas presenciais, serviços prestados, etc.",
};

export const FIXED_EXPENSE_CATEGORIES = FIXED_EXPENSE_PRESETS.map((p) => p.categoria);


export const DRE_ADJUSTMENT_CATEGORIES = [
  "descontos",
  "reembolsos",
  "chargebacks",
  "outras_receitas",
  "outras_despesas_operacionais",
];
