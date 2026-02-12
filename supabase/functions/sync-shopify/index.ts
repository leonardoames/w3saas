import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch Shopify integration credentials
    const { data: integration, error: intError } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "shopify")
      .eq("is_active", true)
      .single();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: "Integração Shopify não encontrada ou inativa" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { access_token, store_url } = integration.credentials as {
      access_token: string;
      store_url: string;
    };

    if (!access_token || !store_url) {
      return new Response(
        JSON.stringify({ error: "Credenciais incompletas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize store URL
    const storeHost = store_url.replace(/^https?:\/\//, "").replace(/\/$/, "");

    // Fetch orders from last 90 days
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 90);
    const sinceISO = sinceDate.toISOString();

    const ordersUrl = `https://${storeHost}/admin/api/2024-01/orders.json?status=any&created_at_min=${sinceISO}&limit=250`;

    const shopifyRes = await fetch(ordersUrl, {
      headers: {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
      },
    });

    if (!shopifyRes.ok) {
      const errText = await shopifyRes.text();
      console.error("Shopify API error:", shopifyRes.status, errText);
      return new Response(
        JSON.stringify({
          error: "Erro ao buscar pedidos da Shopify",
          details: `Status ${shopifyRes.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { orders } = await shopifyRes.json();

    if (!orders || orders.length === 0) {
      // Update last_sync_at
      await supabase
        .from("user_integrations")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", integration.id);

      return new Response(
        JSON.stringify({ message: "Nenhum pedido encontrado nos últimos 90 dias", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Aggregate orders by date
    const dailyMap: Record<string, { faturamento: number; vendas_quantidade: number; vendas_valor: number }> = {};

    for (const order of orders) {
      // Skip cancelled/voided orders
      if (order.cancelled_at || order.financial_status === "voided") continue;

      const date = order.created_at.split("T")[0]; // YYYY-MM-DD
      const totalPrice = parseFloat(order.total_price || "0");

      if (!dailyMap[date]) {
        dailyMap[date] = { faturamento: 0, vendas_quantidade: 0, vendas_valor: 0 };
      }
      dailyMap[date].faturamento += totalPrice;
      dailyMap[date].vendas_quantidade += 1;
      dailyMap[date].vendas_valor += totalPrice;
    }

    // Upsert metrics using service role for reliability
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    let syncedDays = 0;

    for (const [date, metrics] of Object.entries(dailyMap)) {
      // Check if entry exists
      const { data: existing } = await adminClient
        .from("metrics_diarias")
        .select("id")
        .eq("user_id", user.id)
        .eq("data", date)
        .eq("platform", "shopify")
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
          user_id: user.id,
          data: date,
          platform: "shopify",
          faturamento: metrics.faturamento,
          vendas_quantidade: metrics.vendas_quantidade,
          vendas_valor: metrics.vendas_valor,
        });
      }
      syncedDays++;
    }

    // Update last_sync_at
    await adminClient
      .from("user_integrations")
      .update({ last_sync_at: new Date().toISOString(), sync_status: "connected" })
      .eq("id", integration.id);

    return new Response(
      JSON.stringify({
        message: `Sincronização concluída! ${orders.length} pedidos processados em ${syncedDays} dias.`,
        synced: syncedDays,
        orders_count: orders.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno na sincronização", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
