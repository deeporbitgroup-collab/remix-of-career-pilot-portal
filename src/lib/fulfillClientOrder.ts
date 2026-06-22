import { supabase } from "@/integrations/supabase/client";

// These client_* tables are not in the generated types; use an untyped handle
// (mirrors ClientCheckout's `const sb = supabase as any`).
const sb = supabase as any;

/**
 * Serializable payload produced by the checkout BEFORE redirecting to Stripe and
 * stored in localStorage. It contains everything needed to create the order,
 * projects and meeting slots AFTER payment is confirmed — no File objects (all
 * files are uploaded to storage during checkout and referenced here by path).
 */
export interface PendingMeetingSlot {
  proposedDate: string; // yyyy-MM-dd
  proposedTime: string; // "yyyy-MM-dd HH:mm-HH:mm"
}

export interface PendingSharedDoc {
  path: string;
  filename: string;
  fileSize: number;
  mimeType: string;
}

export interface PendingOrderItem {
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

export interface PendingClientOrder {
  clientId: string;
  totalAmount: number;
  discountPercentage: number;
  receiptUrl: string | null;
  outreachCvUrl: string | null;
  outreachCoverLetterUrl: string | null;
  outreachCustomEmail: string | null;
  items: PendingOrderItem[];
}

export const PENDING_ORDER_KEY = "pending_client_order";

/**
 * Create the order + items + projects + meeting slots + shared documents from a
 * paid checkout. Called from the payment-success page once Stripe confirms the
 * payment, so nothing reaches the Associate (or the admin inbox) until the
 * client has actually paid.
 *
 * Returns the created order id (used to trigger confirmation emails).
 */
export async function fulfillClientOrder(payload: PendingClientOrder): Promise<{ orderId: string }> {
  // 1) Order (already paid — this only runs after Stripe confirmed the payment)
  const { data: order, error: orderError } = await sb
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

  // 2) Per-item: order item + project + slots + shared docs
  for (const item of payload.items) {
    const { error: itemError } = await sb.from("client_order_items").insert({
      order_id: order.id,
      service_id: item.serviceId,
      price: item.price,
    });
    if (itemError) throw itemError;

    const resolvedAssociateId = item.resolvedAssociateId;
    const isCvRewriteNoMeeting = item.isCvRewriteNoMeeting;

    const { data: project, error: projectError } = await sb
      .from("client_projects")
      .insert({
        client_id: payload.clientId,
        order_id: order.id,
        service_id: item.serviceId,
        associate_id: resolvedAssociateId,
        active_associate_id: resolvedAssociateId,
        backup_associate_id: null,
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

    // CV / Cover Letter Rewrite (no meeting): attach the documents uploaded at checkout
    if (isCvRewriteNoMeeting && project && item.cvRewriteDocs.length > 0) {
      for (const doc of item.cvRewriteDocs) {
        const { error: dbErr } = await sb.from("client_shared_documents").insert({
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

    // Meeting slots when an associate is set and a meeting is required
    if (resolvedAssociateId && project && !isCvRewriteNoMeeting) {
      for (const slot of item.slots) {
        await sb.from("client_meeting_slots").insert({
          project_id: project.id,
          associate_id: resolvedAssociateId,
          slot_role: "client_for_primary",
          proposed_date: slot.proposedDate,
          proposed_time: slot.proposedTime,
          status: "proposed",
        });
      }

      await sb.from("client_projects").update({ status: "slots_proposed" }).eq("id", project.id);
    }
  }

  return { orderId: order.id };
}
