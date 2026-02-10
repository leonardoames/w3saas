import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const accessToken = Deno.env.get('NUVEMSHOP_ACCESS_TOKEN')
    const storeId = Deno.env.get('NUVEMSHOP_STORE_ID')

    if (!accessToken || !storeId) {
      throw new Error('Chaves da Nuvemshop não configuradas no Supabase')
    }

    const response = await fetch(`https://api.nuvemshop.com.br/v1/${storeId}/products`, {
      method: 'GET',
      headers: {
        'Authentication': `bearer ${accessToken}`,
        'User-Agent': 'DashboardApp (seuemail@exemplo.com)',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Erro API Nuvemshop:", errorText)
      throw new Error(`Erro Nuvemshop: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
