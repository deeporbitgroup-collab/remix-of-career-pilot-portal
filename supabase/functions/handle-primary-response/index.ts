import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Pay-after-confirmation: the order group becomes due for payment when its meeting
// is confirmed. unlock_order_payment flips 'awaiting_confirmation' → 'awaiting_payment'
// exactly once and returns true only on that first transition, so we email once.
async function unlockOrderPaymentAndNotify(orderId: string | null | undefined) {
  if (!orderId) return;
  try {
    const { data: didUnlock, error } = await supabase.rpc("unlock_order_payment", {
      _order_id: orderId,
    });
    if (error) {
      console.error("unlock_order_payment error", error);
      return;
    }
    if (didUnlock) {
      await supabase.functions.invoke("send-order-email", { body: { orderId, type: "payment_due" } });
    }
  } catch (e) {
    console.error("unlockOrderPaymentAndNotify err", e);
  }
}

interface CounterSlot {
  date: string; // yyyy-MM-dd
  time: string; // HH:mm or range
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { projectId, action, slotId, counterSlots } = body as {
      projectId: string;
      action: "select_original" | "propose_new" | "decline_all";
      slotId?: string;
      counterSlots?: CounterSlot[];
    };

    if (!projectId || !action) {
      return new Response(JSON.stringify({ error: "Missing projectId or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch project
    const { data: project, error: projErr } = await supabase
      .from("client_projects")
      .select("*, service:client_services(name), client:client_users(first_name, last_name, email)")
      .eq("id", projectId)
      .single();
    if (projErr || !project) throw projErr || new Error("Project not found");

    // -------- Action: select_original --------
    if (action === "select_original") {
      if (!slotId) throw new Error("slotId required");
      await supabase.from("client_meeting_slots").update({ status: "selected" }).eq("id", slotId);
      await supabase
        .from("client_projects")
        .update({ status: "scheduled", scheduling_status: "confirmed" })
        .eq("id", projectId);

      // existing slot-confirmation notifications
      const { data: slot } = await supabase
        .from("client_meeting_slots")
        .select("proposed_time")
        .eq("id", slotId)
        .single();
      try {
        await supabase.functions.invoke("send-associate-slot-confirmation", {
          body: { projectId, slotId, selectedTime: slot?.proposed_time },
        });
      } catch (e) {
        console.error("notify err", e);
      }

      // Pay-after-confirmation: confirming the meeting makes payment due for the
      // whole order group. Unlock it exactly once, then email the client a pay link.
      await unlockOrderPaymentAndNotify(project.order_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -------- Action: propose_new --------
    if (action === "propose_new") {
      if (!counterSlots || counterSlots.length !== 2) {
        throw new Error("Exactly 2 counter slots required");
      }
      // Validate different days
      if (counterSlots[0].date === counterSlots[1].date) {
        throw new Error("Counter slots must be on different days");
      }

      const inserts = counterSlots.map((s) => ({
        project_id: projectId,
        associate_id: project.active_associate_id,
        slot_role: "primary_counter_proposal",
        proposed_date: s.date,
        proposed_time: `${s.date} ${s.time}`,
        status: "proposed",
      }));

      await supabase.from("client_meeting_slots").insert(inserts);
      await supabase
        .from("client_projects")
        .update({ scheduling_status: "primary_proposed_new" })
        .eq("id", projectId);

      // Notify client
      if (project.client?.email) {
        await resend.emails.send({
          from: "Career Pilot <noreply@careerpilot.it>",
          to: [project.client.email],
          subject: "Your associate proposed alternative time slots",
          html: `
            <h2>Hi ${project.client.first_name},</h2>
            <p>Your associate is unable to attend any of the time slots you proposed for <strong>${project.service?.name}</strong>.</p>
            <p>They proposed 2 alternative slots. Please log into your dashboard to accept one or to switch to the backup associate.</p>
            <br><p>Career Pilot Team</p>
          `,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // -------- Action: decline_all (activate backup) --------
    if (action === "decline_all") {
      if (!project.backup_associate_id) {
        // no backup → mark for manual handling
        await supabase
          .from("client_projects")
          .update({
            scheduling_status: "no_associate_available",
            primary_declined_at: new Date().toISOString(),
          })
          .eq("id", projectId);

        await resend.emails.send({
          from: "Career Pilot <noreply@careerpilot.it>",
          to: ["careerpilot2025@gmail.com"],
          subject: "⚠️ Primary declined, NO BACKUP available",
          html: `<p>Project <strong>${projectId}</strong> — service ${project.service?.name} for ${project.client?.first_name} ${project.client?.last_name} needs manual handling: primary declined and there's no backup associate.</p>`,
        });

        return new Response(JSON.stringify({ success: true, noBackup: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("client_projects")
        .update({
          active_associate_id: project.backup_associate_id,
          associate_id: project.backup_associate_id,
          scheduling_status: "awaiting_backup",
          primary_declined_at: new Date().toISOString(),
          backup_activated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      // Notify backup associate
      const { data: backup } = await supabase
        .from("profiles")
        .select("email, first_name, last_name")
        .eq("id", project.backup_associate_id)
        .single();

      if (backup?.email) {
        await resend.emails.send({
          from: "Career Pilot <noreply@careerpilot.it>",
          to: [backup.email],
          subject: "New booking request — backup activation",
          html: `
            <h2>Hi ${backup.first_name},</h2>
            <p>You've been activated as backup associate for a <strong>${project.service?.name}</strong> session with ${project.client?.first_name} ${project.client?.last_name}.</p>
            <p>The 3 time slots originally proposed by the client are available in your dashboard. Please confirm one as soon as possible.</p>
            <br><p>Career Pilot Team</p>
          `,
        });
      }

      // Notify client
      if (project.client?.email) {
        await resend.emails.send({
          from: "Career Pilot <noreply@careerpilot.it>",
          to: [project.client.email],
          subject: "Your booking moved to the backup associate",
          html: `
            <h2>Hi ${project.client.first_name},</h2>
            <p>Your primary associate is unavailable for <strong>${project.service?.name}</strong>. Your backup associate has been notified and will confirm one of your original time slots shortly.</p>
            <br><p>Career Pilot Team</p>
          `,
        });
      }

      return new Response(JSON.stringify({ success: true, backupActivated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("handle-primary-response error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
