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

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: userError } = await anonClient.auth.getUser();

    if (userError || !callerUser) {
      console.error("Auth error:", userError);
      throw new Error("Not authenticated");
    }

    const userId = callerUser.id;

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc("is_admin_user", {
      check_user_id: userId,
    });

    if (!isAdmin) {
      throw new Error("Not authorized - admin only");
    }

    const { users }: CreateUsersRequest = await req.json();

    if (!users || users.length === 0) {
      throw new Error("No users provided");
    }

    // Generate a secure default password server-side
    const default_password = crypto.randomUUID().slice(0, 12) + "A1!";

    const results = [];

    for (const userData of users) {
      try {
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
            message: createError.message,
          });
          continue;
        }

        if (newUser?.user) {
          const { error: profileError } = await supabaseClient
            .from("profiles")
            .update({
              full_name: userData.name || null,
              plan_type: userData.plan || "manual",
              is_mentorado_deprecated: userData.is_mentorado || false,
              is_w3_client_deprecated: userData.is_w3_client || false,
              access_status: "active",
              must_change_password: true,
            })
            .eq("user_id", newUser.user.id);

          if (profileError) {
            console.error("Profile update error:", profileError);
          }

          // Dual-write to user_attributes (source of truth)
          const attributesToInsert = [];
          if (userData.is_mentorado) {
            attributesToInsert.push({
              user_id: newUser.user.id,
              attribute: "is_mentorado",
              value: "true",
              notes: "Set during bulk user creation",
            });
          }
          if (userData.is_w3_client) {
            attributesToInsert.push({
              user_id: newUser.user.id,
              attribute: "is_w3_client",
              value: "true",
              notes: "Set during bulk user creation",
            });
          }
          if (attributesToInsert.length > 0) {
            const { error: attrError } = await supabaseClient
              .from("user_attributes")
              .upsert(attributesToInsert, { onConflict: "user_id,attribute" });
            if (attrError) {
              console.error("user_attributes upsert error:", attrError);
            }
          }

          results.push({
            email: userData.email,
            status: "success",
            userId: newUser.user.id,
            message: "Usuário criado com sucesso",
          });
        }
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
