import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get("action")

  // ── 1. AUTHORIZE ──────────────────────────────────────────────────────
  if (action === "authorize") {
    const authHeader = req.headers.get("Authorization") ?? ""
    const token = authHeader.replace("Bearer ", "")

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const state = btoa(JSON.stringify({ user_id: user.id }))

    const authUrl =
      `https://auth.mercadolivre.com.br/authorization` +
      `?response_type=code` +
      `&client_id=${Deno.env.get("ML_CLIENT_ID")}` +
      `&redirect_uri=${encodeURIComponent(Deno.env.get("ML_REDIRECT_URI")!)}` +
      `&state=${state}`

    return new Response(JSON.stringify({ auth_url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // ── 2. CALLBACK ───────────────────────────────────────────────────────
  if (action === "callback") {
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const appUrl = Deno.env.get("APP_URL") || "https://app.leonardoames.com.br"

    if (!code) {
      return Response.redirect(`${appUrl}/app/integracoes?error=no_code`)
    }

    let userId: string
    try {
      userId = JSON.parse(atob(state!)).user_id
    } catch {
      return Response.redirect(`${appUrl}/app/integracoes?error=invalid_state`)
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: Deno.env.get("ML_CLIENT_ID"),
        client_secret: Deno.env.get("ML_CLIENT_SECRET"),
        code,
        redirect_uri: Deno.env.get("ML_REDIRECT_URI"),
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokens.access_token) {
      console.error("ML token error:", tokens)
      return Response.redirect(`${appUrl}/app/integracoes?error=token_failed`)
    }

    // Save with service_role (bypass RLS)
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    // Check if integration already exists
    const { data: existing } = await adminSupabase
      .from("user_integrations")
      .select("id")
      .eq("user_id", userId)
      .eq("platform", "mercado_livre")
      .maybeSingle()

    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      seller_id: String(tokens.user_id),
      expires_in: tokens.expires_in,
      obtained_at: new Date().toISOString(),
    }

    if (existing) {
      await adminSupabase
        .from("user_integrations")
        .update({
          credentials,
          is_active: true,
          sync_status: "connected",
        })
        .eq("id", existing.id)
    } else {
      await adminSupabase
        .from("user_integrations")
        .insert({
          user_id: userId,
          platform: "mercado_livre",
          credentials,
          is_active: true,
          sync_status: "connected",
        })
    }

    return Response.redirect(`${appUrl}/app/integracoes?status=success&platform=mercado_livre`)
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
