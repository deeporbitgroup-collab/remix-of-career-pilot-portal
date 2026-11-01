import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { getTpUserLanguage, pick, resolveLang, type TpLang } from "../_shared/tpLanguage.ts";

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

// Resolve display names + notification emails for both parties (same shape the
// meeting flow uses, so behaviour stays consistent across recruiting actions).
// requester: who performed the action — their body.language is the fallback when
// their preferred_language can't be read from the DB.
async function resolveParties(
  supabase: any,
  companyId: string,
  studentId: string,
  requester?: "company" | "student",
  bodyLang?: unknown
) {
  const { data: comp } = await supabase
    .from("company_profiles").select("company_name, reference_email").eq("user_id", companyId).maybeSingle();
  const { data: compUser } = await supabase
    .from("talent_pool_users").select("email").eq("id", companyId).maybeSingle();
  const { data: stu } = await supabase
    .from("student_profiles").select("first_name, last_name").eq("user_id", studentId).maybeSingle();
  const { data: stuUser } = await supabase
    .from("talent_pool_users").select("email").eq("id", studentId).maybeSingle();
  const companyLang: TpLang = resolveLang(
    await getTpUserLanguage(supabase, { userId: companyId }),
    requester === "company" ? bodyLang : undefined
  );
  const studentLang: TpLang = resolveLang(
    await getTpUserLanguage(supabase, { userId: studentId }),
    requester === "student" ? bodyLang : undefined
  );
  const rawStudentName = `${stu?.first_name ?? ""} ${stu?.last_name ?? ""}`.trim();
  return {
    companyName: comp?.company_name || "The company",
    companyEmail: comp?.reference_email || compUser?.email || "",
    studentName: rawStudentName || "the candidate",
    studentEmail: stuUser?.email || "",
    // Italian fallbacks for the generic names.
    companyNameIt: comp?.company_name || "L'azienda",
    studentNameIt: rawStudentName || "il candidato",
    companyLang,
    studentLang,
  };
}

