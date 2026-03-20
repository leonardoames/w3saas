import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

interface DailyMetrics {
  faturamento: number
  vendas_quantidade: number
  vendas_valor: number
  investimento_trafego: number
  impressoes: number
  cliques: number
}

function emptyMetrics(): DailyMetrics {
  return { faturamento: 0, vendas_quantidade: 0, vendas_valor: 0, investimento_trafego: 0, impressoes: 0, cliques: 0 }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) throw new Error("Missing authorization header")

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const token = authHeader.replace("Bearer ", "")
    const {
      data: { user },
      error: userError,
    } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(token)

    if (userError || !user) throw new Error("Unauthorized")

    // Get integration credentials
    const { data: integration, error: intError } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "mercado_livre")
      .eq("is_active", true)
      .single()

    if (intError || !integration)
      throw new Error("Integração Mercado Livre não encontrada ou inativa")

    const creds = integration.credentials as any
    let accessToken = creds?.access_token
    const refreshToken = creds?.refresh_token
    const sellerId = creds?.seller_id

    if (!accessToken || !sellerId) throw new Error("Credenciais do Mercado Livre incompletas")

    // Refresh token if needed
    const tokenAge = creds?.obtained_at
      ? (Date.now() - new Date(creds.obtained_at).getTime()) / 1000
      : Infinity
    const expiresIn = creds?.expires_in || 21600

    if (refreshToken && tokenAge > expiresIn * 0.8) {
      console.log("Refreshing ML access token...")
      const refreshRes = await fetch("https://api.mercadolibre.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          client_id: Deno.env.get("ML_CLIENT_ID"),
          client_secret: Deno.env.get("ML_CLIENT_SECRET"),
          refresh_token: refreshToken,
        }),
      })
      const refreshData = await refreshRes.json()

      if (refreshData.access_token) {
        accessToken = refreshData.access_token
        await supabase
          .from("user_integrations")
          .update({
            credentials: {
              ...creds,
              access_token: refreshData.access_token,
              refresh_token: refreshData.refresh_token || refreshToken,
              expires_in: refreshData.expires_in,
              obtained_at: new Date().toISOString(),
            },
          })
          .eq("id", integration.id)
        console.log("ML token refreshed successfully")
      } else {
        console.warn("Failed to refresh ML token, using existing:", refreshData)
      }
    }

    const dailyMap: Record<string, DailyMetrics> = {}

    // ── 1. FETCH ORDERS (last 90 days) ──────────────────────────────────
    const since = new Date()
    since.setDate(since.getDate() - 90)
    const sinceStr = since.toISOString().split(".")[0] + ".000-00:00"

    let allOrders: any[] = []
    let offset = 0
    const limit = 50

    while (true) {
      const url =
        `https://api.mercadolibre.com/orders/search?seller=${sellerId}` +
        `&order.date_created.from=${encodeURIComponent(sinceStr)}` +
        `&sort=date_desc&limit=${limit}&offset=${offset}`

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error(`ML Orders API error [${res.status}]:`, errText)
        break
      }

      const data = await res.json()
      const results = data.results || []
      allOrders = allOrders.concat(results)

      if (results.length < limit || allOrders.length >= (data.paging?.total || 0)) break
      offset += limit
      await new Promise((r) => setTimeout(r, 1100))
    }

    console.log(`Fetched ${allOrders.length} orders from Mercado Livre`)

    for (const order of allOrders) {
      if (order.status !== "paid") continue
      const dateKey = order.date_created?.substring(0, 10)
      if (!dateKey) continue
      const total = parseFloat(order.total_amount || "0")
      if (!dailyMap[dateKey]) dailyMap[dateKey] = emptyMetrics()
      dailyMap[dateKey].faturamento += total
      dailyMap[dateKey].vendas_quantidade += 1
      dailyMap[dateKey].vendas_valor += total
    }

    // ── 2. FETCH ADS DATA (Product Ads - last 90 days) ──────────────────
    const now = new Date()
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Format dates as YYYY-MM-DD for the Ads API
    const fmtDate = (d: Date) => d.toISOString().substring(0, 10)

    // Chunk into 30-day windows (API max range)
    const chunkDays = 30
    let chunkStart = new Date(ninetyDaysAgo)
    let totalAdsDays = 0

    while (chunkStart < now) {
      const chunkEnd = new Date(Math.min(chunkStart.getTime() + chunkDays * 24 * 60 * 60 * 1000, now.getTime()))
      const dateFrom = fmtDate(chunkStart)
      const dateTo = fmtDate(chunkEnd)

      console.log(`[ML ADS] Fetching campaigns: ${dateFrom} → ${dateTo}`)

      try {
        // Fetch all campaigns with daily metrics
        const adsUrl =
          `https://api.mercadolibre.com/advertising/advertisers/${sellerId}/product_ads/campaigns` +
          `?date_from=${dateFrom}&date_to=${dateTo}` +
          `&metrics=clicks,prints,cost` +
          `&daily_budget=true&limit=100&offset=0`

        const adsRes = await fetch(adsUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "api-version": "2",
          },
        })

        if (!adsRes.ok) {
          const errText = await adsRes.text()
          console.error(`[ML ADS] API error [${adsRes.status}]:`, errText)
        } else {
          const adsData = await adsRes.json()
          const campaigns = adsData.results || []

          console.log(`[ML ADS] Got ${campaigns.length} campaigns for ${dateFrom}-${dateTo}`)

          for (const campaign of campaigns) {
            // Check for daily_metrics array (api-version: 2 returns this)
            const dailyMetrics = campaign.daily_metrics || campaign.metrics_by_day || []

            if (dailyMetrics.length > 0) {
              for (const day of dailyMetrics) {
                const dayDate = day.date
                if (!dayDate) continue
                if (!dailyMap[dayDate]) dailyMap[dayDate] = emptyMetrics()
                dailyMap[dayDate].investimento_trafego += Number(day.cost || 0)
                dailyMap[dayDate].impressoes += Number(day.prints || day.impressions || 0)
                dailyMap[dayDate].cliques += Number(day.clicks || 0)
                totalAdsDays++
              }
            } else {
              // Fallback: campaign-level aggregate metrics
              const metrics = campaign.metrics || {}
              if (metrics.cost > 0 || metrics.clicks > 0 || metrics.prints > 0) {
                // Use campaign date range to distribute (or use dateFrom as fallback)
                const campDate = campaign.last_updated?.substring(0, 10) || dateFrom
                if (!dailyMap[campDate]) dailyMap[campDate] = emptyMetrics()
                dailyMap[campDate].investimento_trafego += Number(metrics.cost || 0)
                dailyMap[campDate].impressoes += Number(metrics.prints || 0)
                dailyMap[campDate].cliques += Number(metrics.clicks || 0)
                totalAdsDays++
              }
            }
          }
        }
      } catch (adsErr) {
        console.error(`[ML ADS] Error fetching ${dateFrom}-${dateTo}:`, adsErr)
      }

      await new Promise((r) => setTimeout(r, 500))
      chunkStart = new Date(chunkEnd.getTime() + 24 * 60 * 60 * 1000)
    }

    console.log(`[ML ADS] Processed ${totalAdsDays} campaign-day entries`)

    // ── 3. UPSERT INTO metrics_diarias ──────────────────────────────────
    let upsertCount = 0
    for (const [dateKey, metrics] of Object.entries(dailyMap)) {
      const { data: existing } = await supabase
        .from("metrics_diarias")
        .select("id")
        .eq("user_id", user.id)
        .eq("data", dateKey)
        .eq("platform", "mercado_livre")
        .maybeSingle()

      const row = {
        faturamento: metrics.faturamento,
        vendas_quantidade: metrics.vendas_quantidade,
        vendas_valor: metrics.vendas_valor,
        investimento_trafego: metrics.investimento_trafego,
        impressoes: metrics.impressoes,
        cliques: metrics.cliques,
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        await supabase.from("metrics_diarias").update(row).eq("id", existing.id)
      } else {
        await supabase.from("metrics_diarias").insert({
          user_id: user.id,
          data: dateKey,
          platform: "mercado_livre",
          ...row,
        })
      }
      upsertCount++
    }

    // Update last_sync_at
    await supabase
      .from("user_integrations")
      .update({ last_sync_at: new Date().toISOString(), sync_status: "connected" })
      .eq("id", integration.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronização concluída! ${allOrders.length} pedidos + ${totalAdsDays} registros de ADS processados, ${upsertCount} dias atualizados.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("sync-mercado_livre error:", error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
