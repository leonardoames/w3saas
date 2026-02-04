import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// ==================================================================================
// MÓDULOS OTIMIZADOS (PREMIUM VISUAL & ESTRATÉGICO)
// ==================================================================================
const MODE_INSTRUCTIONS: Record<string, string> = {
  "copy-site": `
MODO: Copywriting Premium para E-commerce (Landing Page High-End)

OBJETIVO: Criar uma estrutura de página de vendas visualmente impressionante e focada em conversão, usando HTML e CSS Inline moderno.

INSTRUÇÕES DE DESIGN E CONTEÚDO:
Gere um código HTML que possa ser renderizado diretamente, contendo:
1. **Estilo Inline (CSS):** Use divs com \`style="..."\` para criar cards com sombra suave, botões de CTA pulsantes e tipografia hierárquica.
2. **Estrutura:** - Hero Section (Headline + Subheadline + CTA).
   - Grid de Benefícios (Ícones + Títulos curtos).
   - Prova Social (Simulação de reviews).
   - Tabela Técnica (Zebrada).
   - FAQ (Perguntas de objeção).

FORMATO DE SAÍDA OBRIGATÓRIO (HTML):
<div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 800px; margin: 0 auto; color: #333; line-height: 1.6;">
  <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #f9f9f9 0%, #e3e3e3 100%); border-radius: 12px; margin-bottom: 30px;">
    <h1 style="color: #e65100; margin-bottom: 10px; font-size: 2.2rem;">[Headline de Alto Impacto]</h1>
    <p style="font-size: 1.1rem; color: #555;">[Subheadline que ataca a dor principal]</p>
    <button style="background-color: #e65100; color: white; padding: 15px 30px; border: none; border-radius: 50px; font-weight: bold; font-size: 1rem; cursor: pointer; margin-top: 20px; box-shadow: 0 4px 6px rgba(230, 81, 0, 0.3);">COMPRAR AGORA ➔</button>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px;">
    <div style="padding: 20px; border: 1px solid #eee; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
       <h3 style="color: #e65100;">✨ [Benefício 1]</h3>
       <p>[Descrição curta]</p>
    </div>
    </div>

  <div style="margin-bottom: 40px;">
     <h2>Por que você precisa disso?</h2>
     <p>[Texto focado na transformação do usuário, usando parágrafos curtos]</p>
  </div>

  <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
    <h3>📋 Ficha Técnica</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 10px; font-weight: bold;">Característica</td><td style="padding: 10px;">Valor</td></tr>
    </table>
  </div>
  
  <div style="margin-top: 30px; padding: 15px; border-left: 4px solid #4CAF50; background: #e8f5e9;">
    <p>🛡️ <strong>Garantia Blindada:</strong> [Texto de garantia]</p>
  </div>
</div>
`,

  "copy-marketplace": `
MODO: Estrategista Global de Marketplaces (Omnichannel)

OBJETIVO: Criar anúncios otimizados respeitando a "psicologia" e o algoritmo de cada plataforma (ML, Shopee, Amazon, Shein, Temu).

INSTRUÇÕES ESTRATÉGICAS:
1. **Mercado Livre (Meli):** Foco em dados técnicos e rapidez. Título RÍGIDO de 60 caracteres. Descrição em "Pirâmide Invertida" (o mais importante primeiro).
2. **Shopee / Temu:** Foco em descoberta e gamificação. Títulos longos permitidos, uso estratégico de Emojis ⚡🔥, Hashtags e gatilhos de urgência.
3. **Amazon:** Foco em SEO Semântico e Confiança. Títulos longos com palavras-chave. O foco são os 5 Bullet Points (Sobre este item).
4. **Shein:** Foco em Lifestyle e Tendência. Linguagem de moda/decoração, "Vibe" do produto, Guia de Tamanhos obrigatório.

FORMATO DE SAÍDA (HTML VISUAL):

<div style="font-family: sans-serif; color: #333;">

  <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <h3 style="margin-top:0;">🧠 Estratégia Central</h3>
    <p><strong>Palavra-chave Principal:</strong> [KW Principal]</p>
    <p><strong>Diferencial Competitivo:</strong> [O que destaca esse produto]</p>
  </div>

  <div style="border: 1px solid #ffe600; border-left: 6px solid #ffe600; padding: 15px; margin-bottom: 20px; border-radius: 6px;">
    <h3 style="color: #2d3277; margin-top: 0;">💛 Mercado Livre (Técnico)</h3>
    <p><strong>Título (Max 60 chars):</strong><br>
    [Produto] [Marca] [Modelo] [Atributo Principal]</p>
    
    <p><strong>Ficha Técnica (Essencial para Ranking):</strong></p>
    <ul>
      <li><strong>Marca/Modelo:</strong> ...</li>
      <li><strong>Características Chave:</strong> ...</li>
    </ul>
    
    <p><strong>Descrição (Plain Text):</strong><br>
    [Texto direto. Foco em compatibilidade, itens inclusos e garantia. Sem links. Sem saudações longas].</p>
  </div>

  <div style="border: 1px solid #ee4d2d; border-left: 6px solid #ee4d2d; padding: 15px; margin-bottom: 20px; border-radius: 6px;">
    <h3 style="color: #ee4d2d; margin-top: 0;">🧡 Shopee & Temu (Descoberta)</h3>
    <p><strong>Título Chamativo (Com Emojis):</strong><br>
    🔥 [Benefício] [Nome Produto] [Adjetivo] ⚡ Envio Rápido</p>
    
    <p><strong>Descrição (Gatilhos):</strong><br>
    🛑 PARE DE SOFRER COM [Problema]!<br>
    ✨ <strong>POR QUE AMAMOS:</strong><br>
    ✅ [Benefício 1]<br>
    🚚 <strong>Estoque no Brasil | Envio Imediato</strong>
    </p>
    <p><strong>Hashtags:</strong> #[Nicho] #[Produto] #Promoção</p>
  </div>

  <div style="border: 1px solid #232f3e; border-left: 6px solid #232f3e; padding: 15px; margin-bottom: 20px; border-radius: 6px;">
    <h3 style="color: #232f3e; margin-top: 0;">💙 Amazon (Confiança & SEO)</h3>
    <p><strong>Título (Longo & Rico):</strong><br>
    [Marca] [Nome Produto], [Característica 1], [Característica 2], Ideal para [Uso], [Cor/Tamanho]</p>
    
    <p><strong>Bullet Points (Sobre este item - Vital):</strong></p>
    <ul>
      <li>🔹 <strong>[BENEFÍCIO 1]:</strong> [Explicação detalhada com palavras-chave].</li>
      <li>🔹 <strong>[BENEFÍCIO 2]:</strong> [Explicação detalhada focada em materiais/tecnologia].</li>
      <li>🔹 <strong>[BENEFÍCIO 3]:</strong> [Explicação detalhada focada em durabilidade].</li>
    </ul>
  </div>

  <div style="border: 1px solid #000; border-left: 6px solid #000; padding: 15px; margin-bottom: 20px; border-radius: 6px;">
    <h3 style="color: #000; margin-top: 0;">🖤 Shein (Trend & Vibe)</h3>
    <p><strong>Título:</strong> [Estilo] [Nome do Produto] [Detalhe Visual]</p>
    <p><strong>Descrição:</strong> A peça que faltava no seu [Look/Casa]. Com design [Adjetivo], traz aquela vibe [Estilo] tendência.</p>
    <p><strong>Medidas:</strong> [Guia de tamanhos claro]</p>
  </div>

</div>
`,

  seo: `
MODO: Auditoria e Estratégia de SEO (Google & E-commerce)

OBJETIVO: Analisar o conteúdo como um "Googlebot" e sugerir melhorias estruturais e semânticas.

INSTRUÇÕES:
1. **Intenção:** Identifique se é Transacional (comprar) ou Informacional (aprender).
2. **Estrutura:** Verifique H1, Title Tag e Meta Description.
3. **Dados Estruturados:** Sugira Schema Markup para Rich Snippets.

FORMATO DE SAÍDA:
<h4>🔍 Raio-X de SEO</h4>
<p><strong>Intenção da KW:</strong> [Transacional/Informacional]</p>
<p><strong>Dificuldade Estimada:</strong> [Baixa/Média/Alta]</p>

<h4>🏗️ Estrutura On-Page Recomendada</h4>
<ul>
  <li><strong>Title Tag:</strong> [Título com gatilho de clique] (aprox. 55 chars)</li>
  <li><strong>Meta Description:</strong> [Resumo persuasivo com CTA] (aprox. 155 chars)</li>
  <li><strong>H1:</strong> [Palavra-chave exata + Benefício Principal]</li>
  <li><strong>H2s (Subtópicos):</strong> [Lista de tópicos para cobrir a semântica]</li>
</ul>

<h4>🤖 Dados Estruturados (Schema.org)</h4>
<p>Recomendo implementar o JSON-LD do tipo: <strong>[Product / Article / FAQPage]</strong> para ganhar destaque na SERP.</p>

<h4>🚀 Oportunidades (Gap Analysis)</h4>
<ul>
  <li>[O que falta no conteúdo para superar o top 3 do Google]</li>
</ul>
`,

  diagnostico: `
MODO: Diagnóstico de Performance com Metodologia ICE

OBJETIVO: Analisar métricas, encontrar o gargalo e priorizar a solução baseada em ROI.

INSTRUÇÕES:
1. **Analise o Funil:** Impressões -> CTR -> Conversão.
2. **Priorização ICE:** Impacto (I), Confiança (C), Facilidade (E).
3. **Apresentação:** Use tabelas visuais.

FORMATO DE SAÍDA:
<h4>📊 Análise do Funil</h4>
<div style="background:#f0f0f0; padding:15px; border-radius:8px; border-left: 5px solid #d32f2f;">
  <p><strong>Diagnóstico Principal:</strong> O problema está na etapa de [Atração/Interesse/Decisão].</p>
  <p><strong>Evidência:</strong> [Dado que comprova, ex: CTR baixo de 0.5%]</p>
</div>

<h4>🚦 Plano de Ação (Matriz ICE)</h4>
<table style="width:100%; border-collapse:collapse; margin-top:15px;">
  <tr style="background:#ddd; text-align:left;">
    <th style="padding:8px;">Ação Recomendada</th>
    <th style="padding:8px;">Impacto (0-10)</th>
    <th style="padding:8px;">Prioridade</th>
  </tr>
  <tr>
    <td style="padding:8px;"><strong>1. [Ação Principal]</strong><br><small>[Por que fazer]</small></td>
    <td style="padding:8px;">Alta (9)</td>
    <td style="padding:8px;">🔴 Fazer Agora</td>
  </tr>
  <tr>
    <td style="padding:8px;">2. [Ação Secundária]</td>
    <td style="padding:8px;">Média (6)</td>
    <td style="padding:8px;">🟡 Planejar</td>
  </tr>
</table>

<h4>📈 KPIs de Sucesso</h4>
<ul>
  <li>Meta de CTR: [X]%</li>
  <li>Meta de Conversão: [X]%</li>
</ul>
`,

  anuncios: `
MODO: Copywriting para Tráfego Pago (Meta, Google, Native)

OBJETIVO: Criar anúncios específicos para a mentalidade de cada plataforma.
- **Meta (FB/IG):** Interrupção. Use AIDA (Atenção, Interesse, Desejo, Ação).
- **Google Search:** Intenção. Resposta direta à busca.
- **Native (Taboola):** Curiosidade. Estilo "Notícia" ou "Clickbait Ético".

FORMATO DE SAÍDA:
<h4>🔵 Meta Ads (Facebook & Instagram)</h4>
<div style="border-left: 4px solid #1877F2; padding-left: 10px; margin-bottom: 20px;">
  <p><strong>Ideia de Criativo:</strong> [Descrição visual: ex: Vídeo UGC mostrando problema]</p>
  <p><strong>Headline:</strong> [Curta e urgente, max 40 chars]</p>
  <p><strong>Texto Principal (AIDA):</strong> [Copy focada na dor e solução imediata]</p>
  <p><strong>CTA:</strong> [Comprar Agora / Saiba Mais]</p>
</div>

<h4>🟢 Google Ads (Rede de Pesquisa)</h4>
<div style="border-left: 4px solid #34A853; padding-left: 10px; margin-bottom: 20px;">
  <p><strong>Título 1:</strong> [Palavra-chave Exata]</p>
  <p><strong>Título 2:</strong> [Benefício / Preço]</p>
  <p><strong>Título 3:</strong> [Gatilho de Autoridade]</p>
  <p><strong>Descrição:</strong> [Resumo denso com diferenciais e chamada para ação]</p>
</div>

<h4>🟠 Native Ads (Taboola / Outbrain)</h4>
<div style="border-left: 4px solid #dddddd; padding-left: 10px;">
  <p><strong>Manchete Curiosa:</strong> "O método simples que [Público] está usando para [Resultado]..."</p>
  <p><strong>Imagem Sugerida:</strong> [Foto amadora/realista, close-up, sem texto]</p>
</div>
`,

  "roteiro-influencer": `
MODO: Estratégia de Influenciadores (Briefing + Roteiro)

OBJETIVO: Profissionalizar a abordagem e garantir conteúdo que converte (Reels/TikTok).

FORMATO DE SAÍDA:
<h3>🤝 Parte 1: O Briefing (Abordagem Comercial)</h3>
<p><strong>Assunto:</strong> Parceria com [Sua Marca] 🚀 Proposta para você</p>
<p><strong>Mensagem:</strong> "Oi [Nome]! Acompanhamos seu conteúdo sobre [Nicho] e adoramos sua autenticidade. Temos o produto [Nome] que resolve [Problema] da sua audiência. Topa testar?..."</p>

<h3>🎬 Parte 2: O Roteiro (Estrutura de Retenção)</h3>
<div style="background:#fff; border:1px solid #ddd; padding:15px; border-radius:8px;">
  <h4>00:00 - 00:03s (O Gancho Visual)</h4>
  <p><strong>Visual:</strong> [O que mostrar para parar o scroll]</p>
  <p><strong>Fala:</strong> "Se você [tem o problema], para tudo e olha isso!"</p>
</div>

<div style="background:#fff; border:1px solid #ddd; padding:15px; border-radius:8px; margin-top: 10px;">
  <h4>00:03 - 00:20s (A Transformação)</h4>
  <p><strong>Visual:</strong> [Demonstração do produto em uso/Antes e Depois]</p>
  <p><strong>Fala:</strong> "Eu testei o [Produto] e olha a diferença..."</p>
</div>

<div style="background:#fff; border:1px solid #ddd; padding:15px; border-radius:8px; margin-top: 10px;">
  <h4>00:20 - 00:30s (CTA Único)</h4>
  <p><strong>Fala:</strong> "Clica no link da bio e usa meu cupom [NOME]!"</p>
</div>

<h4>📌 Checklist de Entrega:</h4>
<ul>
  <li>✅ Iluminação natural</li>
  <li>✅ Legendas nativas da plataforma</li>
  <li>✅ Link na bio antes de postar</li>
</ul>
`,
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
      return new Response(JSON.stringify({ error: "Autenticação necessária" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Autenticação inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    console.log("Authenticated user:", userId);
    // ========== FIM AUTENTICAÇÃO ==========

    const { userMessage, mode, chatHistory } = await req.json();

    if (!userMessage || typeof userMessage !== "string") {
      return new Response(JSON.stringify({ error: "userMessage é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(JSON.stringify({ error: "API key da OpenAI não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    const messages: Array<{ role: string; content: string }> = [{ role: "system", content: systemPrompt }];

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
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Chave da API OpenAI inválida ou expirada." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Erro ao processar sua solicitação" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in ia-w3 function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
