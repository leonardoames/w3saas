import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("Webhook signature verification failed", { error: (err as Error).message });
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Event verified", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id,
          customerId: session.customer,
          customerEmail: session.customer_email,
          subscriptionId: session.subscription,
        });

        const email = session.customer_email || session.metadata?.email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!email) {
          logStep("No email found in session");
          break;
        }

        // Check if profile already exists for this email
        const { data: existingProfile } = await supabaseClient
          .from("profiles")
          .select("id, user_id")
          .eq("email", email)
          .maybeSingle();

        if (existingProfile) {
          // Update existing profile with plan info (no Stripe IDs)
          const { error: updateError } = await supabaseClient
            .from("profiles")
            .update({
              plan_type: "paid",
              access_status: "active",
              access_expires_at: null, // Active subscription, no expiry
            })
            .eq("id", existingProfile.id);

          if (updateError) {
            logStep("Error updating profile", { error: updateError });
          } else {
            logStep("Profile updated successfully", { profileId: existingProfile.id });
          }

          // Store Stripe info in separate secure table
          const { error: paymentError } = await supabaseClient
            .from("user_payment_info")
            .upsert({
              user_id: existingProfile.user_id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            }, { onConflict: "user_id" });

          if (paymentError) {
            logStep("Error storing payment info", { error: paymentError });
          } else {
            logStep("Payment info stored securely");
          }
        } else {
          // Create a temporary profile entry (user will complete signup later)
          // Store pending checkout info in a way the success page can use
          logStep("No existing profile found, user will create account on success page", { email });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });

        // Find user by subscription ID in payment info table
        const { data: paymentInfo } = await supabaseClient
          .from("user_payment_info")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (paymentInfo) {
          const { error } = await supabaseClient
            .from("profiles")
            .update({
              plan_type: "free",
              access_status: "blocked",
            })
            .eq("user_id", paymentInfo.user_id);

          // Clear subscription ID
          await supabaseClient
            .from("user_payment_info")
            .update({ stripe_subscription_id: null })
            .eq("user_id", paymentInfo.user_id);

          if (error) {
            logStep("Error blocking access", { error });
          } else {
            logStep("Access blocked for subscription", { subscriptionId: subscription.id });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });

        // Find user by subscription ID
        const { data: paymentInfo } = await supabaseClient
          .from("user_payment_info")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (!paymentInfo) {
          logStep("No payment info found for subscription", { subscriptionId: subscription.id });
          break;
        }

        if (subscription.status === "past_due" || subscription.status === "unpaid") {
          const { error } = await supabaseClient
            .from("profiles")
            .update({
              access_status: "suspended",
            })
            .eq("user_id", paymentInfo.user_id);

          if (error) {
            logStep("Error suspending access", { error });
          } else {
            logStep("Access suspended for subscription", { subscriptionId: subscription.id });
          }
        } else if (subscription.status === "active") {
          const { error } = await supabaseClient
            .from("profiles")
            .update({
              access_status: "active",
              plan_type: "paid",
            })
            .eq("user_id", paymentInfo.user_id);

          if (error) {
            logStep("Error reactivating access", { error });
          } else {
            logStep("Access reactivated for subscription", { subscriptionId: subscription.id });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { invoiceId: invoice.id, customerId: invoice.customer });

        // Find user by customer ID
        const { data: paymentInfo } = await supabaseClient
          .from("user_payment_info")
          .select("user_id")
          .eq("stripe_customer_id", invoice.customer as string)
          .maybeSingle();

        if (paymentInfo) {
          const { error } = await supabaseClient
            .from("profiles")
            .update({
              access_status: "suspended",
            })
            .eq("user_id", paymentInfo.user_id);

          if (error) {
            logStep("Error suspending access", { error });
          } else {
            logStep("Access suspended due to failed payment");
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