async function sendAll(emails: Array<{ to: string; subject: string; html: string } | null>) {
  // Non-fatal: a failed email must never break the decision.
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

// Move the selection to a new stage; fails clearly if there is no selection row.
async function setStage(supabase: any, companyId: string, studentId: string, stage: string) {
  const { data, error } = await supabase
    .from("company_selected_students")
    .update({ stage, stage_updated_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .eq("student_id", studentId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---- Action: offer (company extends a job offer to the candidate) ----
async function handleOffer(supabase: any, body: any) {
  const { companyId, studentId, jobTitle, message } = body;
  if (!companyId || !studentId) {
    return json(400, { error: "companyId and studentId are required" });
  }
  const updated = await setStage(supabase, companyId, studentId, "OFFER");
  if (!updated) return json(404, { error: "Selection not found for this company/candidate" });

  const p = await resolveParties(supabase, companyId, studentId, "company", body.language);
  const rolePart = jobTitle ? ` for <strong>${jobTitle}</strong>` : "";
  const rolePartIt = jobTitle ? ` per il ruolo di <strong>${jobTitle}</strong>` : "";
  const subjRole = jobTitle ? `: ${jobTitle}` : "";
  const msg = message ? `<p>${message}</p>` : "";

  await sendAll([
    {
      to: p.studentEmail,
      subject: pick(
        p.studentLang,
        `🎉 You received an offer from ${p.companyName}${subjRole}`,
        `🎉 Hai ricevuto un'offerta da ${p.companyNameIt}${subjRole}`
      ),
      html: pick(
        p.studentLang,
        `<p>Great news — <strong>${p.companyName}</strong> would like to make you an offer${rolePart}.</p>${msg}<p>They'll be in touch with the details. You can see this in your Talent Pool dashboard under the company that selected you.</p>`,
        `<p>Ottime notizie — <strong>${p.companyNameIt}</strong> vorrebbe farti un'offerta${rolePartIt}.</p>${msg}<p>L'azienda ti contatterà con i dettagli. Puoi vederlo nella tua dashboard del Talent Pool, sotto l'azienda che ti ha selezionato.</p>`
      ),
    },
    {
      to: p.companyEmail,
      subject: pick(
        p.companyLang,
        `Offer sent to ${p.studentName}${subjRole}`,
        `Offerta inviata a ${p.studentNameIt}${subjRole}`
      ),
      html: pick(
        p.companyLang,
        `<p>You sent an offer to <strong>${p.studentName}</strong>${rolePart}.</p>${msg}<p>The candidate and Career Pilot have been notified.</p>`,
        `<p>Hai inviato un'offerta a <strong>${p.studentNameIt}</strong>${rolePartIt}.</p>${msg}<p>Il candidato e Career Pilot sono stati informati.</p>`
      ),
    },
    {
      to: ADMIN_EMAIL,
      subject: `Offer: ${p.companyName} → ${p.studentName}`,
      html: `<p><strong>${p.companyName}</strong> sent an offer to <strong>${p.studentName}</strong>${rolePart}.</p>${msg}`,
    },
  ]);

  return json(200, { success: true, stage: "OFFER" });
}

// ---- Action: reject (company declines the candidate) ----
async function handleReject(supabase: any, body: any) {
  const { companyId, studentId, reason } = body;
  if (!companyId || !studentId) {
    return json(400, { error: "companyId and studentId are required" });
  }
  const updated = await setStage(supabase, companyId, studentId, "REJECTED");
  if (!updated) return json(404, { error: "Selection not found for this company/candidate" });

  const p = await resolveParties(supabase, companyId, studentId, "company", body.language);
  const reasonPart = reason ? `<p>Note from the company: ${reason}</p>` : "";
  const reasonPartIt = reason ? `<p>Nota dell'azienda: ${reason}</p>` : "";

  await sendAll([
    {
      to: p.studentEmail,
      subject: pick(
        p.studentLang,
        `Update on your application with ${p.companyName}`,
        `Aggiornamento sulla tua candidatura con ${p.companyNameIt}`
      ),
      html: pick(
        p.studentLang,
        `<p>Thank you for your interest. <strong>${p.companyName}</strong> has decided not to move forward at this time.</p>${reasonPart}<p>Keep your profile active — other companies in the Talent Pool can still reach you.</p>`,
        `<p>Grazie per il tuo interesse. <strong>${p.companyNameIt}</strong> ha deciso di non procedere per il momento.</p>${reasonPartIt}<p>Mantieni attivo il tuo profilo — le altre aziende del Talent Pool possono comunque contattarti.</p>`
      ),
    },
    {
      to: p.companyEmail,
      subject: pick(p.companyLang, `You declined ${p.studentName}`, `Hai scartato ${p.studentNameIt}`),
      html: pick(
        p.companyLang,
        `<p>You marked <strong>${p.studentName}</strong> as not selected.</p>${reasonPart}<p>The candidate and Career Pilot have been notified.</p>`,
        `<p>Hai segnato <strong>${p.studentNameIt}</strong> come non selezionato.</p>${reasonPartIt}<p>Il candidato e Career Pilot sono stati informati.</p>`
      ),
    },
    {
      to: ADMIN_EMAIL,
      subject: `Rejected: ${p.companyName} ✕ ${p.studentName}`,
      html: `<p><strong>${p.companyName}</strong> declined <strong>${p.studentName}</strong>.</p>${reasonPart}`,
    },
  ]);

  return json(200, { success: true, stage: "REJECTED" });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const action = body?.action;

    switch (action) {
      case "offer":
        return await handleOffer(supabase, body);
      case "reject":
        return await handleReject(supabase, body);
      default:
        return json(400, { error: `Unsupported action: ${action}` });
    }
  } catch (error: any) {
    console.error("recruiting-decision error:", error);
    return json(500, { error: error.message || "Unexpected error" });
  }
});
