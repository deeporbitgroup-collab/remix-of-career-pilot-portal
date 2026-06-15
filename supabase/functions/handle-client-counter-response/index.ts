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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { projectId, action, slotId } = await req.json() as {
      projectId: string;
      action: "accept" | "reject_all";
      slotId?: string;
    };

    const { data: project } = await supabase
      .from("client_projects")
      .select("*, service:client_services(name), client:client_users(first_name, last_name, email)")
      .eq("id", projectId)
      .single();
    if (!project) throw new Error("Project not found");

    if (action === "accept") {
      if (!slotId) throw new Error("slotId required");
      await supabase.from("client_meeting_slots").update({ status: "selected" }).eq("id", slotId);
      await supabase
        .from("client_projects")
        .update({ status: "scheduled", scheduling_status: "confirmed" })
        .eq("id", projectId);

      const { data: slot } = await supabase
        .from("client_meeting_slots")
        .select("proposed_time")
        .eq("id", slotId)
        .single();

      // Notify primary associate
      const { data: assoc } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("id", project.active_associate_id)
        .single();
      if (assoc?.email) {
        await resend.emails.send({
          from: "Career Pilot <noreply@careerpilot.it>",
          to: [assoc.email],
          subject: "Client accepted your alternative time slot",
          html: `<p>Hi ${assoc.first_name},</p><p>The client accepted your proposed slot for <strong>${project.service?.name}</strong>: ${slot?.proposed_time}.</p>`,
        });
      }
      try {
        await supabase.functions.invoke("send-associate-slot-confirmation", {
          body: { projectId, slotId, selectedTime: slot?.proposed_time },
        });
      } catch (e) { console.error(e); }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reject_all") {
      // Activate backup if available, else manual
      if (!project.backup_associate_id) {
        await supabase
          .from("client_projects")
          .update({ scheduling_status: "no_associate_available" })
          .eq("id", projectId);

        await resend.emails.send({
          from: "Career Pilot <noreply@careerpilot.it>",
          to: ["careerpilot2025@gmail.com"],
          subject: "⚠️ Client rejected counter-proposal, no backup",
          html: `<p>Project <strong>${projectId}</strong> needs manual handling.</p>`,
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
          backup_activated_at: new Date().toISOString(),
        })
        .eq("id", projectId);

      const { data: backup } = await supabase
        .from("profiles")
        .select("email, first_name")
        .eq("id", project.backup_associate_id)
        .single();
      if (backup?.email) {
        await resend.emails.send({
          from: "Career Pilot <noreply@careerpilot.it>",
          to: [backup.email],
          subject: "New booking request — backup activation",
          html: `<p>Hi ${backup.first_name},</p><p>You've been activated as backup for <strong>${project.service?.name}</strong> with ${project.client?.first_name} ${project.client?.last_name}. Please confirm one of the client's original time slots from your dashboard.</p>`,
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
    console.error("handle-client-counter-response error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
