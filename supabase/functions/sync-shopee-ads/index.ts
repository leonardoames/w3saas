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

async function shopeePost(
  path: string,
  params: Record<string, any>,
  partnerId: number,
  partnerKey: string,
  accessToken: string,
  shopId: number
): Promise<any> {
  const timestamp = Math.floor(Date.now() / 1000);
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  const sign = await hmacSign(partnerKey, baseString);

  const urlParams = new URLSearchParams();
  urlParams.set("partner_id", String(partnerId));
  urlParams.set("timestamp", String(timestamp));
  urlParams.set("sign", sign);
  urlParams.set("access_token", accessToken);
  urlParams.set("shop_id", String(shopId));

  const url = `${SHOPEE_HOST}${path}?${urlParams.toString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Shopee Marketing API ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Auth ----
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Usuário inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // ---- Get integration ----
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

    // ---- Fetch daily ad spend (last 30 days) ----
    // Shopee Marketing API: get_shop_daily_performance
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const formatDate = (d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    // Try to get campaign-level data to aggregate daily spend
    const dailySpend: Record<string, number> = {};
    let syncedDays = 0;

    try {
      // Use get_all_campaign_list to get campaigns, then get daily performance
      const campaignRes = await shopeePost(
        "/api/v2/marketing/get_all_campaign_list",
        {},
        partnerId,
        partnerKey,
        accessToken,
        creds.shop_id
      );

      if (campaignRes.error) {
        console.error("Shopee get_all_campaign_list error:", campaignRes);
      }

      const campaigns = campaignRes.response?.campaign_list || [];

      if (campaigns.length > 0) {
        // Get daily performance for each campaign
        for (const campaign of campaigns) {
          await new Promise((r) => setTimeout(r, 200));

          const perfRes = await shopeePost(
            "/api/v2/marketing/get_campaign_daily_performance",
            {
              campaign_id: campaign.campaign_id,
              start_date: formatDate(thirtyDaysAgo),
              end_date: formatDate(now),
            },
            partnerId,
            partnerKey,
            accessToken,
            creds.shop_id
          );

          if (perfRes.error) {
            console.warn(`Campaign ${campaign.campaign_id} perf error:`, perfRes.error);
            continue;
          }

          const dailyData = perfRes.response?.daily_performance || [];
          for (const day of dailyData) {
            const dateStr = day.date;
            const cost = Number(day.cost || 0) / 100000; // Shopee returns cost in micro-units
            if (!dailySpend[dateStr]) {
              dailySpend[dateStr] = 0;
            }
            dailySpend[dateStr] += cost;
          }
        }
      }
    } catch (apiErr) {
      console.error("Shopee Marketing API error:", apiErr);
      // Continue — we'll still update sync status
    }

    // ---- Upsert metrics ----
    for (const [date, spend] of Object.entries(dailySpend)) {
      if (spend <= 0) continue;

      const { data: existing } = await adminClient
        .from("metrics_diarias")
        .select("id, investimento_trafego")
        .eq("user_id", userId)
        .eq("data", date)
        .eq("platform", PLATFORM)
        .maybeSingle();

      if (existing) {
        await adminClient
          .from("metrics_diarias")
          .update({ investimento_trafego: spend })
          .eq("id", existing.id);
      } else {
        await adminClient.from("metrics_diarias").insert({
          user_id: userId,
          data: date,
          platform: PLATFORM,
          investimento_trafego: spend,
        });
      }
      syncedDays++;
    }

    // ---- Update last_sync_at ----
    await adminClient
      .from("user_integrations")
      .update({ last_sync_at: new Date().toISOString(), sync_status: "connected" })
      .eq("id", integration.id);

    return new Response(
      JSON.stringify({
        message: `Sincronização Shopee ADS concluída! ${syncedDays} dias com investimento atualizados.`,
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
