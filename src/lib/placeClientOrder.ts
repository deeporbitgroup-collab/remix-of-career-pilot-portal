import { supabase } from "@/integrations/supabase/client";

// client_* tables aren't in the generated types; use an untyped handle
// (mirrors ClientCheckout's `const sb = supabase as any`).
const sb = supabase as any;

/**
 * Pay-after-confirmation order placement.
 *
 * Unlike the old fulfillClientOrder (which ran AFTER Stripe confirmed payment),
 * this creates the order(s), projects and meeting slots at CHECKOUT, in an UNPAID
 * state, so the Associate can see the request and confirm a meeting time first.
 *
 * Payments are grouped by Associate: each Associate's bundle becomes its OWN
 * client_orders row (status 'awaiting_confirmation'), plus at most one "immediate"
 * order (status 'awaiting_payment') for services with no associate/meeting, which is
 * paid right away at checkout.
 */

export interface PlaceMeetingSlot {
  proposedDate: string; // yyyy-MM-dd
  proposedTime: string; // "yyyy-MM-dd HH:mm-HH:mm"
}

export interface PlaceSharedDoc {
  path: string;
  filename: string;
  fileSize: number;
  mimeType: string;
}

export interface PlaceOrderItem {
  serviceId: string;
  serviceName: string;
  price: number;
  resolvedAssociateId: string | null;
  associateName: string | null;
  isCvRewriteNoMeeting: boolean;
  specificRequest: string | null;
  additionalCallReason: string | null;
  packageName: string | null;
  slots: PlaceMeetingSlot[];
  cvRewriteDocs: PlaceSharedDoc[];
}

export interface PlaceClientOrderInput {
  clientId: string;
  discountPercentage: number;
  receiptUrl: string | null;
  outreachCvUrl: string | null;
  outreachCoverLetterUrl: string | null;
  outreachCustomEmail: string | null;
  items: PlaceOrderItem[];
}

export interface PlacedOrder {
  orderId: string;
  kind: "immediate" | "associate";
  associateId: string | null;
  label: string;
  amount: number;
}

export interface PlaceClientOrderResult {
  checkoutGroupId: string;
  orders: PlacedOrder[];
  /** The single immediate order (no associate/meeting) to pay right now, if any. */
  immediate: PlacedOrder | null;
  /** Associate orders created unpaid, awaiting the associate's time confirmation. */
  associateOrders: PlacedOrder[];
}

const IMMEDIATE_KEY = "immediate";

const itemNeedsMeeting = (item: PlaceOrderItem) =>
  !!item.resolvedAssociateId && !item.isCvRewriteNoMeeting;

const groupKeyFor = (item: PlaceOrderItem) =>
  itemNeedsMeeting(item) ? `assoc:${item.resolvedAssociateId}` : IMMEDIATE_KEY;

function buildLabel(kind: "immediate" | "associate", items: PlaceOrderItem[]): string {
  if (kind === "immediate") return "Instant services";
  const associateName = items.find((i) => i.associateName)?.associateName ?? "your associate";
  const pkg = items.find((i) => i.packageName)?.packageName;
  if (pkg) return `${pkg} — ${associateName}`;
  if (items.length === 1) return `${items[0].serviceName} — ${associateName}`;
  return `${items.length} services — ${associateName}`;
}

export async function placeClientOrder(
  input: PlaceClientOrderInput
): Promise<PlaceClientOrderResult> {
  const checkoutGroupId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const factor = input.discountPercentage > 0 ? 1 - input.discountPercentage / 100 : 1;

  // Partition the cart into payment groups (one immediate + one per associate).
  const groups = new Map<string, PlaceOrderItem[]>();
  for (const item of input.items) {
    const key = groupKeyFor(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const placed: PlacedOrder[] = [];

  for (const [key, items] of groups) {
    const kind: "immediate" | "associate" = key === IMMEDIATE_KEY ? "immediate" : "associate";
    const associateId = kind === "associate" ? items[0].resolvedAssociateId : null;
    const rawAmount = items.reduce((sum, i) => sum + Number(i.price), 0);
    const amount = Math.round(rawAmount * factor * 100) / 100;
    const label = buildLabel(kind, items);

    // 1) Order (the payment group). Immediate is paid at checkout; associate orders
    //    wait for the meeting confirmation before payment is due.
    const { data: order, error: orderError } = await sb
      .from("client_orders")
      .insert({
        client_id: input.clientId,
        associate_id: associateId,
        total_amount: amount,
        discount_percentage: input.discountPercentage,
        kind,
        order_label: label,
        checkout_group_id: checkoutGroupId,
        payment_status: kind === "immediate" ? "awaiting_payment" : "awaiting_confirmation",
        // Outreach Power Pack & manual receipt only ever live in the immediate group.
        outreach_cv_url: kind === "immediate" ? input.outreachCvUrl : null,
        outreach_cover_letter_url: kind === "immediate" ? input.outreachCoverLetterUrl : null,
        outreach_custom_email: kind === "immediate" ? input.outreachCustomEmail : null,
        payment_receipt_url: kind === "immediate" ? input.receiptUrl : null,
      })
      .select()
      .single();
    if (orderError) throw orderError;

    // 2) Per item: order item + project + slots + shared docs.
    for (const item of items) {
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
          client_id: input.clientId,
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

      if (isCvRewriteNoMeeting && project && item.cvRewriteDocs.length > 0) {
        for (const doc of item.cvRewriteDocs) {
          const { error: dbErr } = await sb.from("client_shared_documents").insert({
            project_id: project.id,
            filename: doc.filename,
            storage_path: doc.path,
            uploaded_by_type: "client",
            uploaded_by_id: input.clientId,
            file_size: doc.fileSize,
            mime_type: doc.mimeType || "application/octet-stream",
          });
          if (dbErr) throw dbErr;
        }
      }

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

    placed.push({ orderId: order.id, kind, associateId, label, amount });
  }

  const immediate = placed.find((p) => p.kind === "immediate") ?? null;
  const associateOrders = placed.filter((p) => p.kind === "associate");
  return { checkoutGroupId, orders: placed, immediate, associateOrders };
}
