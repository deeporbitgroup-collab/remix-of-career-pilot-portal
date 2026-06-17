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

// Load a meeting by id (shared by accept/counter/decline). Returns null if absent.
async function loadMeeting(supabase: any, meetingId: string) {
  const { data, error } = await supabase
    .from("recruiting_meetings")
    .select("*")
    .eq("id", meetingId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---- Action: accept (the other party picks one of the proposed slots) ----
async function handleAccept(supabase: any, body: any) {
  const { meetingId, acceptedSlot } = body;
  if (!meetingId || !acceptedSlot?.datetime) {
    return json(400, { error: "meetingId and acceptedSlot.datetime are required" });
  }
  const meeting = await loadMeeting(supabase, meetingId);
  if (!meeting) return json(404, { error: "Meeting not found" });
  if (meeting.status !== "PROPOSED") {
    return json(409, { error: `Meeting is ${meeting.status}, cannot accept` });
  }

  const { data: updated, error } = await supabase
    .from("recruiting_meetings")
    .update({
      status: "CONFIRMED",
      confirmed_slot: acceptedSlot,
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId)
    .select()
    .single();
  if (error) throw error;

  const p = await resolveParties(supabase, meeting.company_id, meeting.student_id);
  const tz = meeting.timezone ? ` (${meeting.timezone})` : "";
  const when = `<strong>${acceptedSlot.datetime}</strong>${tz}`;
  const titlePart = meeting.title ? ` — <strong>${meeting.title}</strong>` : "";
  const subjTitle = meeting.title ? `: ${meeting.title}` : "";

  await sendAll([
    {
      to: p.companyEmail,
      subject: `Meeting confirmed with ${p.studentName}${subjTitle}`,
      html: `<p><strong>${p.studentName}</strong> confirmed your meeting${titlePart} for ${when}.</p><p>Add the interview link from your dashboard (Selected Students → this candidate) so they can join.</p>`,
    },
    {
      to: p.studentEmail,
      subject: `Meeting confirmed with ${p.companyName}${subjTitle}`,
      html: `<p>You confirmed the meeting with <strong>${p.companyName}</strong>${titlePart} for ${when}.</p><p>The video link will be shared before the call.</p>`,
    },
    {
      to: ADMIN_EMAIL,
      subject: `Meeting confirmed: ${p.companyName} ↔ ${p.studentName}`,
      html: `<p><strong>${p.studentName}</strong> and <strong>${p.companyName}</strong> confirmed a meeting${titlePart} for ${when}.</p>`,
    },
  ]);

  return json(200, { success: true, meeting: updated });
}

// ---- Action: counter (a party rejects the slots and proposes new ones) ----
async function handleCounter(supabase: any, body: any) {
  const { by, meetingId, proposedSlots, timezone } = body;
  if (!meetingId || !Array.isArray(proposedSlots) || proposedSlots.length === 0) {
    return json(400, { error: "meetingId and proposedSlots are required" });
  }
  const meeting = await loadMeeting(supabase, meetingId);
  if (!meeting) return json(404, { error: "Meeting not found" });
  if (meeting.status !== "PROPOSED") {
    return json(409, { error: `Meeting is ${meeting.status}, cannot counter` });
  }
  const proposer = by === "STUDENT" ? "STUDENT" : "COMPANY";

  const { data: updated, error } = await supabase
    .from("recruiting_meetings")
    .update({
      proposed_slots: proposedSlots,
      timezone: timezone || meeting.timezone || null,
      proposed_by: proposer,
      status: "PROPOSED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId)
    .select()
    .single();
  if (error) throw error;

  const p = await resolveParties(supabase, meeting.company_id, meeting.student_id);
  const list = slotsHtml(proposedSlots, timezone || meeting.timezone);
  const titlePart = meeting.title ? ` — <strong>${meeting.title}</strong>` : "";
  const subjTitle = meeting.title ? `: ${meeting.title}` : "";
  // The party that did NOT propose is the one who now needs to respond.
  const counteredByStudent = proposer === "STUDENT";

  await sendAll([
    {
      to: counteredByStudent ? p.companyEmail : p.studentEmail,
      subject: `New times proposed${subjTitle}`,
      html: `<p><strong>${counteredByStudent ? p.studentName : p.companyName}</strong> proposed new times${titlePart}. Open your <strong>Scheduled events</strong> tab to accept one or propose your own:</p><ul>${list}</ul>`,
    },
    {
      to: counteredByStudent ? p.studentEmail : p.companyEmail,
      subject: `You proposed new times${subjTitle}`,
      html: `<p>You proposed new times${titlePart}. Proposed times:</p><ul>${list}</ul><p>You'll be notified when they respond.</p>`,
    },
    {
      to: ADMIN_EMAIL,
      subject: `Meeting counter-proposed: ${p.companyName} ↔ ${p.studentName}`,
      html: `<p><strong>${counteredByStudent ? p.studentName : p.companyName}</strong> proposed new times${titlePart}.</p><ul>${list}</ul>`,
    },
  ]);

  return json(200, { success: true, meeting: updated });
}

// ---- Action: decline (a party declines the meeting outright) ----
async function handleDecline(supabase: any, body: any) {
  const { meetingId } = body;
  if (!meetingId) return json(400, { error: "meetingId is required" });
  const meeting = await loadMeeting(supabase, meetingId);
  if (!meeting) return json(404, { error: "Meeting not found" });
  if (meeting.status === "CONFIRMED" || meeting.status === "COMPLETED") {
    return json(409, { error: `Meeting is ${meeting.status}, cannot decline` });
  }

  const { data: updated, error } = await supabase
    .from("recruiting_meetings")
    .update({ status: "DECLINED", updated_at: new Date().toISOString() })
    .eq("id", meetingId)
    .select()
    .single();
  if (error) throw error;

  const p = await resolveParties(supabase, meeting.company_id, meeting.student_id);
  const titlePart = meeting.title ? ` — <strong>${meeting.title}</strong>` : "";
  const subjTitle = meeting.title ? `: ${meeting.title}` : "";

  await sendAll([
    {
      to: p.companyEmail,
      subject: `Meeting declined${subjTitle}`,
      html: `<p>The meeting${titlePart} with <strong>${p.studentName}</strong> was declined.</p>`,
    },
    {
      to: p.studentEmail,
      subject: `Meeting declined${subjTitle}`,
      html: `<p>The meeting${titlePart} with <strong>${p.companyName}</strong> was declined.</p>`,
    },
    {
      to: ADMIN_EMAIL,
      subject: `Meeting declined: ${p.companyName} ↔ ${p.studentName}`,
      html: `<p>The meeting${titlePart} between <strong>${p.companyName}</strong> and <strong>${p.studentName}</strong> was declined.</p>`,
    },
  ]);

  return json(200, { success: true, meeting: updated });
}

// ---- Action: set-link (company, or admin as fallback, sets the call link) ----
async function handleSetLink(supabase: any, body: any) {
  const { by, meetingId, meetLink, description } = body;
  if (!meetingId || !meetLink) {
    return json(400, { error: "meetingId and meetLink are required" });
  }
  const meeting = await loadMeeting(supabase, meetingId);
  if (!meeting) return json(404, { error: "Meeting not found" });
  if (meeting.status !== "CONFIRMED") {
    return json(409, { error: `Meeting is ${meeting.status}; the link can only be set on a confirmed meeting` });
  }
  const setter = by === "ADMIN" ? "ADMIN" : "COMPANY";

  // Update the link always; only touch description when it is supplied, so
  // re-sending the link never wipes an existing description.
  const updatePayload: any = { meet_link: meetLink, updated_at: new Date().toISOString() };
  if (description !== undefined) updatePayload.description = description || null;

  const { data: updated, error } = await supabase
    .from("recruiting_meetings")
    .update(updatePayload)
    .eq("id", meetingId)
    .select()
    .single();
  if (error) throw error;

  const p = await resolveParties(supabase, meeting.company_id, meeting.student_id);
  const tz = meeting.timezone ? ` (${meeting.timezone})` : "";
  const when = meeting.confirmed_slot?.datetime
    ? ` for <strong>${meeting.confirmed_slot.datetime}</strong>${tz}`
    : "";
  const titlePart = meeting.title ? ` — <strong>${meeting.title}</strong>` : "";
  const subjTitle = meeting.title ? `: ${meeting.title}` : "";
  const desc = updatePayload.description ? `<p>${updatePayload.description}</p>` : "";
  const linkHtml = `<p>Interview link: <a href="${meetLink}">${meetLink}</a></p>`;
  const bySuffix = setter === "ADMIN" ? " (added by Career Pilot)" : "";

  await sendAll([
    {
      to: p.studentEmail,
      subject: `Interview link ready — ${p.companyName}${subjTitle}`,
      html: `<p>Your interview with <strong>${p.companyName}</strong>${titlePart}${when} now has a link${bySuffix}.</p>${linkHtml}${desc}`,
    },
    {
      to: p.companyEmail,
      subject: `Interview link set — ${p.studentName}${subjTitle}`,
      html: `<p>The interview link for <strong>${p.studentName}</strong>${titlePart}${when} was saved${bySuffix}.</p>${linkHtml}${desc}`,
    },
    {
      to: ADMIN_EMAIL,
      subject: `Interview link set: ${p.companyName} ↔ ${p.studentName}`,
      html: `<p>Interview link set${bySuffix} for <strong>${p.companyName}</strong> ↔ <strong>${p.studentName}</strong>${titlePart}${when}.</p>${linkHtml}${desc}`,
    },
  ]);

  return json(200, { success: true, meeting: updated });
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
      case "accept":
        return await handleAccept(supabase, body);
      case "counter":
        return await handleCounter(supabase, body);
      case "decline":
        return await handleDecline(supabase, body);
      case "set-link":
        return await handleSetLink(supabase, body);
      default:
        return json(400, { error: `Unsupported action: ${action}` });
    }
  } catch (error: any) {
    console.error("recruiting-meeting-action error:", error);
    return json(500, { error: error.message || "Unexpected error" });
  }
});
