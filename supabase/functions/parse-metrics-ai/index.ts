import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileContent, userId } = await req.json();
    
    if (!fileContent) {
      throw new Error('Conteúdo do arquivo não enviado');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Limitar amostra para economizar tokens
    const sampleText = fileContent.slice(0, 10000);

    const systemPrompt = `Você é um especialista em análise de dados de E-commerce brasileiro.
Vou te enviar o conteúdo de um arquivo CSV ou Excel (convertido em texto).

Sua tarefa:
1. Identificar de qual plataforma é esse arquivo baseado nas colunas e formato:
   - shopee, amazon, mercado_livre, shein, shopify, nuvemshop, tray, loja_integrada, ou "outros"
2. Extrair os dados diários agregados

IMPORTANTE:
- Datas devem estar no formato YYYY-MM-DD
- Se houver múltiplas linhas para o mesmo dia, some os valores
- Para faturamento, use a coluna de receita bruta/vendas brutas
- Para sessões, use visitas/acessos
- Para vendas_quantidade, use quantidade de pedidos/vendas
- Se um campo não existir no arquivo, use 0

Retorne APENAS um JSON válido (sem markdown) com este formato exato:
{
  "detectedPlatform": "shopee",
  "metrics": [
    {
      "data": "2025-01-15",
      "faturamento": 1500.50,
      "sessoes": 250,
      "investimento_trafego": 0,
      "vendas_quantidade": 12,
      "vendas_valor": 1500.50
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise este arquivo e extraia as métricas:\n\n${sampleText}` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA insuficientes.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Erro ao processar com IA');
    }

    const aiData = await response.json();
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

    const parsedResult = JSON.parse(jsonStr);

    // Validar estrutura
    if (!parsedResult.detectedPlatform || !Array.isArray(parsedResult.metrics)) {
      throw new Error('Formato de resposta inválido da IA');
    }

    // Normalizar métricas
    const normalizedMetrics = parsedResult.metrics.map((m: any) => ({
      data: m.data,
      platform: parsedResult.detectedPlatform,
      faturamento: Number(m.faturamento) || 0,
      sessoes: Number(m.sessoes) || 0,
      investimento_trafego: Number(m.investimento_trafego) || 0,
      vendas_quantidade: Number(m.vendas_quantidade) || 0,
      vendas_valor: Number(m.vendas_valor) || 0,
    })).filter((m: any) => m.data && /^\d{4}-\d{2}-\d{2}$/.test(m.data));

    return new Response(JSON.stringify({
      detectedPlatform: parsedResult.detectedPlatform,
      metrics: normalizedMetrics,
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
