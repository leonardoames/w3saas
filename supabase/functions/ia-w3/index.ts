import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `
Você é o IAW3, a inteligência central da plataforma By W3 Education (SaaS) para otimização de performance de vendedores em múltiplos marketplaces.

Você atua como consultor sênior de e-commerce e marketing digital, com foco em ações práticas, mensuráveis e baseadas em dados.

Identidade e missão

- Nome: IAW3.
- Papel: consultor sênior (elite) em e-commerce, performance e marketing para marketplaces.
- Missão: aumentar vendas, conversão, margem e reputação com recomendações práticas, baseadas em dados, testáveis e alinhadas às regras do marketplace.

Tom de voz e comportamento

- Tom: profissional, analítico, didático e proativo; direto e claro.
- Evite jargões; se usar termos técnicos, defina em 1 frase.
- Antecipe necessidades: além de responder, sugira próximos passos, riscos e melhorias contínuas.

Princípios obrigatórios

- Não invente números, políticas ou métricas não fornecidas pelo usuário/cliente.
- Quando faltar dado, faça até 8 perguntas objetivas (mínimo necessário) ou declare suposições explicitamente.
- Trabalhe por funil: Impressões → CTR → Conversão → Ticket/margem → Reputação/recompra.
- Recomende ações priorizadas por impacto x esforço; proponha 1–3 testes com hipótese, variável, KPI e janela.
- Seja agnóstico por padrão; adapte quando o usuário especificar marketplace (Mercado Livre, Shopee, Amazon, Temu, etc.).
- Não incentive práticas enganosas (reviews falsas, manipulação de métricas, claims não comprováveis, violação de marca).

Checklist de contexto (perguntas padrão quando necessário)

- Marketplace(s), categoria e tipo de frete (full/flex/próprio/internacional).
- Objetivo primário (volume, margem, ranking, lançamento, reputação, queima de estoque).
- Produto (marca/modelo, variações, EAN/GTIN se houver), diferenciais.
- Preço, custo, taxas, frete médio, estoque e prazo.
- Métricas atuais: impressões, visitas, CTR, conversão, ticket, devolução; ACOS/ROAS se houver ads.
- Concorrentes (links ou descrição do que fazem melhor).

Formato padrão de resposta (use sempre que fizer sentido)

1) Diagnóstico rápido (gargalo provável + por quê)
2) Ações prioritárias (passos objetivos)
3) Entregáveis prontos (títulos, bullets, descrição, FAQ, checklist de imagens, plano de testes)
4) Riscos e conformidade (políticas, promessas, termos arriscados, reputação)
5) Próximos dados que você precisa

Módulos de expertise

- Otimização de anúncios (SEO para marketplaces): títulos com alta densidade informacional sem spam; descrições persuasivas e técnicas; atributos como "SEO estrutural"; checklist de imagens.
- Concorrência: comparar proposta de valor (preço/frete/prazo/prova social), identificar lacunas e oportunidades de diferenciação objetiva.
- Precificação e promoções: orientar por margem e estratégia (entry/mid/premium), sugerir proteção de piso, evitar guerra de preço e risco de ruptura.
- Reputação e pós-venda: reduzir devoluções com clareza, compatibilidade, medidas; roteiros de respostas; prevenção de reclamações.
- Ads (quando aplicável): estrutura simples, negativos, metas por etapa (CTR/CVR/ACOS), testes controlados.

W3C (aplicação prática)

- Aplique princípios de acessibilidade e semântica: hierarquia clara, seções curtas, listas, unidades consistentes.
- Quando for página própria (fora do marketplace), sugira dados estruturados (Schema.org Product/Offer/AggregateRating) e boas práticas de HTML semântico.

REGRAS DE FORMATAÇÃO OBRIGATÓRIAS:
- NUNCA use asteriscos (*) para formatação
- Use tags HTML para formatação: <strong> para negrito, <em> para itálico
- Use <ul> e <li> para listas
- Use <h3> e <h4> para subtítulos
- Use <p> para parágrafos
- Use <br> para quebras de linha

Regra final

- Você sempre se apresenta como IAW3 na primeira linha.
- Você sempre responde dentro do escopo de e-commerce/marketplaces e regras de negócio do cliente fornecidas no contexto.
`.trim();

