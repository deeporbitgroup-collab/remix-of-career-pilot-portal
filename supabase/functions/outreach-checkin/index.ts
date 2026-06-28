// Outreach Power Pack free check-in: request (client proposes 3 slots) + confirm
// (admin picks one). Emails fire automatically to the client AND the admin on both.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { FROM, ADMIN_EMAIL, emailLayout, emailButton, emailCallout, siteUrl } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface Slot { date: string; time: string }

const slotsList = (slots: Slot[]) =>
  slots.map((s) => `<li style="margin:4px 0;color:#334155;font-size:14px;">${s.date} · ${s.time}</li>`).join("");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = body.action as "request" | "confirm";
    if (!action) throw new Error("action required");

    // ── request: client books the check-in ──────────────────────────────────
    if (action === "request") {
      const { clientId, name, email, slots, sectors, cities } = body as {
        clientId?: string; name: string; email: string; slots: Slot[]; sectors?: string; cities?: string;
      };
      if (!name || !email || !Array.isArray(slots) || slots.length < 1) {
        throw new Error("name, email and at least one slot are required");
      }

      const { data: row, error } = await supabase
        .from("outreach_checkins")
        .insert({
          client_id: clientId || null,
          guest_name: name,
          guest_email: email,
          sectors: sectors || null,
          cities: cities || null,
          proposed_slots: slots,
          status: "requested",
        })
        .select()
        .single();
      if (error) throw error;

      const interestLines = `
        ${sectors ? `<p style="margin:6px 0;color:#334155;font-size:14px;"><strong>Sectors of interest:</strong> ${sectors}</p>` : ""}
        ${cities ? `<p style="margin:6px 0;color:#334155;font-size:14px;"><strong>Cities of interest:</strong> ${cities}</p>` : ""}`;

      await Promise.allSettled([
        // Client
        resend.emails.send({
          from: FROM,
          to: [email],
          subject: "Your Outreach Power Pack check-in request",
          html: emailLayout(`
            <h2 style="margin:0 0 16px 0;color:#1a365d;font-size:22px;font-weight:700;">We've received your check-in request</h2>
            <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">Hi ${name},</p>
            <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">
              Thanks for your interest in the <strong>Outreach Power Pack</strong>. It's <strong>pay-per-interview</strong>: you only pay €250 when we secure an interview in the sectors and cities you care about — no upfront fee.
            </p>
            ${emailCallout(`Our team will confirm one of your proposed times for a quick free check-in to walk you through how it works. No payment is required to book this.`, "success")}
            <p style="margin:0 0 8px 0;color:#334155;font-size:15px;font-weight:600;">Your proposed times:</p>
            <ul style="margin:0 0 8px 0;padding-left:20px;">${slotsList(slots)}</ul>
            <p style="margin:20px 0 0 0;color:#334155;font-size:16px;">The Career Pilot Team</p>
          `),
        }),
        // Admin
        resend.emails.send({
          from: FROM,
          to: [ADMIN_EMAIL],
          subject: `New Outreach check-in request — ${name}`,
          html: emailLayout(`
            <h2 style="margin:0 0 12px 0;color:#1a365d;font-size:20px;">New Outreach Power Pack check-in</h2>
            <p style="color:#334155;font-size:14px;">Client: <strong>${name}</strong> (${email})</p>
            ${interestLines}
            <p style="margin:14px 0 6px 0;color:#334155;font-size:14px;font-weight:600;">Proposed times:</p>
            <ul style="padding-left:20px;">${slotsList(slots)}</ul>
            ${emailButton(`${siteUrl()}/app/admin`, "Confirm a time in the admin area")}
          `),
        }),
      ]);

      return new Response(JSON.stringify({ success: true, id: row.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── confirm: admin picks one slot ────────────────────────────────────────
    if (action === "confirm") {
      const { checkinId, slot } = body as { checkinId: string; slot: string };
      if (!checkinId || !slot) throw new Error("checkinId and slot required");

      const { data: row, error } = await supabase
        .from("outreach_checkins")
        .update({ status: "confirmed", confirmed_slot: slot, confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", checkinId)
        .select()
        .single();
      if (error || !row) throw error || new Error("Check-in not found");

      await Promise.allSettled([
        resend.emails.send({
          from: FROM,
          to: [row.guest_email],
          subject: "Your Outreach check-in is confirmed",
          html: emailLayout(`
            <h2 style="margin:0 0 16px 0;color:#166534;font-size:22px;font-weight:700;">Your check-in is confirmed</h2>
            <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">Hi ${row.guest_name},</p>
            <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">
              Your free Outreach Power Pack check-in is confirmed for:
            </p>
            ${emailCallout(`<strong style="color:#166534;font-size:16px;">${slot}</strong>`, "success")}
            <p style="margin:0 0 16px 0;color:#334155;font-size:14px;line-height:1.6;">
              We'll walk you through how the pay-per-interview model works for your target sectors and cities. See you then!
            </p>
            <p style="margin:20px 0 0 0;color:#334155;font-size:16px;">The Career Pilot Team</p>
          `),
        }),
        resend.emails.send({
          from: FROM,
          to: [ADMIN_EMAIL],
          subject: `Outreach check-in confirmed — ${row.guest_name}`,
          html: emailLayout(`
            <h2 style="margin:0 0 12px 0;color:#1a365d;font-size:20px;">Outreach check-in confirmed</h2>
            <p style="color:#334155;font-size:14px;">Client: <strong>${row.guest_name}</strong> (${row.guest_email})</p>
            <p style="color:#334155;font-size:14px;">Confirmed time: <strong>${slot}</strong></p>
          `),
        }),
      ]);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("outreach-checkin error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
