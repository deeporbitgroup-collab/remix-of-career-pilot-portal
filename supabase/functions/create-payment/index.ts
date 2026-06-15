import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LineItem {
  name: string;
  description?: string;
  amount: number; // in EUR (not cents)
  quantity?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      items,
      customer_email,
      success_url,
      cancel_url,
      metadata = {},
    }: {
      items: LineItem[];
      customer_email?: string;
      success_url: string;
      cancel_url: string;
      metadata?: Record<string, string>;
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "items required" }), {
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

    const session = await stripe.checkout.sessions.create({
      customer_email,
      line_items: items.map((it) => ({
        price_data: {
          currency: "eur",
          product_data: {
            name: it.name,
            ...(it.description ? { description: it.description } : {}),
          },
          unit_amount: Math.round(Number(it.amount) * 100),
        },
        quantity: it.quantity ?? 1,
      })),
      mode: "payment",
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
    console.error("[create-payment]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
