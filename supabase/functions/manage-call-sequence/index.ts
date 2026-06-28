// Phase 2 — sequential package calls.
//
// Two actions on the per-component projects of an associate group:
//   • mark_completed: the associate marks a meeting done. We stamp it completed and
//     UNLOCK the next call in the sequence (awaiting_associate_proposal), then ask the
//     associate to propose its times.
//   • propose_next:  the associate proposes 3 slots for an unlocked call. We store them
//     (slot_role 'associate_for_client') and notify the client to pick one. The client
//     accepts via the existing handle-client-counter-response 'accept'.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { FROM, emailLayout, emailButton, emailCallout, siteUrl } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, action, slots } = await req.json() as {
      projectId: string;
      action: "mark_completed" | "propose_next";
      slots?: Array<{ date: string; time: string }>;
    };
    if (!projectId || !action) throw new Error("projectId and action required");

    const { data: project } = await supabase
      .from("client_projects")
      .select("*, service:client_services(name), client:client_users(first_name, last_name, email)")
      .eq("id", projectId)
      .single();
    if (!project) throw new Error("Project not found");

    // ── mark_completed ───────────────────────────────────────────────────────
    if (action === "mark_completed") {
      await supabase
        .from("client_projects")
        .update({ status: "completed", meeting_completed_at: new Date().toISOString() })
        .eq("id", projectId);

      // Unlock the next call in this order group: kickoff → call_sequence 1; call N → N+1.
      const nextSeq = (project.call_sequence ?? 0) + 1;
      const { data: nextCall } = await supabase
        .from("client_projects")
        .select("id, associate_id, service:client_services(name)")
        .eq("order_id", project.order_id)
        .eq("call_sequence", nextSeq)
        .maybeSingle();

      if (nextCall) {
        await supabase
          .from("client_projects")
          .update({ scheduling_status: "awaiting_associate_proposal" })
          .eq("id", nextCall.id);

        const { data: assoc } = await supabase
          .from("profiles")
          .select("email, first_name")
          .eq("id", nextCall.associate_id)
          .single();
        if (assoc?.email) {
          await resend.emails.send({
            from: FROM,
            to: [assoc.email],
            subject: `Time to schedule the next call with ${project.client?.first_name ?? "your client"}`,
            html: emailLayout(`
              <h2 style="margin:0 0 16px 0;color:#1a365d;font-size:22px;font-weight:700;">Schedule the next call</h2>
              <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">Hi ${assoc.first_name},</p>
              <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">
                The previous meeting with <strong>${project.client?.first_name} ${project.client?.last_name}</strong> is done.
                Please propose <strong>3 time slots</strong> for their next call (<strong>${(nextCall as any).service?.name ?? "call"}</strong>) from your dashboard.
              </p>
              ${emailCallout(`The client has already paid for this — it just needs a time. A quick proposal keeps things moving.`, "info")}
              ${emailButton(`${siteUrl()}/app/associate`, "Propose times in your dashboard")}
            `),
          });
        }
        return new Response(JSON.stringify({ success: true, unlockedNext: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, unlockedNext: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── propose_next ───────────────────────────────────────────────────────────
    if (action === "propose_next") {
      if (!slots || slots.length < 1) throw new Error("At least one slot required");
      if (project.scheduling_status !== "awaiting_associate_proposal") {
        throw new Error("This call is not ready to be proposed yet.");
      }
      const rows = slots.map((s) => ({
        project_id: projectId,
        associate_id: project.active_associate_id,
        slot_role: "associate_for_client",
        proposed_date: s.date,
        proposed_time: `${s.date} ${s.time}`,
        status: "proposed",
      }));
      await supabase.from("client_meeting_slots").insert(rows);
      await supabase
        .from("client_projects")
        .update({ scheduling_status: "associate_proposed", status: "slots_proposed" })
        .eq("id", projectId);

      if (project.client?.email) {
        await resend.emails.send({
          from: FROM,
          to: [project.client.email],
          subject: `Your associate proposed times for your next call`,
          html: emailLayout(`
            <h2 style="margin:0 0 16px 0;color:#1a365d;font-size:22px;font-weight:700;">Pick a time for your next call</h2>
            <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">Hi ${project.client.first_name},</p>
            <p style="margin:0 0 16px 0;color:#334155;font-size:16px;line-height:1.6;">
              Your associate has proposed times for your next call (<strong>${project.service?.name ?? "call"}</strong>). Open your dashboard to choose the one that suits you.
            </p>
            ${emailButton(`${siteUrl()}/client-portal/dashboard`, "Choose your time")}
          `),
        });
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
    console.error("manage-call-sequence error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
