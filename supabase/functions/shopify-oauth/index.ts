import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REDIRECT_URI = "https://app.leonardoames.com.br/app/integracoes/shopify/callback";
const SCOPES = "read_orders";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    if (action === "authorize") {
      // Validate JWT
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const { client_id, client_secret, shop_domain } = body;

      if (!client_id || !client_secret || !shop_domain) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clean shop domain
      const cleanDomain = shop_domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

      // Upsert credentials (save client_id/secret for later callback)
      const { data: existing } = await supabaseAdmin
        .from("user_integrations")
        .select("id")
        .eq("user_id", user.id)
        .eq("platform", "shopify")
        .maybeSingle();

      const credentials = { client_id, client_secret, shop_domain: cleanDomain };

      if (existing) {
        await supabaseAdmin
          .from("user_integrations")
          .update({ credentials, is_active: false, sync_status: "pending_oauth" })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin
          .from("user_integrations")
          .insert({
            user_id: user.id,
            platform: "shopify",
            credentials,
            is_active: false,
            sync_status: "pending_oauth",
          });
      }

      // Generate state (nonce + user_id) encoded as base64
      const nonce = crypto.randomUUID();
      const statePayload = JSON.stringify({ nonce, user_id: user.id });
      const state = btoa(statePayload);

      const authUrl =
        `https://${cleanDomain}/admin/oauth/authorize?` +
        `client_id=${encodeURIComponent(client_id)}` +
        `&scope=${encodeURIComponent(SCOPES)}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&state=${encodeURIComponent(state)}`;

      return new Response(JSON.stringify({ auth_url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      const body = await req.json();
      const { code, shop, state } = body;

      if (!code || !shop || !state) {
        return new Response(JSON.stringify({ error: "Missing callback params" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decode state to get user_id
      let stateData: { nonce: string; user_id: string };
      try {
        stateData = JSON.parse(atob(state));
      } catch {
        return new Response(JSON.stringify({ error: "Invalid state" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = stateData.user_id;

      // Fetch stored credentials for this user
      const { data: integration, error: fetchErr } = await supabaseAdmin
        .from("user_integrations")
        .select("*")
        .eq("user_id", userId)
        .eq("platform", "shopify")
        .maybeSingle();

      if (fetchErr || !integration) {
        return new Response(JSON.stringify({ error: "Integration not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const creds = integration.credentials as Record<string, string>;
      const clientId = creds.client_id;
      const clientSecret = creds.client_secret;

      if (!clientId || !clientSecret) {
        return new Response(JSON.stringify({ error: "Credentials missing" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exchange code for permanent access token
      const cleanShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
      const tokenRes = await fetch(`https://${cleanShop}/admin/oauth/access_token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("Shopify token exchange failed:", errText);
        return new Response(JSON.stringify({ error: "Token exchange failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) {
        return new Response(JSON.stringify({ error: "No access_token returned" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Save access_token + store_url in credentials
      const updatedCreds = {
        ...creds,
        access_token: accessToken,
        store_url: cleanShop,
      };

      await supabaseAdmin
        .from("user_integrations")
        .update({
          credentials: updatedCreds,
          is_active: true,
          sync_status: "connected",
        })
        .eq("id", integration.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("shopify-oauth error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
