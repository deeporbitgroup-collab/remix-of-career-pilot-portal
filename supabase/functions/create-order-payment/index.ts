// Create a Stripe Checkout session to pay an EXISTING client order group.
//
// Used by the pay-after-confirmation flow: once an associate confirms the meeting
// time, the order's payment_status becomes 'awaiting_payment' and the client pays
// via the dashboard banner or the "Pay now" button in the payment-due email — both
// land on /client-portal/pay, which calls this function and redirects to Stripe.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId, origin } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderErr } = await supabase
      .from("client_orders")
      .select("id, client_id, total_amount, payment_status, order_label, kind")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr) throw orderErr;
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.payment_status === "paid") {
      return new Response(JSON.stringify({ alreadyPaid: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.payment_status === "cancelled") {
      return new Response(JSON.stringify({ error: "This reservation was cancelled." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.payment_status !== "awaiting_payment") {
      // Not yet unlocked by the associate's confirmation.
      return new Response(
        JSON.stringify({ error: "Payment is not available yet for this order." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: client } = await supabase
      .from("client_users")
      .select("email")
      .eq("id", order.client_id)
      .maybeSingle();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Single line item billed at the exact recorded order total (avoids per-item
    // rounding drift; the order_label already names the package/associate bundle).
    const baseUrl = origin || Deno.env.get("PUBLIC_SITE_URL") || "";
    const session = await stripe.checkout.sessions.create({
      customer_email: client?.email || undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: order.order_label || "Career Pilot order" },
            unit_amount: Math.round(Number(order.total_amount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/payment-success?kind=client_order&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/client-portal/dashboard`,
      metadata: {
        kind: "client_order",
        order_id: order.id,
        client_id: order.client_id,
      },
    });

    await supabase
      .from("client_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    console.error("[create-order-payment]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
