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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    const partnerId = Number(Deno.env.get("SHOPEE_ADS_PARTNER_ID"));
    const partnerKey = Deno.env.get("SHOPEE_ADS_PARTNER_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (action === "authorize") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }

      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsErr } = await supabaseUser.auth.getClaims(token);
      if (claimsErr || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: corsHeaders,
        });
      }
      const userId = claimsData.claims.sub as string;

      const apiPath = "/api/v2/shop/auth_partner";
      const timestamp = Math.floor(Date.now() / 1000);
      const baseString = `${partnerId}${apiPath}${timestamp}`;
      const sign = await hmacSign(partnerKey, baseString);

      const redirectUrl = "https://app.leonardoames.com.br/app/integracoes/shopee-ads/callback";
      const state = btoa(JSON.stringify({ user_id: userId, ts: timestamp }));

      const authUrl =
        `${SHOPEE_HOST}${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl + "?state=" + encodeURIComponent(state))}`;

      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: existing } = await adminClient
        .from("user_integrations")
        .select("id")
        .eq("user_id", userId)
        .eq("platform", PLATFORM)
        .maybeSingle();

      if (existing) {
        await adminClient
          .from("user_integrations")
          .update({ sync_status: "pending_oauth", is_active: false })
          .eq("id", existing.id);
      } else {
        await adminClient.from("user_integrations").insert({
          user_id: userId,
          platform: PLATFORM,
          credentials: {},
          is_active: false,
          sync_status: "pending_oauth",
        });
      }

      return new Response(JSON.stringify({ auth_url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "callback") {
      const body = await req.json();
      const { code, shop_id, state } = body;

      if (!code || !shop_id || !state) {
        return new Response(JSON.stringify({ error: "Missing params" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      let userId: string;
      try {
        const decoded = JSON.parse(atob(state));
        userId = decoded.user_id;
      } catch {
        return new Response(JSON.stringify({ error: "Invalid state" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const tokenPath = "/api/v2/auth/token/get";
      const timestamp = Math.floor(Date.now() / 1000);
      const baseString = `${partnerId}${tokenPath}${timestamp}`;
      const sign = await hmacSign(partnerKey, baseString);

      const tokenUrl = `${SHOPEE_HOST}${tokenPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`;

      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          shop_id: Number(shop_id),
          partner_id: partnerId,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error || !tokenData.access_token) {
        console.error("Shopee ADS token error:", tokenData);
        return new Response(
          JSON.stringify({ error: tokenData.message || tokenData.error || "Token exchange failed" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      const credentials = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        shop_id: Number(shop_id),
        expire_in: tokenData.expire_in,
        obtained_at: Math.floor(Date.now() / 1000),
      };

      const { data: existing } = await adminClient
        .from("user_integrations")
        .select("id")
        .eq("user_id", userId)
        .eq("platform", PLATFORM)
        .maybeSingle();

      if (existing) {
        await adminClient
          .from("user_integrations")
          .update({
            credentials,
            is_active: true,
            sync_status: "connected",
          })
          .eq("id", existing.id);
      } else {
        await adminClient.from("user_integrations").insert({
          user_id: userId,
          platform: PLATFORM,
          credentials,
          is_active: true,
          sync_status: "connected",
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("shopee-ads-oauth error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
