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

    const body = await req.json().catch(() => ({}));
    const source = body.source || "olist_tiny";

    if (source === "olist_tiny") {
      return await fetchOlistProducts(supabase, user.id);
    } else if (source === "shopee") {
      return await fetchShopeeProducts(supabase, user.id);
    } else if (source === "nuvemshop" || source === "site_proprio") {
      return await fetchNuvemshopProducts(supabase, user.id);
    } else if (source === "shopify") {
      return await fetchShopifyProducts(supabase, user.id);
    } else {
      return new Response(
        JSON.stringify({ error: `Fonte '${source}' não suportada para importação de produtos` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("Fetch products error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao buscar produtos", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchOlistProducts(supabase: any, userId: string) {
  const { data: integration, error: intError } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
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

  let allProducts: any[] = [];
  let pagina = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      token: api_token,
      formato: "JSON",
      pagina: String(pagina),
    });

    const res = await fetch(`${TINY_API_BASE}/produtos.pesquisa.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: "Erro ao buscar produtos do Tiny", details: `Status ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const json = await res.json();
    const retorno = json?.retorno;

    if (retorno?.status === "Erro") {
      if (retorno?.erros?.[0]?.erro?.includes("Nenhum registro")) {
        hasMore = false;
        break;
      }
      return new Response(
        JSON.stringify({ error: "Erro na API do Tiny", details: retorno.erros }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const produtos = retorno?.produtos || [];
    if (produtos.length === 0) {
      hasMore = false;
    } else {
      allProducts.push(...produtos);
      if (produtos.length < 100) {
        hasMore = false;
      } else {
        pagina++;
        await new Promise((r) => setTimeout(r, 2100));
      }
    }
  }

  // Normalize to standard format
  const normalized = allProducts.map((item: any) => {
    const p = item.produto || item;
    return {
      nome: p.nome || p.descricao || "",
      sku: p.codigo || p.sku || "",
      variante: null,
      preco_venda: parseFloat(p.preco || p.preco_venda || "0") || null,
      estoque_atual: parseInt(p.saldo || p.estoque || "0", 10) || 0,
      custo_unitario: parseFloat(p.preco_custo || "0") || null,
      source_id: String(p.id || ""),
    };
  }).filter((p: any) => p.sku && p.nome);

  return new Response(JSON.stringify({ products: normalized, count: normalized.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchShopeeProducts(supabase: any, userId: string) {
  // Shopee product listing requires partner API with product.get_item_list
  // For now, return a not-implemented message
  return new Response(
    JSON.stringify({ error: "Importação de produtos da Shopee ainda não disponível. Use CSV." }),
    { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function fetchNuvemshopProducts(supabase: any, userId: string) {
  const { data: integration, error: intError } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "nuvemshop")
    .eq("is_active", true)
    .single();

  if (intError || !integration) {
    return new Response(
      JSON.stringify({ error: "Integração Nuvemshop não encontrada ou inativa" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const creds = integration.credentials as any;
  const accessToken = creds?.access_token;
  const storeId = creds?.user_id || creds?.store_id;

  if (!accessToken || !storeId) {
    return new Response(
      JSON.stringify({ error: "Credenciais da Nuvemshop incompletas" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let allProducts: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(
      `https://api.nuvemshop.com.br/v1/${storeId}/products?page=${page}&per_page=100`,
      {
        headers: {
          Authentication: `bearer ${accessToken}`,
          "User-Agent": "W3SaaS (contato@w3saas.com)",
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Erro Nuvemshop: ${res.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      hasMore = false;
    } else {
      allProducts.push(...data);
      if (data.length < 100) hasMore = false;
      else page++;
    }
  }

  // Normalize - Nuvemshop has variants
  const normalized: any[] = [];
  for (const p of allProducts) {
    const name = p.name?.pt || p.name?.es || p.name?.en || Object.values(p.name || {})[0] || "";
    if (p.variants && p.variants.length > 0) {
      for (const v of p.variants) {
        normalized.push({
          nome: name,
          sku: v.sku || `${p.id}-${v.id}`,
          variante: v.values?.map((val: any) => val?.pt || val?.es || val).join(" / ") || null,
          preco_venda: parseFloat(v.price) || null,
          estoque_atual: v.stock || 0,
          custo_unitario: parseFloat(v.cost) || null,
          source_id: String(v.id || p.id),
        });
      }
    } else {
      normalized.push({
        nome: name,
        sku: String(p.id),
        variante: null,
        preco_venda: parseFloat(p.price) || null,
        estoque_atual: 0,
        custo_unitario: null,
        source_id: String(p.id),
      });
    }
  }

  return new Response(JSON.stringify({ products: normalized.filter((p: any) => p.nome), count: normalized.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fetchShopifyProducts(supabase: any, userId: string) {
  const { data: integration, error: intError } = await supabase
    .from("user_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "shopify")
    .eq("is_active", true)
    .single();

  if (intError || !integration) {
    return new Response(
      JSON.stringify({ error: "Integração Shopify não encontrada ou inativa" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const creds = integration.credentials as any;
  const accessToken = creds?.access_token;
  const shop = creds?.shop;

  if (!accessToken || !shop) {
    return new Response(
      JSON.stringify({ error: "Credenciais do Shopify incompletas" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const res = await fetch(`https://${shop}/admin/api/2024-01/products.json?limit=250`, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: `Erro Shopify: ${res.status}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const data = await res.json();
  const shopifyProducts = data.products || [];

  const normalized: any[] = [];
  for (const p of shopifyProducts) {
    if (p.variants && p.variants.length > 0) {
      for (const v of p.variants) {
        normalized.push({
          nome: p.title,
          sku: v.sku || `${p.id}-${v.id}`,
          variante: v.title !== "Default Title" ? v.title : null,
          preco_venda: parseFloat(v.price) || null,
          estoque_atual: v.inventory_quantity || 0,
          custo_unitario: parseFloat(v.cost) || null,
          source_id: String(v.id),
        });
      }
    }
  }

  return new Response(JSON.stringify({ products: normalized.filter((p: any) => p.nome), count: normalized.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
