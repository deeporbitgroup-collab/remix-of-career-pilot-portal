import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Talent Pool monthly subscription price (test mode)
const TALENT_POOL_PRICE_ID = "price_1TRdN3JH4R87qgWyCP2Uk551";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      customer_email,
      success_url,
      cancel_url,
      price_id,
      metadata = {},
    }: {
      customer_email: string;
      success_url: string;
      cancel_url: string;
      price_id?: string;
      metadata?: Record<string, string>;
    } = body;

    if (!customer_email) {
      return new Response(JSON.stringify({ error: "customer_email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!success_url || !cancel_url) {
      return new Response(JSON.stringify({ error: "success_url and cancel_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: customer_email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) customerId = customers.data[0].id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : customer_email,
      line_items: [
        {
          price: price_id || TALENT_POOL_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url,
      cancel_url,
      metadata,
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    console.error("[create-subscription]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
