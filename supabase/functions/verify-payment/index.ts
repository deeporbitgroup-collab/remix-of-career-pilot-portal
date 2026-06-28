import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    const isPaid =
      session.payment_status === "paid" ||
      (session.mode === "subscription" && session.status === "complete");

    if (!isPaid) {
      return new Response(
        JSON.stringify({ paid: false, status: session.payment_status, mode: session.mode }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const meta = session.metadata || {};
    const kind = meta.kind; // "client_order" | "kb_order" | "talent_pool_subscription"

    if (kind === "client_order" && meta.order_id) {
      // Idempotent: returns true only on the first transition to 'paid', so the
      // confirmation emails fire exactly once (whether triggered here or by the webhook).
      const { data: didPay } = await supabase.rpc("mark_client_order_paid", {
        _order_id: meta.order_id,
        _stripe_session: session.id,
      });

      if (didPay) {
        Promise.allSettled([
          supabase.functions.invoke("send-client-order-notification", {
            body: { orderId: meta.order_id },
          }),
          meta.client_id
            ? supabase.functions.invoke("send-client-payment-confirmation", {
                body: { orderId: meta.order_id, clientId: meta.client_id },
              })
            : Promise.resolve(null),
        ]).then((results) => {
          console.log("[verify-payment] post-payment email results", JSON.stringify(results));
        });
      }
    } else if (kind === "kb_order" && meta.order_id) {
      await supabase
        .from("kb_orders")
        .update({
          payment_status: "paid",
          payment_receipt_url: `stripe:${session.id}`,
        })
        .eq("id", meta.order_id);
    } else if (kind === "talent_pool_subscription" && meta.user_id) {
      // Activate student access immediately on successful subscription
      await supabase
        .from("student_profiles")
        .update({
          access_status: "UNLOCKED",
          payment_status: "VERIFIED",
          monthly_payment_active: true,
          monthly_payment_start_date: new Date().toISOString(),
          profile_visible_to_companies: true,
          payment_reference: `stripe:${session.id}`,
        })
        .eq("user_id", meta.user_id);

      await supabase
        .from("talent_pool_users")
        .update({ status: "active_member" })
        .eq("id", meta.user_id);

      // Log a payment receipt entry for auditing
      await supabase.from("talent_pool_payment_receipts").insert({
        user_id: meta.user_id,
        payment_type: "STRIPE_SUBSCRIPTION",
        amount: (session.amount_total ?? 3900) / 100,
        receipt_url: `stripe:${session.id}`,
        verification_status: "VERIFIED",
        verified_at: new Date().toISOString(),
        notes: `Stripe subscription ${session.subscription ?? ""}`,
      });
    }

    return new Response(
      JSON.stringify({
        paid: true,
        kind,
        amount_total: session.amount_total,
        customer_email: session.customer_details?.email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    console.error("[verify-payment]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
