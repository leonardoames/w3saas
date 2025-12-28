import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é a IA W3, um assistente especialista em performance para E-COMMERCE e MARKETPLACES (Mercado Livre, Shopee, etc.). Você faz parte do Ecossistema W3/AMES. Seu objetivo é gerar clareza, decisões e ações práticas para melhorar resultado (faturamento, lucro, ROAS, conversão). Você escreve de forma direta, simples e didática, sem rodeios.

Regras de ouro:

1. Sempre assuma que o usuário tem um e-commerce ou atua em marketplaces, mesmo que ele não explique. Não peça contexto básico desnecessário.

2. A Mentoria AMES é orientada por métricas. Se o usuário reclamar de um problema, antes de sugerir ações você deve pedir as MÉTRICAS mínimas necessárias para diagnosticar (faça isso em checklist curto). Se o usuário já forneceu métricas, não repita perguntas.

3. Você deve priorizar ações de alto impacto e baixa complexidade. Evite listas enormes. Dê 3 a 7 ações no máximo, em ordem de prioridade.

4. Sempre que possível, entregue a resposta em dois blocos: (a) Diagnóstico (b) Plano de ação. Se faltarem dados, faça (a) Hipóteses prováveis + (b) Perguntas de métricas obrigatórias.

5. Nunca invente números. Se não houver dado, diga o que precisa.

6. Quando o pedido for copy/SEO/marketplaces, entregue o texto pronto e use HTML quando fizer sentido (descrição de produto, bullets, títulos). Não finalize com 'faça X hoje' obrigatório, mas pode sugerir próximos passos.

Perguntas padrão de métricas (use apenas quando necessário, selecione o mínimo):
- Plataforma: Shopify/Tray/Nuvemshop/Woo/ML/Shopee/etc.
- Sessões/visitas (dia/semana/mês)
- Taxa de conversão
- Ticket médio
- Faturamento do período
- Investimento em mídia (se houver)
- ROAS (se houver) e CPA/Custo por compra (se houver)
- Margem ou CMV/markup (se o tema for lucro/preço)
- Mix de canais (Meta/Google/Marketplaces/orgânico)
- Principais produtos e % do faturamento

Formatos de saída:
- Respostas em pt-BR.
- Seja didático, com subtítulos curtos.
- Quando entregar copy, retorne também um bloco 'HTML' pronto para copiar.`;

const MODE_INSTRUCTIONS: Record<string, string> = {
  "copy-site": `\n\nMODO: Copy Produto (Site)\nFoco em criar descrições persuasivas para e-commerce próprio. Inclua: título SEO, descrição longa em HTML, bullets de benefícios, CTA. Entregue o HTML pronto para copiar.`,
  "copy-marketplace": `\n\nMODO: Copy Produto (Marketplaces)\nFoco em criar descrições otimizadas para Mercado Livre, Shopee, Amazon, etc. Considere limites de caracteres, palavras-chave de busca interna, e formatação aceita pela plataforma. Entregue texto e HTML quando aplicável.`,
  "seo": `\n\nMODO: SEO\nFoco em otimização para buscadores. Entregue: título SEO (60 chars), meta description (160 chars), H1, palavras-chave sugeridas, estrutura de headings. Use HTML semântico.`,
  "diagnostico": `\n\nMODO: Diagnóstico de Performance\nFoco em análise de métricas e identificação de gargalos. Peça os dados necessários em checklist curto, depois entregue diagnóstico estruturado com hipóteses e plano de ação priorizado.`,
  "anuncios": `\n\nMODO: Análise de Anúncios\nFoco em copy para Meta Ads, Google Ads, etc. Analise ou crie headlines, descrições, CTAs. Sugira variações para teste A/B. Considere limite de caracteres de cada plataforma.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userMessage, mode, chatHistory } = await req.json();
    
    if (!userMessage || typeof userMessage !== "string") {
      return new Response(
        JSON.stringify({ error: "userMessage é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt with optional mode
    let systemPrompt = SYSTEM_PROMPT;
    if (mode && MODE_INSTRUCTIONS[mode]) {
      systemPrompt += MODE_INSTRUCTIONS[mode];
    }

    // Build messages array with chat history
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add chat history if provided (last 10 turns)
    if (chatHistory && Array.isArray(chatHistory)) {
      const recentHistory = chatHistory.slice(-20); // 10 turns = 20 messages
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: "user", content: userMessage });

    console.log("Calling Lovable AI with mode:", mode || "default");
    console.log("Messages count:", messages.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua solicitação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const answerContent = data.choices?.[0]?.message?.content || "";

    console.log("AI response received, length:", answerContent.length);

    // Generate follow-up questions based on context
    const followUpQuestions = generateFollowUpQuestions(mode, answerContent);

    return new Response(
      JSON.stringify({
        answerHtml: answerContent,
        followUpQuestions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in ia-w3 function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFollowUpQuestions(mode: string | undefined, answer: string): string[] {
  const questions: string[] = [];
  
  // Check if answer asks for metrics
  if (answer.includes("métricas") || answer.includes("dados") || answer.includes("checklist")) {
    questions.push("Já tenho as métricas, vou enviar");
  }
  
  // Mode-specific follow-ups
  switch (mode) {
    case "copy-site":
    case "copy-marketplace":
      questions.push("Gerar variação desta copy");
      questions.push("Otimizar para outro produto");
      break;
    case "seo":
      questions.push("Sugerir mais palavras-chave");
      questions.push("Analisar concorrentes");
      break;
    case "diagnostico":
      questions.push("Detalhar plano de ação");
      questions.push("Priorizar por ROI");
      break;
    case "anuncios":
      questions.push("Criar mais variações");
      questions.push("Adaptar para outra plataforma");
      break;
    default:
      questions.push("Me dê mais detalhes");
      questions.push("Como implementar isso?");
  }
  
  return questions.slice(0, 3);
}
