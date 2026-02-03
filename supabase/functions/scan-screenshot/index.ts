import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { image, platform } = await req.json();
    
    if (!image) {
      throw new Error('Imagem não enviada');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada. Adicione sua chave nas configurações.');
    }

    console.log(`Processando screenshot da plataforma: ${platform}`);

    const today = new Date().toISOString().split('T')[0];
    
    const systemPrompt = `Você é um especialista em extrair dados numéricos de capturas de tela de painéis de e-commerce brasileiro.

PLATAFORMA SELECIONADA: ${platform || 'e-commerce'}

CAMPOS A EXTRAIR (procure por estes termos e variações):
- faturamento: "Receita", "Vendas", "GMV", "Faturamento", "Total de vendas", "Vendas brutas", "Revenue"
- sessoes: "Visitas", "Visitantes", "Sessões", "Acessos", "Visualizações" (se não encontrar, use 0)
- vendas_quantidade: "Pedidos", "Vendas", "Itens vendidos", "Nº de pedidos", "Orders"
- investimento_trafego: "Gasto", "Investimento", "Custo ads", "Despesas", "Ad Spend" (se não encontrar, use 0)

REGRAS IMPORTANTES:
1. Leia TODOS os números visíveis na imagem
2. Identifique a data se visível, senão use: ${today}
3. Converta valores de texto para números (ex: "R$ 1.234,56" → 1234.56)
4. Se houver múltiplas datas/períodos, crie uma entrada para cada
5. Valores em K (mil) ou M (milhão) devem ser convertidos (1K = 1000, 1M = 1000000)

Retorne APENAS um JSON válido (sem markdown) com este formato:
{
  "metrics": [
    {
      "data": "2026-01-15",
      "faturamento": 1500.50,
      "sessoes": 250,
      "investimento_trafego": 100.00,
      "vendas_quantidade": 12
    }
  ]
}`;

    console.log('Enviando imagem para OpenAI GPT-4o Vision...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { 
                type: 'text', 
                text: `Analise esta captura de tela de ${platform || 'e-commerce'} e extraia TODOS os dados de métricas visíveis. Leia cada número com atenção.` 
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições da OpenAI atingido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: 'Chave da OpenAI inválida ou expirada. Verifique sua OPENAI_API_KEY.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 400) {
        return new Response(JSON.stringify({ error: 'Imagem inválida ou muito grande. Tente uma imagem menor.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Erro da API OpenAI: ${response.status}`);
    }

    const aiData = await response.json();
    console.log('Resposta OpenAI recebida');
    
    const content = aiData.choices?.[0]?.message?.content || '';
    console.log('Conteúdo bruto:', content);
    
    // Limpar markdown se a IA enviar ```json
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    }
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    console.log('JSON extraído:', jsonStr);

    let parsedResult;
    try {
      parsedResult = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      throw new Error('A IA retornou um formato inválido. Tente novamente.');
    }

    if (!Array.isArray(parsedResult.metrics)) {
      throw new Error('Formato de resposta inválido da IA');
    }

    // Normalizar métricas
    const normalizedMetrics = parsedResult.metrics.map((m: any) => {
      let dataFormatted = m.data || today;
      
      // Se a data não estiver no formato YYYY-MM-DD, tentar corrigir
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFormatted)) {
        // Tentar parse de formatos brasileiros (DD/MM/YYYY)
        const brMatch = dataFormatted.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (brMatch) {
          dataFormatted = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
        } else {
          dataFormatted = today;
        }
      }

      return {
        data: dataFormatted,
        platform: platform || 'outros',
        faturamento: Number(m.faturamento) || 0,
        sessoes: Number(m.sessoes) || 0,
        investimento_trafego: Number(m.investimento_trafego) || 0,
        vendas_quantidade: Number(m.vendas_quantidade) || 0,
        vendas_valor: Number(m.vendas_valor) || Number(m.faturamento) || 0,
      };
    }).filter((m: any) => m.data);

    console.log('Métricas normalizadas:', normalizedMetrics.length);

    return new Response(JSON.stringify({
      metrics: normalizedMetrics,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scan screenshot error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro ao processar imagem' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
