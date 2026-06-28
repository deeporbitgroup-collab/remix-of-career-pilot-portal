// Transactional emails for the pay-after-confirmation flow, multiplexed into one
// edge function (keeps us within the project's function quota). Dispatch on `type`:
//   - order_received       → associate (confirm a time) + client (no payment yet) + admin
//   - payment_due          → client: associate confirmed, pay now (Stripe CTA)
//   - reservation_cancelled→ client + associate + admin: unpaid reservation released

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { FROM, ADMIN_EMAIL, emailLayout, emailButton, emailCallout, orderRef, siteUrl } from "../_shared/email.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderId, type, reason } = await req.json() as {
      orderId: string;
      type: "order_received" | "payment_due" | "reservation_cancelled";
      reason?: string;
    };
    if (!orderId || !type) throw new Error("orderId and type required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderErr } = await supabase
      .from("client_orders")
      .select(`*, client_order_items ( *, client_services (name, category) )`)
      .eq("id", orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    const { data: client } = await supabase
      .from("client_users")
      .select("first_name, last_name, email")
      .eq("id", order.client_id)
      .single();

    let associate: any = null;
    if (order.associate_id) {
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", order.associate_id)
        .single();
      associate = data;
    }

    const ref = orderRef(orderId);
    const label = order.order_label || "your order";
    const total = Number(order.total_amount);
    const clientName = client ? `${client.first_name} ${client.last_name}` : "the client";
    const associateName = associate ? `${associate.first_name} ${associate.last_name}` : "your Associate";
    const items = (order.client_order_items || []).map((i: any) => ({
      name: i.client_services?.name || "Service",
      category: i.client_services?.category || "",
      price: Number(i.price),
    }));
    const itemsRows = items
      .map(
        (it: any) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;color:#334155;font-size:14px;">${it.name}
          <br><span style="color:#64748b;font-size:12px;">${it.category}</span></td>
        <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;text-align:right;color:#1e293b;font-size:14px;font-weight:600;">€${it.price.toFixed(2)}</td>
      </tr>`
      )
      .join("");
    const itemsList = items
      .map((it: any) => `<li style="margin:4px 0;color:#334155;font-size:14px;">${it.name}</li>`)
      .join("");

    const tasks: Promise<unknown>[] = [];

    // ── payment_due ────────────────────────────────────────────────────────
    if (type === "payment_due") {
      if (!client?.email) throw new Error("Client email not found");
      const payUrl = `${siteUrl()}/client-portal/pay?order=${orderId}`;
      const content = `
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background-color:#dbeafe;border-radius:50%;padding:18px;"><span style="font-size:44px;">✅</span></div>
        </div>
        <h2 style="margin:0 0 16px 0;color:#1a365d;font-size:24px;font-weight:700;text-align:center;">${associateName} has confirmed your time!</h2>
        <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">Hi ${client.first_name},</p>
        <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">
          Great news — <strong>${associateName}</strong> has confirmed a time for your <strong>${label}</strong>.
          To lock in your meeting, please complete your payment below.
        </p>
        ${emailCallout(`<strong style="color:#b45309;">Payment required to proceed.</strong> Your meeting is reserved but not confirmed until payment is completed.`, "warning")}
        <div style="background-color:#f8fafc;border-radius:12px;padding:25px;margin:24px 0;border:1px solid #e2e8f0;">
          <p style="margin:0 0 6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Order Reference</p>
          <p style="margin:0 0 16px 0;color:#1a365d;font-size:18px;font-weight:700;">${ref}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0;"><tbody>${itemsRows}</tbody></table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;">
            <tr style="border-top:2px solid #1a365d;">
              <td style="padding:14px 0;color:#1a365d;font-size:18px;font-weight:700;">Total to pay</td>
              <td style="padding:14px 0;text-align:right;color:#1a365d;font-size:18px;font-weight:700;">€${total.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        ${emailButton(payUrl, "Pay now with Stripe")}
        <p style="margin:8px 0 0 0;color:#64748b;font-size:13px;text-align:center;">You can also pay anytime from your <a href="${siteUrl()}/client-portal/dashboard" style="color:#1a365d;">dashboard</a>.</p>
        <p style="margin:28px 0 0 0;color:#334155;font-size:16px;line-height:1.6;">Thank you,<br><strong style="color:#1a365d;">The Career Pilot Team</strong></p>
      `;
      tasks.push(resend.emails.send({
        from: FROM,
        to: [client.email],
        subject: `Action needed: complete your payment — ${ref}`,
        html: emailLayout(content),
      }));
    }

    // ── order_received ───────────────────────────────────────────────────────
    if (type === "order_received") {
      if (associate?.email) {
        const content = `
          <h2 style="margin:0 0 16px 0;color:#1a365d;font-size:22px;font-weight:700;">New request — please confirm a time</h2>
          <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">Hi ${associate.first_name},</p>
          <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">
            <strong>${clientName}</strong> has requested <strong>${label}</strong> and proposed 3 time slots for the first meeting.
          </p>
          ${emailCallout(`Please open your dashboard and <strong>confirm one of the proposed time slots</strong>. The client is charged only once you confirm — so a quick confirmation means a faster start.`, "info")}
          <ul style="margin:0 0 8px 0;padding-left:20px;">${itemsList}</ul>
          ${emailButton(`${siteUrl()}/app/associate`, "Confirm a time in your dashboard")}
          <p style="margin:24px 0 0 0;color:#334155;font-size:15px;">Reference: <strong>${ref}</strong></p>
        `;
        tasks.push(resend.emails.send({
          from: FROM,
          to: [associate.email],
          subject: `New booking request from ${clientName} — confirm a time`,
          html: emailLayout(content),
        }));
      }
      if (client?.email) {
        const content = `
          <h2 style="margin:0 0 16px 0;color:#1a365d;font-size:22px;font-weight:700;">We've received your request</h2>
          <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">Hi ${client.first_name},</p>
          <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">
            Thanks for your request for <strong>${label}</strong>. We've sent your 3 proposed time slots to your Associate.
          </p>
          ${emailCallout(`<strong>No payment is needed yet.</strong> As soon as your Associate confirms a time, we'll email you a secure payment link and show a payment button in your dashboard.`, "success")}
          ${emailButton(`${siteUrl()}/client-portal/dashboard`, "View my dashboard")}
          <p style="margin:24px 0 0 0;color:#334155;font-size:15px;">Reference: <strong>${ref}</strong></p>
          <p style="margin:20px 0 0 0;color:#334155;font-size:16px;">The Career Pilot Team</p>
        `;
        tasks.push(resend.emails.send({
          from: FROM,
          to: [client.email],
          subject: `Request received — awaiting associate confirmation (${ref})`,
          html: emailLayout(content),
        }));
      }
      tasks.push(resend.emails.send({
        from: FROM,
        to: [ADMIN_EMAIL],
        subject: `New unpaid order ${ref} — ${clientName}`,
        html: emailLayout(`
          <h2 style="margin:0 0 12px 0;color:#1a365d;font-size:20px;">New order awaiting associate confirmation</h2>
          <p style="color:#334155;font-size:14px;">Order <strong>${ref}</strong> — ${label}</p>
          <p style="color:#334155;font-size:14px;">Client: ${clientName}${client?.email ? ` (${client.email})` : ""}</p>
          <p style="color:#334155;font-size:14px;">Associate: ${associateName}</p>
          <p style="color:#334155;font-size:14px;">Total (due after confirmation): €${total.toFixed(2)}</p>
          <ul style="padding-left:20px;">${itemsList}</ul>
        `),
      }));
    }

    // ── reservation_cancelled ─────────────────────────────────────────────────
    if (type === "reservation_cancelled") {
      const reasonLine = reason
        ? `<p style="margin:0 0 16px 0;color:#334155;font-size:14px;">Note: ${reason}</p>`
        : "";
      if (client?.email) {
        const content = `
          <h2 style="margin:0 0 16px 0;color:#b91c1c;font-size:22px;font-weight:700;">Your reservation has been cancelled</h2>
          <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">Hi ${client.first_name},</p>
          <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">
            Unfortunately we couldn't proceed with <strong>${label}</strong> (${ref}) because the payment was not completed in time, so the reserved slot has been released.
          </p>
          ${emailCallout(`If you'd still like to go ahead, you're welcome to place the order again. We'll be happy to help.`, "warning")}
          ${reasonLine}
          <p style="margin:20px 0 0 0;color:#334155;font-size:16px;">The Career Pilot Team</p>
        `;
        tasks.push(resend.emails.send({
          from: FROM,
          to: [client.email],
          subject: `Reservation cancelled — ${ref}`,
          html: emailLayout(content),
        }));
      }
      if (associate?.email) {
        const content = `
          <h2 style="margin:0 0 16px 0;color:#1a365d;font-size:22px;font-weight:700;">Booking released — payment not completed</h2>
          <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">Hi ${associate.first_name},</p>
          <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">
            The booking with <strong>${clientName}</strong> for <strong>${label}</strong> (${ref}) has been cancelled because the client did not complete payment. You no longer need to hold this time slot.
          </p>
          <p style="margin:20px 0 0 0;color:#334155;font-size:16px;">The Career Pilot Team</p>
        `;
        tasks.push(resend.emails.send({
          from: FROM,
          to: [associate.email],
          subject: `Booking cancelled (unpaid) — ${ref}`,
          html: emailLayout(content),
        }));
      }
      tasks.push(resend.emails.send({
        from: FROM,
        to: [ADMIN_EMAIL],
        subject: `Reservation cancelled (unpaid) — ${ref}`,
        html: emailLayout(`
          <h2 style="margin:0 0 12px 0;color:#1a365d;font-size:20px;">Reservation cancelled</h2>
          <p style="color:#334155;font-size:14px;">Order <strong>${ref}</strong> — ${label}</p>
          <p style="color:#334155;font-size:14px;">Client: ${clientName}</p>
          <p style="color:#334155;font-size:14px;">Associate: ${associateName}</p>
          ${reasonLine}
        `),
      }));
    }

    await Promise.allSettled(tasks);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-order-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
