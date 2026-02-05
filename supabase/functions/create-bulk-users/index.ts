import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  default_password: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Check if user is admin
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data: isAdmin } = await supabaseClient.rpc("is_admin_user", {
      check_user_id: user.id,
    });

    if (!isAdmin) {
      throw new Error("Not authorized - admin only");
    }

    const { users, default_password }: CreateUsersRequest = await req.json();

    if (!users || users.length === 0) {
      throw new Error("No users provided");
    }

    if (!default_password || default_password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const results = [];

    for (const userData of users) {
      try {
        // Create user with admin API
        const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
          email: userData.email,
          password: default_password,
          email_confirm: true, // Auto-confirm email
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
          // Update the profile with additional data
          const { error: profileError } = await supabaseClient
            .from("profiles")
            .update({
              full_name: userData.name || null,
              plan_type: userData.plan || "manual",
              is_mentorado: userData.is_mentorado || false,
              is_w3_client: userData.is_w3_client || false,
              access_status: "active",
            })
            .eq("user_id", newUser.user.id);

          if (profileError) {
            console.error("Profile update error:", profileError);
          }

          results.push({
            email: userData.email,
            status: "success",
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
