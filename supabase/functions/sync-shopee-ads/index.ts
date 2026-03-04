import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPEE_HOST = "https://partner.shopeemobile.com";
const PLATFORM = "shopee_ads";

function hmacSign(partnerKey: string, baseString: string): Promise<string> {
  const enc = new TextEncoder();
  return crypto.subtle
    .importKey("raw", enc.encode(partnerKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((key) => crypto.subtle.sign("HMAC", key, enc.encode(baseString)))
    .then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
}

async function refreshTokenIfNeeded(
  adminClient: any,
  integration: any,
  partnerId: number,
  partnerKey: string
): Promise<string> {
  const creds = integration.credentials;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = (creds.obtained_at || 0) + (creds.expire_in || 0);

  if (now < expiresAt - 600) {
    return creds.access_token;
  }

  console.log("Refreshing Shopee ADS access token...");
  const tokenPath = "/api/v2/auth/access_token/get";
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${tokenPath}${timestamp}`;
  const sign = await hmacSign(partnerKey, baseString);

  const url = `${SHOPEE_HOST}${tokenPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      refresh_token: creds.refresh_token,
      shop_id: creds.shop_id,
      partner_id: partnerId,
    }),
  });

  const data = await res.json();
  if (data.error || !data.access_token) {
    throw new Error(`Token refresh failed: ${data.message || data.error || "unknown"}`);
  }

  await adminClient
    .from("user_integrations")
    .update({
      credentials: {
        ...creds,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expire_in: data.expire_in,
        obtained_at: Math.floor(Date.now() / 1000),
      },
    })
    .eq("id", integration.id);

  return data.access_token;
}

async function shopeeGet(
  path: string,
  extraParams: Record<string, string>,
  partnerId: number,
  partnerKey: string,
  accessToken: string,
  shopId: number
): Promise<any> {
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const sign = await hmacSign(partnerKey, baseString);

  const urlParams = new URLSearchParams({
    partner_id: String(partnerId),
    timestamp: String(timestamp),
    sign,
    access_token: accessToken,
    shop_id: String(shopId),
    ...extraParams,
  });

  const url = `${SHOPEE_HOST}${path}?${urlParams.toString()}`;
  console.log(`[shopeeGet] GET ${path} params:`, JSON.stringify(extraParams));

  const res = await fetch(url, { method: "GET" });
  const text = await res.text();

  console.log(`[shopeeGet] Response status: ${res.status}, body preview: ${text.substring(0, 500)}`);

  if (!res.ok) {
    throw new Error(`Shopee Ads API ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DayMetrics {
  cost: number;
  clicks: number;
  gmv: number;
  orders: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Usuário inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: integration, error: intError } = await adminClient
      .from("user_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", PLATFORM)
      .eq("is_active", true)
      .single();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: "Integração Shopee ADS não encontrada ou inativa" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const creds = integration.credentials as {
      access_token: string;
      refresh_token: string;
      shop_id: number;
      expire_in: number;
      obtained_at: number;
    };

    if (!creds.access_token || !creds.shop_id) {
      return new Response(
        JSON.stringify({ error: "Credenciais Shopee ADS incompletas. Reconecte a integração." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const partnerId = Number(Deno.env.get("SHOPEE_ADS_PARTNER_ID"));
    const partnerKey = Deno.env.get("SHOPEE_ADS_PARTNER_KEY")!;

    const accessToken = await refreshTokenIfNeeded(adminClient, integration, partnerId, partnerKey);

    // ---- Fetch daily ad performance (last 90 days) using correct /api/v2/ads/ endpoint ----
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const dailySpend: Record<string, DayMetrics> = {};

    // Chunk into 30-day windows to avoid API limits
    const chunkSize = 30;
    let chunkStart = new Date(ninetyDaysAgo);

    while (chunkStart < now) {
      const chunkEnd = new Date(Math.min(chunkStart.getTime() + chunkSize * 24 * 60 * 60 * 1000, now.getTime()));
      const startStr = formatDate(chunkStart);
      const endStr = formatDate(chunkEnd);

      console.log(`[sync-shopee-ads] Fetching ads performance: ${startStr} → ${endStr}`);

      try {
        const perfRes = await shopeeGet(
          "/api/v2/ads/get_all_cpc_ads_daily_performance",
          { start_date: startStr, end_date: endStr },
          partnerId,
          partnerKey,
          accessToken,
          creds.shop_id
        );

        if (perfRes.error) {
          console.error(`[sync-shopee-ads] API error for ${startStr}-${endStr}:`, JSON.stringify(perfRes));
        }

        const dailyData = perfRes.response?.daily_performance || perfRes.response?.data || [];
        console.log(`[sync-shopee-ads] Got ${dailyData.length} days of data for ${startStr}-${endStr}`);

        for (const day of dailyData) {
          const dateStr = day.date;
          if (!dateStr) continue;

          if (!dailySpend[dateStr]) {
            dailySpend[dateStr] = { cost: 0, clicks: 0, gmv: 0, orders: 0 };
          }
          // Shopee returns cost/gmv in micro-units (divide by 100000)
          dailySpend[dateStr].cost += Number(day.cost || 0) / 100000;
          dailySpend[dateStr].clicks += Number(day.clicks || 0);
          // ROAS direto: use direct_gmv and direct_order_num
          dailySpend[dateStr].gmv += Number(day.direct_gmv || 0) / 100000;
          dailySpend[dateStr].orders += Number(day.direct_order_num || 0);
        }
      } catch (apiErr) {
        console.error(`[sync-shopee-ads] Error fetching ${startStr}-${endStr}:`, apiErr);
      }

      // Rate-limit delay between chunks
      await new Promise((r) => setTimeout(r, 500));
      chunkStart = new Date(chunkEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    // ---- Upsert metrics ----
    let syncedDays = 0;
    for (const [date, metrics] of Object.entries(dailySpend)) {
      if (metrics.cost <= 0 && metrics.clicks <= 0 && metrics.gmv <= 0 && metrics.orders <= 0) continue;

      const { data: existing } = await adminClient
        .from("metrics_diarias")
        .select("id")
        .eq("user_id", userId)
        .eq("data", date)
        .eq("platform", PLATFORM)
        .maybeSingle();

      const upsertData = {
        investimento_trafego: metrics.cost,
        sessoes: metrics.clicks,
        faturamento: metrics.gmv,
        vendas_valor: metrics.gmv,
        vendas_quantidade: metrics.orders,
      };

      if (existing) {
        await adminClient.from("metrics_diarias").update(upsertData).eq("id", existing.id);
      } else {
        await adminClient.from("metrics_diarias").insert({
          user_id: userId,
          data: date,
          platform: PLATFORM,
          ...upsertData,
        });
      }
      syncedDays++;
    }

    await adminClient
      .from("user_integrations")
      .update({ last_sync_at: new Date().toISOString(), sync_status: "connected" })
      .eq("id", integration.id);

    console.log(`[sync-shopee-ads] Done. ${syncedDays} days synced.`);

    return new Response(
      JSON.stringify({
        message: `Sincronização Shopee ADS concluída! ${syncedDays} dias atualizados com métricas completas.`,
        synced: syncedDays,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-shopee-ads error:", err);
    return new Response(
      JSON.stringify({ error: "Erro na sincronização Shopee ADS", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
