import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    ).auth.getUser(token)

    if (userError || !user) throw new Error('Unauthorized')

    // Get integration credentials
    const { data: integration, error: intError } = await supabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'nuvemshop')
      .eq('is_active', true)
      .single()

    if (intError || !integration) throw new Error('Integração Nuvemshop não encontrada ou inativa')

    const { access_token, store_id } = integration.credentials as any
    if (!access_token || !store_id) throw new Error('Credenciais incompletas. Configure access_token e store_id.')

    // Fetch orders from last 90 days
    const since = new Date()
    since.setDate(since.getDate() - 90)
    const sinceStr = since.toISOString()

    let allOrders: any[] = []
    let page = 1
    const perPage = 200

    while (true) {
      const url = `https://api.nuvemshop.com.br/v1/${store_id}/orders?created_at_min=${sinceStr}&per_page=${perPage}&page=${page}&fields=id,total,currency,created_at,payment_status`

      const res = await fetch(url, {
        headers: {
          'Authentication': `bearer ${access_token}`,
          'User-Agent': 'W3SaaS Dashboard (contato@w3saas.com)',
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error(`Nuvemshop API error [${res.status}]:`, errText)
        throw new Error(`Erro na API Nuvemshop: ${res.status}`)
      }

      const orders = await res.json()
      if (!orders || orders.length === 0) break
      allOrders = allOrders.concat(orders)
      if (orders.length < perPage) break
      page++

      // Rate limiting - Nuvemshop allows ~60 req/min
      await new Promise(r => setTimeout(r, 1100))
    }

    console.log(`Fetched ${allOrders.length} orders from Nuvemshop`)

    // Aggregate by date - only paid orders
    const dailyMap: Record<string, { faturamento: number; vendas_quantidade: number; vendas_valor: number }> = {}

    for (const order of allOrders) {
      if (order.payment_status !== 'paid') continue

      const dateKey = order.created_at?.substring(0, 10)
      if (!dateKey) continue

      const total = parseFloat(order.total || '0')

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { faturamento: 0, vendas_quantidade: 0, vendas_valor: 0 }
      }
      dailyMap[dateKey].faturamento += total
      dailyMap[dateKey].vendas_quantidade += 1
      dailyMap[dateKey].vendas_valor += total
    }

    // Upsert into metrics_diarias
    let upsertCount = 0
    for (const [dateKey, metrics] of Object.entries(dailyMap)) {
      const { data: existing } = await supabase
        .from('metrics_diarias')
        .select('id')
        .eq('user_id', user.id)
        .eq('data', dateKey)
        .eq('platform', 'nuvemshop')
        .maybeSingle()

      if (existing) {
        await supabase
          .from('metrics_diarias')
          .update({
            faturamento: metrics.faturamento,
            vendas_quantidade: metrics.vendas_quantidade,
            vendas_valor: metrics.vendas_valor,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('metrics_diarias')
          .insert({
            user_id: user.id,
            data: dateKey,
            platform: 'nuvemshop',
            faturamento: metrics.faturamento,
            vendas_quantidade: metrics.vendas_quantidade,
            vendas_valor: metrics.vendas_valor,
          })
      }
      upsertCount++
    }

    // Update last_sync_at
    await supabase
      .from('user_integrations')
      .update({ last_sync_at: new Date().toISOString(), sync_status: 'connected' })
      .eq('id', integration.id)

    return new Response(JSON.stringify({
      success: true,
      message: `Sincronização concluída! ${allOrders.length} pedidos processados, ${upsertCount} dias atualizados.`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('sync-nuvemshop error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
