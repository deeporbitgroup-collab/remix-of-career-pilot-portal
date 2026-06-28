// Stripe webhook — server-to-server, fires even if the user closed the tab.
// On `checkout.session.completed` for a client order it takes the SAME atomic
// claim as the payment-success page (claim_pending_order) and, if it wins,
// creates the order + projects + slots + sends the emails. Whichever path runs
// first wins, so the order is created exactly once.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

interface PendingMeetingSlot {
  proposedDate: string;
  proposedTime: string;
}
interface PendingSharedDoc {
  path: string;
  filename: string;
  fileSize: number;
  mimeType: string;
}
interface PendingOrderItem {
  serviceId: string;
  price: number;
  resolvedAssociateId: string | null;
  isCvRewriteNoMeeting: boolean;
  specificRequest: string | null;
  additionalCallReason: string | null;
  packageName: string | null;
  slots: PendingMeetingSlot[];
  backupAssociateId: string | null;
  backupSlots: PendingMeetingSlot[];
  cvRewriteDocs: PendingSharedDoc[];
}
interface PendingClientOrder {
  clientId: string;
  totalAmount: number;
  discountPercentage: number;
  receiptUrl: string | null;
  outreachCvUrl: string | null;
  outreachCoverLetterUrl: string | null;
  outreachCustomEmail: string | null;
  items: PendingOrderItem[];
}

// Mirror of src/lib/fulfillClientOrder.ts, server-side.
async function fulfillClientOrder(supabase: any, payload: PendingClientOrder): Promise<string> {
  const { data: order, error: orderError } = await supabase
    .from("client_orders")
    .insert({
      client_id: payload.clientId,
      total_amount: payload.totalAmount,
      discount_percentage: payload.discountPercentage,
      payment_status: "paid",
      payment_receipt_url: payload.receiptUrl,
      outreach_cv_url: payload.outreachCvUrl,
      outreach_cover_letter_url: payload.outreachCoverLetterUrl,
      outreach_custom_email: payload.outreachCustomEmail,
    })
    .select()
    .single();
  if (orderError) throw orderError;

  for (const item of payload.items) {
    const { error: itemError } = await supabase.from("client_order_items").insert({
      order_id: order.id,
      service_id: item.serviceId,
      price: item.price,
    });
    if (itemError) throw itemError;

    const resolvedAssociateId = item.resolvedAssociateId;
    const isCvRewriteNoMeeting = item.isCvRewriteNoMeeting;
    const hasBackup = !!(resolvedAssociateId && item.backupAssociateId);

    const { data: project, error: projectError } = await supabase
      .from("client_projects")
      .insert({
        client_id: payload.clientId,
        order_id: order.id,
        service_id: item.serviceId,
        associate_id: resolvedAssociateId,
        backup_associate_id: isCvRewriteNoMeeting ? null : item.backupAssociateId,
        active_associate_id: resolvedAssociateId,
        scheduling_status: isCvRewriteNoMeeting
          ? "no_meeting_requested"
          : resolvedAssociateId
          ? "awaiting_primary"
          : null,
        status: isCvRewriteNoMeeting ? "documents_uploaded" : "pending",
        additional_call_reason: item.additionalCallReason,
        specific_request: item.specificRequest,
        package_name: item.packageName,
      })
      .select()
      .single();
    if (projectError) throw projectError;

    if (isCvRewriteNoMeeting && project && item.cvRewriteDocs.length > 0) {
      for (const doc of item.cvRewriteDocs) {
        const { error: dbErr } = await supabase.from("client_shared_documents").insert({
          project_id: project.id,
          filename: doc.filename,
          storage_path: doc.path,
          uploaded_by_type: "client",
          uploaded_by_id: payload.clientId,
          file_size: doc.fileSize,
          mime_type: doc.mimeType || "application/octet-stream",
        });
        if (dbErr) throw dbErr;
      }
    }

    if (resolvedAssociateId && project && !isCvRewriteNoMeeting) {
      for (const slot of item.slots) {
        await supabase.from("client_meeting_slots").insert({
          project_id: project.id,
          associate_id: resolvedAssociateId,
          slot_role: "client_for_primary",
          proposed_date: slot.proposedDate,
          proposed_time: slot.proposedTime,
          status: "proposed",
        });
      }
      if (hasBackup) {
        for (const slot of item.backupSlots) {
          await supabase.from("client_meeting_slots").insert({
            project_id: project.id,
            associate_id: item.backupAssociateId,
            slot_role: "client_for_backup",
            proposed_date: slot.proposedDate,
            proposed_time: slot.proposedTime,
            status: "proposed",
          });
        }
      }
      await supabase.from("client_projects").update({ status: "slots_proposed" }).eq("id", project.id);
    }
  }

  return order.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set — rejecting");
    return new Response(JSON.stringify({ error: "webhook not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature || "", webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "bad signature";
    console.error("[stripe-webhook] signature verification failed:", msg);
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // We only act on a completed, paid client-order checkout.
  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true, ignored: event.type }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const meta = session.metadata || {};
  const isPaid = session.payment_status === "paid";

  if (meta.kind !== "client_order" || !isPaid) {
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Pay-after-confirmation flow: the order already exists (created at checkout),
  // so we just mark it paid. mark_client_order_paid is idempotent and returns true
  // only on the first transition, so emails fire once even if verify-payment also ran.
  if (meta.order_id) {
    try {
      const { data: didPay, error: payErr } = await supabase.rpc("mark_client_order_paid", {
        _order_id: meta.order_id,
        _stripe_session: session.id,
      });
      if (payErr) throw payErr;
      if (didPay) {
        await Promise.allSettled([
          supabase.functions.invoke("send-client-order-notification", { body: { orderId: meta.order_id } }),
          meta.client_id
            ? supabase.functions.invoke("send-client-payment-confirmation", {
                body: { orderId: meta.order_id, clientId: meta.client_id },
              })
            : Promise.resolve(null),
        ]);
      }
      return new Response(JSON.stringify({ received: true, paid: true, orderId: meta.order_id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      console.error("[stripe-webhook] order_id path", msg);
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    // Legacy fallback (no order_id): atomic claim on the staged pending_orders
    // payload — only the winner proceeds (the payment-success page may have
    // already fulfilled it; then claim returns an empty/non-processing row).
    const { data: claim, error: claimErr } = await supabase.rpc("claim_pending_order", {
      _session_id: session.id,
    });
    if (claimErr) throw claimErr;

    if (!claim || claim.status !== "processing" || !claim.payload) {
      return new Response(JSON.stringify({ received: true, alreadyHandled: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = claim.payload as PendingClientOrder;
    let orderId: string;
    try {
      orderId = await fulfillClientOrder(supabase, payload);
      await supabase.rpc("complete_pending_order", { _session_id: session.id, _order_id: orderId });
    } catch (fulfillErr) {
      await supabase.rpc("release_pending_order", { _session_id: session.id });
      throw fulfillErr;
    }

    // Fire confirmation emails only after the order/projects exist.
    await Promise.allSettled([
      supabase.functions.invoke("send-client-order-notification", { body: { orderId } }),
      payload.clientId
        ? supabase.functions.invoke("send-client-payment-confirmation", {
            body: { orderId, clientId: payload.clientId },
          })
        : Promise.resolve(null),
    ]);

    return new Response(JSON.stringify({ received: true, fulfilled: true, orderId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error";
    console.error("[stripe-webhook]", msg);
    // 500 → Stripe will retry later (for up to ~3 days).
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
