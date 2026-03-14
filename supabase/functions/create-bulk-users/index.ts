import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface UserToCreate {
  email: string;
  name?: string;
  plan?: string;
  is_mentorado?: boolean;
  is_w3_client?: boolean;
}

interface CreateUsersRequest {
  users: UserToCreate[];
  default_password?: string;
  send_invite_email?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");

    // Validate JWT using anon client with getClaims
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      throw new Error("Not authenticated");
    }

    const userId = claimsData.claims.sub as string;

    // Use service role client for admin operations
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc("is_admin_user", {
      check_user_id: userId,
    });

    if (!isAdmin) {
      throw new Error("Not authorized - admin only");
    }

    const { users, default_password: clientPassword, send_invite_email = true }: CreateUsersRequest = await req.json();

    if (!users || users.length === 0) {
      throw new Error("No users provided");
    }

    // Use client-provided password or generate a secure one
    const default_password = clientPassword && clientPassword.length >= 6
      ? clientPassword
      : crypto.randomUUID().slice(0, 12) + "A1!";

    const results = [];

    for (const userData of users) {
      try {
        let createdUserId: string | null = null;
        let inviteSent = false;

        if (send_invite_email) {
          const { data: invitedUser, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(userData.email, {
            data: { full_name: userData.name || "" },
          });

          if (inviteError) {
            results.push({
              email: userData.email,
              status: "error",
              invite_sent: false,
              message: inviteError.message,
            });
            continue;
          }

          createdUserId = invitedUser.user?.id ?? null;
          inviteSent = true;
        } else {
          const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
            email: userData.email,
            password: default_password,
            email_confirm: true,
            user_metadata: {
              full_name: userData.name || "",
            },
          });

          if (createError) {
            results.push({
              email: userData.email,
              status: "error",
              invite_sent: false,
              message: createError.message,
            });
            continue;
          }

          createdUserId = newUser.user?.id ?? null;
        }

        if (!createdUserId) {
          results.push({
            email: userData.email,
            status: "error",
            invite_sent: inviteSent,
            message: "Usuário criado sem ID retornado pela API",
          });
          continue;
        }

        const { error: profileError } = await supabaseClient
          .from("profiles")
          .update({
            full_name: userData.name || null,
            plan_type: userData.plan || "manual",
            is_mentorado: userData.is_mentorado || false,
            is_w3_client: userData.is_w3_client || false,
            access_status: "active",
            must_change_password: true,
          })
          .eq("user_id", createdUserId);

        if (profileError) {
          console.error("Profile update error:", profileError);
        }

        results.push({
          email: userData.email,
          status: "success",
          userId: createdUserId,
          invite_sent: inviteSent,
          message: inviteSent
            ? "Usuário criado e e-mail de definição de senha enviado"
            : "Usuário criado com sucesso",
        });
      } catch (error: any) {
        results.push({
          email: userData.email,
          status: "error",
          message: error.message || "Erro desconhecido",
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in create-bulk-users:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
