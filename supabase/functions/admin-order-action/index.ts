// Admin actions on a client order group (pay-after-confirmation flow):
//   - mark_paid: record the order as paid manually (e.g. exceptional offline payment)
//   - cancel:    cancel an unpaid reservation, free the associate, notify everyone
//
// Centralised here (service role) so the admin UI is a thin trigger and the emails
// + status transitions stay consistent.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId, action, reason } = await req.json() as {
      orderId: string;
      action: "mark_paid" | "cancel";
      reason?: string;
    };
    if (!orderId || !action) throw new Error("orderId and action required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderErr } = await supabase
      .from("client_orders")
      .select("id, client_id, payment_status")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr) throw orderErr;
    if (!order) throw new Error("Order not found");

    if (action === "mark_paid") {
      const { data: didPay } = await supabase.rpc("mark_client_order_paid", {
        _order_id: orderId,
        _stripe_session: null,
      });
      if (didPay) {
        await Promise.allSettled([
          supabase.functions.invoke("send-client-order-notification", { body: { orderId } }),
          order.client_id
            ? supabase.functions.invoke("send-client-payment-confirmation", {
                body: { orderId, clientId: order.client_id },
              })
            : Promise.resolve(null),
        ]);
      }
      return new Response(JSON.stringify({ success: true, changed: !!didPay }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cancel") {
      if (order.payment_status === "paid") {
        return new Response(
          JSON.stringify({ error: "This order is already paid and cannot be cancelled here." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await supabase
        .from("client_orders")
        .update({
          payment_status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_reason: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      // Free the associate: mark the order's projects cancelled so they leave the
      // active queues. (The order row keeps the audit trail.)
      await supabase
        .from("client_projects")
        .update({ status: "cancelled", scheduling_status: "cancelled" })
        .eq("order_id", orderId);

      try {
        await supabase.functions.invoke("send-order-email", {
          body: { orderId, type: "reservation_cancelled", reason: reason || null },
        });
      } catch (e) {
        console.error("send-order-email (cancelled) err", e);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("admin-order-action error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
