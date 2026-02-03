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

    const { fileContent, imageBase64, platform } = await req.json();
    
    // Verificar se temos conteúdo para processar
    if (!fileContent && !imageBase64) {
      throw new Error('Nenhum conteúdo enviado (arquivo ou imagem)');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const today = new Date().toISOString().split('T')[0];
    
    const systemPrompt = `Você é um especialista em análise de dados de E-commerce brasileiro.
Sua tarefa é extrair métricas de vendas de imagens ou arquivos.

CAMPOS A EXTRAIR:
- faturamento: valor total de vendas/receita
- sessoes: visitas, sessões, acessos (se não encontrar, use 0)
- vendas_quantidade: número de pedidos/vendas
- vendas_valor: igual ao faturamento se não houver campo específico
- investimento_trafego: gasto com anúncios/ads (se não encontrar, use 0)

REGRAS:
- A plataforma selecionada é: ${platform || 'outros'}
- Datas devem estar no formato YYYY-MM-DD
- Se não encontrar data específica, use: ${today}
- Valores numéricos devem ser números (não strings)
- Remova símbolos de moeda (R$) e separadores de milhares
- Se um campo não existir, use 0

Retorne APENAS um JSON válido (sem markdown) com este formato:
{
  "metrics": [
    {
      "data": "2026-01-15",
      "faturamento": 1500.50,
      "sessoes": 250,
      "investimento_trafego": 100.00,
      "vendas_quantidade": 12,
      "vendas_valor": 1500.50
    }
  ]
}`;

    let messages: any[];

    if (imageBase64) {
      // Processamento de imagem com GPT-4 Vision
      console.log('Processando imagem com GPT-4 Vision...');
      
      messages = [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            { 
              type: 'text', 
              text: `Analise esta imagem de relatório da plataforma ${platform || 'e-commerce'} e extraia as métricas de vendas. Leia todos os números visíveis.` 
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`,
                detail: 'high'
              }
            }
          ]
        }
      ];
    } else {
      // Processamento de arquivo texto
      console.log('Processando arquivo texto...');
      const sampleText = fileContent.slice(0, 10000);
      
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analise este arquivo e extraia as métricas:\n\n${sampleText}` }
      ];
    }

    console.log('Enviando para OpenAI...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
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
        return new Response(JSON.stringify({ error: 'Chave da OpenAI inválida ou expirada.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Erro da API OpenAI: ${response.status}`);
    }

    const aiData = await response.json();
    console.log('Resposta OpenAI recebida');
    
    const content = aiData.choices?.[0]?.message?.content || '';
    
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

    const parsedResult = JSON.parse(jsonStr);

    // Validar estrutura
    if (!Array.isArray(parsedResult.metrics)) {
      throw new Error('Formato de resposta inválido da IA');
    }

    // Normalizar métricas
    const normalizedMetrics = parsedResult.metrics.map((m: any) => ({
      data: m.data || today,
      platform: platform || 'outros',
      faturamento: Number(m.faturamento) || 0,
      sessoes: Number(m.sessoes) || 0,
      investimento_trafego: Number(m.investimento_trafego) || 0,
      vendas_quantidade: Number(m.vendas_quantidade) || 0,
      vendas_valor: Number(m.vendas_valor) || 0,
    })).filter((m: any) => m.data);

    // Garantir que datas estejam no formato correto
    const finalMetrics = normalizedMetrics.map((m: any) => {
      let dataFormatted = m.data;
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
      return { ...m, data: dataFormatted };
    });

    console.log('Métricas normalizadas:', finalMetrics.length);

    return new Response(JSON.stringify({
      detectedPlatform: platform || 'outros',
      metrics: finalMetrics,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Parse metrics error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro ao processar arquivo' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
