import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "careerpilot2025@gmail.com";
const FROM = "Career Pilot Talent Pool <noreply@careerpilot.it>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Resolve display names + notification emails for both parties.
async function resolveParties(supabase: any, companyId: string, studentId: string) {
  const { data: comp } = await supabase
    .from("company_profiles").select("company_name, reference_email").eq("user_id", companyId).maybeSingle();
  const { data: compUser } = await supabase
    .from("talent_pool_users").select("email").eq("id", companyId).maybeSingle();
  const { data: stu } = await supabase
    .from("student_profiles").select("first_name, last_name").eq("user_id", studentId).maybeSingle();
  const { data: stuUser } = await supabase
    .from("talent_pool_users").select("email").eq("id", studentId).maybeSingle();
  return {
    companyName: comp?.company_name || "The company",
    companyEmail: comp?.reference_email || compUser?.email || "",
    studentName: `${stu?.first_name ?? ""} ${stu?.last_name ?? ""}`.trim() || "the candidate",
    studentEmail: stuUser?.email || "",
  };
}

function slotsHtml(slots: any[], timezone?: string) {
  const tz = timezone ? ` <span style="color:#64748b">(${timezone})</span>` : "";
  return (slots || [])
    .map((s, i) => `<li>Option ${i + 1}: <strong>${s?.datetime ?? ""}</strong>${tz}${s?.label ? ` — ${s.label}` : ""}</li>`)
    .join("");
}

async function sendAll(emails: Array<{ to: string; subject: string; html: string } | null>) {
  // Non-fatal: a failed email must never break the action.
  try {
    await Promise.allSettled(
      emails
        .filter((e): e is { to: string; subject: string; html: string } => !!e && !!e.to)
        .map((e) => resend.emails.send({ from: FROM, to: [e.to], subject: e.subject, html: e.html }))
    );
  } catch (err) {
    console.error("Email error (non-fatal):", err);
  }
}

// ---- Action: propose (a party proposes 2 date+time slots) ----
async function handlePropose(supabase: any, body: any) {
  const { by, companyId, studentId, title, proposedSlots, timezone } = body;
  if (!companyId || !studentId || !Array.isArray(proposedSlots) || proposedSlots.length === 0) {
    return json(400, { error: "companyId, studentId and proposedSlots are required" });
  }
  const proposer = by === "STUDENT" ? "STUDENT" : "COMPANY";

  const { data: meeting, error } = await supabase
    .from("recruiting_meetings")
    .insert({
      company_id: companyId,
      student_id: studentId,
      title: title || null,
      proposed_slots: proposedSlots,
      timezone: timezone || null,
      status: "PROPOSED",
      proposed_by: proposer,
      created_by: proposer,
    })
    .select()
    .single();
  if (error) throw error;

  const p = await resolveParties(supabase, companyId, studentId);
  const list = slotsHtml(proposedSlots, timezone);
  const titlePart = title ? ` — <strong>${title}</strong>` : "";
  const subjTitle = title ? `: ${title}` : "";

  await sendAll([
    {
      to: p.studentEmail,
      subject: `New meeting proposal from ${p.companyName}${subjTitle}`,
      html: `<p><strong>${p.companyName}</strong> proposed a meeting${titlePart}. Open your <strong>Scheduled events</strong> tab to accept one of the times or propose your own:</p><ul>${list}</ul>`,
    },
    {
      to: p.companyEmail,
      subject: `You proposed a meeting to ${p.studentName}${subjTitle}`,
      html: `<p>You proposed a meeting to <strong>${p.studentName}</strong>${titlePart}. Proposed times:</p><ul>${list}</ul><p>You'll be notified when they respond.</p>`,
    },
    {
      to: ADMIN_EMAIL,
      subject: `Meeting proposed: ${p.companyName} → ${p.studentName}`,
      html: `<p><strong>${p.companyName}</strong> proposed a meeting to <strong>${p.studentName}</strong>${titlePart}.</p><ul>${list}</ul>`,
    },
  ]);

  return json(200, { success: true, meeting });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const action = body?.action;

    switch (action) {
      case "propose":
        return await handlePropose(supabase, body);
      // 'accept', 'counter', 'set-link' arrive in C2.2 / C2.3
      default:
        return json(400, { error: `Unsupported action: ${action}` });
    }
  } catch (error: any) {
    console.error("recruiting-meeting-action error:", error);
    return json(500, { error: error.message || "Unexpected error" });
  }
});
