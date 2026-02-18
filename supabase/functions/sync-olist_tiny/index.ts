import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TINY_API_BASE = "https://api.tiny.com.br/api2";

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

    // Fetch Olist Tiny integration credentials
    const { data: integration, error: intError } = await supabase
      .from("user_integrations")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "olist_tiny")
      .eq("is_active", true)
      .single();

    if (intError || !integration) {
      return new Response(
        JSON.stringify({ error: "Integração Olist Tiny não encontrada ou inativa" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { api_token } = integration.credentials as { api_token: string };

    if (!api_token) {
      return new Response(
        JSON.stringify({ error: "Token da API do Tiny não configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch orders from last 90 days
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 90);
    const dataInicial = `${String(sinceDate.getDate()).padStart(2, "0")}/${String(sinceDate.getMonth() + 1).padStart(2, "0")}/${sinceDate.getFullYear()}`;

    let allOrders: any[] = [];
    let pagina = 1;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        token: api_token,
        formato: "JSON",
        dataInicial,
        pagina: String(pagina),
      });

      const res = await fetch(`${TINY_API_BASE}/pedidos.pesquisa.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Tiny API error:", res.status, errText);
        return new Response(
          JSON.stringify({ error: "Erro ao buscar pedidos do Tiny", details: `Status ${res.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const json = await res.json();
      const retorno = json?.retorno;

      if (retorno?.status === "Erro") {
        // If no records found, it's not a real error
        if (retorno?.erros?.[0]?.erro?.includes("Nenhum registro")) {
          hasMore = false;
          break;
        }
        console.error("Tiny API retorno erro:", JSON.stringify(retorno.erros));
        return new Response(
          JSON.stringify({ error: "Erro na API do Tiny", details: retorno.erros }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pedidos = retorno?.pedidos || [];
      if (pedidos.length === 0) {
        hasMore = false;
      } else {
        allOrders.push(...pedidos);
        // Tiny returns max 100 per page
        if (pedidos.length < 100) {
          hasMore = false;
        } else {
          pagina++;
          // Rate limit: Tiny allows 30 requests/min
          await new Promise((r) => setTimeout(r, 2100));
        }
      }
    }

    if (allOrders.length === 0) {
      // Update last_sync_at
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, serviceKey);
      await adminClient
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

    for (const item of allOrders) {
      const pedido = item.pedido;
      if (!pedido) continue;

      // Skip cancelled orders
      const situacao = (pedido.situacao || "").toLowerCase();
      if (situacao === "cancelado" || situacao === "ecommerce_cancelado") continue;

      // Parse date from DD/MM/YYYY to YYYY-MM-DD
      const dataParts = (pedido.data_pedido || "").split("/");
      if (dataParts.length !== 3) continue;
      const dateKey = `${dataParts[2]}-${dataParts[1]}-${dataParts[0]}`;

      const totalPedido = parseFloat(pedido.totalPedido || pedido.total_pedido || "0");

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { faturamento: 0, vendas_quantidade: 0, vendas_valor: 0 };
      }
      dailyMap[dateKey].faturamento += totalPedido;
      dailyMap[dateKey].vendas_quantidade += 1;
      dailyMap[dateKey].vendas_valor += totalPedido;
    }

    // Upsert metrics
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    let syncedDays = 0;

    for (const [date, metrics] of Object.entries(dailyMap)) {
      const { data: existing } = await adminClient
        .from("metrics_diarias")
        .select("id")
        .eq("user_id", user.id)
        .eq("data", date)
        .eq("platform", "olist_tiny")
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
          platform: "olist_tiny",
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
        message: `Sincronização concluída! ${allOrders.length} pedidos processados em ${syncedDays} dias.`,
        synced: syncedDays,
        orders_count: allOrders.length,
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
