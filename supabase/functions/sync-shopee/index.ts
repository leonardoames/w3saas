import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHOPEE_HOST = "https://partner.shopeemobile.com";

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

  // Refresh if token expires in less than 10 minutes
  if (now < expiresAt - 600) {
    return creds.access_token;
  }

  console.log("Refreshing Shopee access token...");
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

  // Update stored credentials
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
  params: Record<string, string | number>,
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

  for (const [k, v] of Object.entries(params)) {
    urlParams.set(k, String(v));
  }

  const url = `${SHOPEE_HOST}${path}?${urlParams.toString()}`;
  const res = await fetch(url);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Shopee API ${res.status}: ${text}`);
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
      .eq("platform", "shopee")
      .eq("is_active", true)
      .single();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: "Integração Shopee não encontrada ou inativa" }),
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
        JSON.stringify({ error: "Credenciais Shopee incompletas. Reconecte a integração." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const partnerId = Number(Deno.env.get("SHOPEE_PARTNER_ID"));
    const partnerKey = Deno.env.get("SHOPEE_PARTNER_KEY")!;

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(adminClient, integration, partnerId, partnerKey);

    // ---- Fetch orders (last 90 days) ----
    const now = Math.floor(Date.now() / 1000);
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60;

    // Shopee limits time_range_field to max 15 days per request
    // We need to paginate by time windows of 15 days
    const TIME_WINDOW = 15 * 24 * 60 * 60; // 15 days in seconds
    const allOrders: string[] = [];

    let windowStart = ninetyDaysAgo;
    while (windowStart < now) {
      const windowEnd = Math.min(windowStart + TIME_WINDOW, now);
      let cursor = "";
      let hasMore = true;

      while (hasMore) {
        const params: Record<string, string | number> = {
          time_range_field: "create_time",
          time_from: windowStart,
          time_to: windowEnd,
          page_size: 100,
          order_status: "COMPLETED",
        };

        if (cursor) {
          params.cursor = cursor;
        }

        const data = await shopeeGet(
          "/api/v2/order/get_order_list",
          params,
          partnerId,
          partnerKey,
          accessToken,
          creds.shop_id
        );

        if (data.error) {
          console.error("Shopee get_order_list error:", data);
          // If it's a rate limit, wait and retry
          if (data.error === "error_param" || data.error === "error_auth") {
            throw new Error(`Shopee API error: ${data.message || data.error}`);
          }
          break;
        }

        const orderList = data.response?.order_list || [];
        for (const o of orderList) {
          allOrders.push(o.order_sn);
        }

        hasMore = data.response?.more || false;
        cursor = data.response?.next_cursor || "";

        // Rate limiting: 1 request per 100ms
        await new Promise((r) => setTimeout(r, 150));
      }

      windowStart = windowEnd;
    }

    if (allOrders.length === 0) {
      await adminClient
        .from("user_integrations")
        .update({ last_sync_at: new Date().toISOString(), sync_status: "connected" })
        .eq("id", integration.id);

      return new Response(
        JSON.stringify({ message: "Nenhum pedido concluído nos últimos 90 dias.", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- Get order details in batches of 50 ----
    const dailyMap: Record<string, { faturamento: number; vendas_quantidade: number; vendas_valor: number }> = {};

    for (let i = 0; i < allOrders.length; i += 50) {
      const batch = allOrders.slice(i, i + 50);
      const orderSnList = batch.join(",");

      const detailData = await shopeeGet(
        "/api/v2/order/get_order_detail",
        {
          order_sn_list: orderSnList,
          response_optional_fields: "total_amount,pay_time,escrow_amount,buyer_total_amount,order_status",
        },
        partnerId,
        partnerKey,
        accessToken,
        creds.shop_id
      );

      if (detailData.error) {
        console.error("Shopee get_order_detail error:", detailData);
        continue;
      }

      const orderDetails = detailData.response?.order_list || [];
      for (const order of orderDetails) {
        // Use pay_time (payment confirmed) instead of create_time
        const timestamp = order.pay_time || order.create_time;
        const dateObj = new Date(timestamp * 1000);
        const dateStr = dateObj.toISOString().split("T")[0];

        // Use escrow_amount (net seller revenue) with fallback to total_amount
        const faturamento = parseFloat(order.escrow_amount || order.total_amount || "0");
        const vendasValor = parseFloat(order.total_amount || order.escrow_amount || "0");

        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { faturamento: 0, vendas_quantidade: 0, vendas_valor: 0 };
        }
        dailyMap[dateStr].faturamento += faturamento;
        dailyMap[dateStr].vendas_quantidade += 1;
        dailyMap[dateStr].vendas_valor += vendasValor;
      }

      // Rate limiting
      await new Promise((r) => setTimeout(r, 150));
    }

    // ---- Upsert metrics ----
    let syncedDays = 0;

    for (const [date, metrics] of Object.entries(dailyMap)) {
      const { data: existing } = await adminClient
        .from("metrics_diarias")
        .select("id")
        .eq("user_id", userId)
        .eq("data", date)
        .eq("platform", "shopee")
        .maybeSingle();

      if (existing) {
        await adminClient
          .from("metrics_diarias")
          .update({
            faturamento: metrics.faturamento,
            vendas_quantidade: metrics.vendas_quantidade,
            vendas_valor: metrics.vendas_valor,
          })
          .eq("id", existing.id);
      } else {
        await adminClient.from("metrics_diarias").insert({
          user_id: userId,
          data: date,
          platform: "shopee",
          faturamento: metrics.faturamento,
          vendas_quantidade: metrics.vendas_quantidade,
          vendas_valor: metrics.vendas_valor,
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
        message: `Sincronização concluída! ${allOrders.length} pedidos processados em ${syncedDays} dias.`,
        synced: syncedDays,
        orders_count: allOrders.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-shopee error:", err);
    return new Response(
      JSON.stringify({ error: "Erro na sincronização Shopee", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