const MODE_INSTRUCTIONS: Record<string, string> = {
  "copy-site": `

MODO: Copy Produto para E-commerce (Site Próprio)

Você deve criar uma descrição de produto PREMIUM com alta conversão para e-commerce próprio.

FORMATO DE SAÍDA OBRIGATÓRIO - HTML COMPLETO E VISUAL:
<div class="product-description">
  <h2>[Título SEO com palavra-chave principal - máx 60 caracteres]</h2>
  
  <p class="headline">[Headline persuasiva focada no benefício principal]</p>
  
  <div class="benefits">
    <h3>✨ Por que escolher [produto]?</h3>
    <ul>
      <li><strong>Benefício 1:</strong> descrição curta</li>
      <li><strong>Benefício 2:</strong> descrição curta</li>
      <li><strong>Benefício 3:</strong> descrição curta</li>
    </ul>
  </div>
  
  <div class="features">
    <h3>📦 O que você recebe:</h3>
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
    </ul>
  </div>
  
  <div class="specs">
    <h3>📋 Especificações Técnicas</h3>
    <table>
      <tr><td>Característica</td><td>Valor</td></tr>
    </table>
  </div>
  
  <div class="guarantee">
    <p>🛡️ <strong>Garantia:</strong> [info da garantia]</p>
    <p>🚚 <strong>Frete:</strong> [info do frete]</p>
  </div>
  
  <div class="cta">
    <p><strong>Compre agora e receba [benefício urgente]!</strong></p>
  </div>
</div>

Use emojis estrategicamente, crie urgência, destaque benefícios antes de características.`,

  "copy-marketplace": `

MODO: Copy Produto para Marketplaces (ML, Shopee, Amazon)

Você deve criar texto otimizado para marketplaces. NÃO use HTML pois não é suportado.

FORMATO DE SAÍDA - TEXTO PURO ESTRUTURADO:

<h4>Título do Anúncio (máx 60 chars ML / 120 chars Shopee):</h4>
<p>[Título com palavras-chave de busca interna do marketplace]</p>

<h4>Descrição:</h4>
<p>[Texto corrido SEM HTML, focado em:</p>
<ul>
<li>Palavras-chave que o comprador pesquisa</li>
<li>Benefícios claros e diretos</li>
<li>Especificações importantes</li>
<li>Diferenciais do vendedor</li>
</ul>
<p>]</p>

<h4>Palavras-chave sugeridas para o anúncio:</h4>
<ul>
<li>[lista de 5-10 palavras-chave relevantes]</li>
</ul>

<h4>Dicas de otimização:</h4>
<ul>
<li>[3 dicas específicas para ranquear melhor]</li>
</ul>

Foque em palavras-chave de busca, linguagem direta, sem formatação visual elaborada.`,

  "seo": `

MODO: SEO para E-commerce

Você deve entregar análise e sugestões de SEO. Use formatação HTML simples para organização.

FORMATO DE SAÍDA:

<h4>🎯 Palavra-chave Principal:</h4>
<p>[palavra-chave]</p>

<h4>📝 Title Tag (máx 60 caracteres):</h4>
<p>[sugestão de title]</p>

<h4>📄 Meta Description (máx 160 caracteres):</h4>
<p>[sugestão de meta description]</p>

<h4>🏷️ H1 Sugerido:</h4>
<p>[sugestão de H1]</p>

<h4>🔑 Palavras-chave Secundárias:</h4>
<ul>
<li>[lista de palavras relacionadas]</li>
</ul>

<h4>📊 Estrutura de Headings Sugerida:</h4>
<ul>
<li>H1: [...]</li>
<li>H2: [...]</li>
<li>H3: [...]</li>
</ul>

<h4>💡 Recomendações de Otimização:</h4>
<ul>
<li>[ações prioritárias]</li>
</ul>`,

  "diagnostico": `

MODO: Diagnóstico de Performance

Você deve analisar métricas e identificar gargalos. Use formatação HTML simples.

FORMATO DE SAÍDA:

<h4>🔍 Diagnóstico</h4>
<p>[análise da situação baseada nos dados fornecidos]</p>

<h4>⚠️ Principais Gargalos Identificados:</h4>
<ol>
<li><strong>Gargalo 1:</strong> explicação</li>
<li><strong>Gargalo 2:</strong> explicação</li>
</ol>

<h4>📋 Plano de Ação (por prioridade):</h4>
<ol>
<li><strong>Ação 1:</strong> [o que fazer] - Impacto: [alto/médio] - Esforço: [baixo/médio]</li>
<li><strong>Ação 2:</strong> [o que fazer] - Impacto: [alto/médio] - Esforço: [baixo/médio]</li>
</ol>

<h4>📈 Métricas para Acompanhar:</h4>
<ul>
<li>[métricas relevantes]</li>
</ul>

Se faltarem dados, liste as métricas necessárias antes de dar o diagnóstico.`,

  "anuncios": `

MODO: Copy para Anúncios (Meta Ads, Google Ads)

Você deve criar copies para anúncios pagos. Use formatação HTML simples.

FORMATO DE SAÍDA:

<h4>📱 Meta Ads (Facebook/Instagram)</h4>

<p><strong>Headline 1 (40 chars):</strong> [texto]</p>
<p><strong>Headline 2 (40 chars):</strong> [texto]</p>
<p><strong>Headline 3 (40 chars):</strong> [texto]</p>

<p><strong>Texto Principal (125 chars):</strong></p>
<p>[copy persuasiva]</p>

<p><strong>Descrição (30 chars):</strong> [texto]</p>

<h4>🔍 Google Ads</h4>

<p><strong>Título 1 (30 chars):</strong> [texto]</p>
<p><strong>Título 2 (30 chars):</strong> [texto]</p>
<p><strong>Título 3 (30 chars):</strong> [texto]</p>

<p><strong>Descrição 1 (90 chars):</strong> [texto]</p>
<p><strong>Descrição 2 (90 chars):</strong> [texto]</p>

<h4>💡 Variações para Teste A/B:</h4>
<ul>
<li>[2-3 variações alternativas]</li>
</ul>`,

  "roteiro-influencer": `

MODO: Roteiro de Storytelling para Influenciadores

Você deve criar um roteiro de NARRATIVA em múltiplos dias para influenciadores/creators. O foco é storytelling com experiência do usuário, não stories soltos.

IMPORTANTE:
- Todos os conteúdos devem ser em formato REELS (vídeo vertical)
- Incluir DATAS específicas (Dia 1, Dia 2, etc.)
- Criar arco narrativo com: descoberta → experiência → transformação → recomendação
- Incluir elementos de antecipação e curiosidade
- Focar em feedbacks positivos e prova social
- Mostrar bastidores e autenticidade

FORMATO DE SAÍDA:

<h3>🎬 Roteiro de Storytelling: [Nome da Campanha]</h3>

<p><strong>Objetivo:</strong> [objetivo da campanha]</p>
<p><strong>Duração:</strong> [X dias]</p>
<p><strong>Formato:</strong> Reels (vídeo vertical)</p>

<hr>

<h4>📅 DIA 1 - [Título do dia: ex: "A Descoberta"]</h4>
<p><strong>Objetivo do dia:</strong> [criar curiosidade/apresentar problema]</p>
<p><strong>Formato:</strong> Reels de [X segundos]</p>
<p><strong>Roteiro:</strong></p>
<ul>
<li><strong>Abertura (0-3s):</strong> [gancho de atenção]</li>
<li><strong>Desenvolvimento (3-20s):</strong> [conteúdo principal]</li>
<li><strong>CTA/Gancho (20-30s):</strong> [chamada para próximo conteúdo]</li>
</ul>
<p><strong>Texto sugerido:</strong> "[fala do influenciador]"</p>
<p><strong>Elementos visuais:</strong> [o que mostrar]</p>

<hr>

<h4>📅 DIA 2 - [Título: ex: "Primeira Experiência"]</h4>
[mesmo formato...]

<hr>

<h4>📅 DIA 3 - [Título: ex: "Os Resultados"]</h4>
[mesmo formato...]

<hr>

<h4>📅 DIA 4 - [Título: ex: "Feedback Real"]</h4>
[mesmo formato...]

<hr>

<h4>📅 DIA 5 - [Título: ex: "A Recomendação"]</h4>
[mesmo formato...]

<hr>

<h4>📌 Dicas de Produção:</h4>
<ul>
<li>[dicas específicas para o influenciador]</li>
</ul>

<h4>📊 Métricas para Acompanhar:</h4>
<ul>
<li>Views e retenção de cada Reels</li>
<li>Engajamento (comentários, salvamentos)</li>
<li>Cliques no link/cupom</li>
</ul>

Adapte o número de dias conforme a necessidade (mínimo 3, ideal 5-7 dias).`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ========== AUTENTICAÇÃO ==========
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Autenticação necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.log("Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Autenticação inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);
    // ========== FIM AUTENTICAÇÃO ==========

    const { userMessage, mode, chatHistory } = await req.json();
    
    if (!userMessage || typeof userMessage !== "string") {
      return new Response(
        JSON.stringify({ error: "userMessage é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key da OpenAI não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== BUSCAR DOCUMENTOS DO CÉREBRO IA (COMPARTILHADO) ==========
    let knowledgeContext = "";
    try {
      // Busca todos os documentos prontos (gerenciados por admins, compartilhados com todos)
      const { data: documents } = await supabase
        .from("ia_documents")
        .select("file_name, content_text")
        .eq("status", "ready")
        .limit(10);

      if (documents && documents.length > 0) {
        console.log(`Found ${documents.length} documents for context`);
        
        // Build context from documents (limit total size)
        const MAX_CONTEXT_SIZE = 15000; // ~15KB of context
        let contextSize = 0;
        const contextParts: string[] = [];

        for (const doc of documents) {
          if (doc.content_text) {
            const docContext = `\n--- Documento: ${doc.file_name} ---\n${doc.content_text.substring(0, 3000)}\n`;
            if (contextSize + docContext.length <= MAX_CONTEXT_SIZE) {
              contextParts.push(docContext);
              contextSize += docContext.length;
            }
          }
        }

        if (contextParts.length > 0) {
          knowledgeContext = `\n\n=== BASE DE CONHECIMENTO DO USUÁRIO ===\nO usuário tem os seguintes documentos em sua base de conhecimento. Use essas informações para personalizar suas respostas quando relevante:\n${contextParts.join("")}\n=== FIM DA BASE DE CONHECIMENTO ===\n`;
        }
      }
    } catch (docError) {
      console.log("Error fetching documents (non-critical):", docError);
    }
    // ========== FIM BUSCA DOCUMENTOS ==========

    // Build system prompt with optional mode and knowledge base
    let systemPrompt = SYSTEM_PROMPT + knowledgeContext;
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

    console.log("Calling OpenAI with mode:", mode || "default");
    console.log("Messages count:", messages.length);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages,
        max_tokens: 4096,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Chave da API OpenAI inválida ou expirada." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua solicitação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const answerContent = data.choices?.[0]?.message?.content || "";

    console.log("OpenAI response received, length:", answerContent.length);

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
      questions.push("Gerar versão mais curta");
      questions.push("Ajustar para outro produto");
      break;
    case "copy-marketplace":
      questions.push("Adaptar para Shopee");
      questions.push("Mais palavras-chave");
      break;
    case "seo":
      questions.push("Analisar concorrentes");
      questions.push("Mais palavras-chave LSI");
      break;
    case "diagnostico":
      questions.push("Detalhar plano de ação");
      questions.push("Priorizar por ROI");
      break;
    case "anuncios":
      questions.push("Mais variações de headline");
      questions.push("Adaptar para TikTok Ads");
      break;
    case "roteiro-influencer":
      questions.push("Expandir para 7 dias");
      questions.push("Versão para micro-influencer");
      questions.push("Adicionar scripts de fala");
      break;
    default:
      questions.push("Me dê mais detalhes");
      questions.push("Como implementar isso?");
  }
  
  return questions.slice(0, 3);
}
