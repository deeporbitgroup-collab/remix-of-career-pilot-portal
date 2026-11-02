import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

// Inlined from supabase/functions/_shared/email.ts (kept in sync manually):
// self-contained on purpose so this function can also be pasted/deployed
// as a single file from the Supabase Dashboard, which doesn't support the
// "../_shared/..." relative import that a CLI bundle deploy would resolve.
const FROM = "Career Pilot <noreply@careerpilot.it>";
const ADMIN_EMAIL = "careerpilot2025@gmail.com";

const emailLayout = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr><td>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); border-radius: 16px 16px 0 0;">
        <tr><td style="padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Career Pilot</h1>
          <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 14px;">Your Flight Plan to Success</p>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <tr><td style="padding: 40px 30px;">${content}</td></tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
        <tr><td style="padding: 30px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Have questions? Contact us:</p>
          <p style="margin: 0; color: #1a365d; font-size: 14px; font-weight: 600;">${ADMIN_EMAIL}</p>
          <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Career Pilot. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

const emailCallout = (
  text: string,
  variant: "info" | "warning" | "success" = "info"
): string => {
  const colors = {
    info: { bg: "#f0f9ff", border: "#3b82f6", title: "#1e40af" },
    warning: { bg: "#fffbeb", border: "#f59e0b", title: "#b45309" },
    success: { bg: "#f0fdf4", border: "#22c55e", title: "#166534" },
  }[variant];
  return `
  <div style="background-color: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 20px; margin: 24px 0; border-radius: 0 12px 12px 0;">
    <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6;">${text}</p>
  </div>`;
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CV_BUCKET = "documents";
const CV_SIGNED_URL_TTL = 60 * 60 * 24 * 30; // 30 days — plenty of time for admin/mentor follow-up

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TimeSlot {
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
}

interface MentorBookingRequest {
  mentorId: string;
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  message?: string;
  slot1: TimeSlot;
  slot2: TimeSlot;
  cvPath?: string | null;
  language?: "it" | "en";
  // "interest" (Talent Pool → Boost Resources): no time slots — the student only
  // signals interest in a mentor; the CareerBoost team follows up to organise a
  // session or a plan. Default "booking" keeps the original 2-slot flow.
  requestType?: "booking" | "interest" | "service";
  source?: string;
  // requestType "service": which CareerBoost service the student asked about
  service?: "cv" | "cover" | "cvcover" | "outreach" | "video";
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isValidEmail = (value: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);

const WEEKDAYS_IT = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatSlot(slot: TimeSlot, lang: "it" | "en"): string {
  const d = new Date(`${slot.date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return `${slot.date} ${slot.time}`;
  const weekday = lang === "it" ? WEEKDAYS_IT[d.getUTCDay()] : WEEKDAYS_EN[d.getUTCDay()];
  const month = lang === "it" ? MONTHS_IT[d.getUTCMonth()] : MONTHS_EN[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return lang === "it"
    ? `${weekday} ${day} ${month} ${year}, ore ${slot.time} (orario italiano)`
    : `${weekday}, ${month} ${day}, ${year} at ${slot.time} (Italian time)`;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const detailsBlock = (rows: [string, string][]) => `
  <div style="background-color:#f1f5f9;border-radius:10px;padding:18px 20px;margin:20px 0;line-height:1.9;">
    ${rows.map(([label, value]) => `<p style="margin:0;"><strong>${label}:</strong> ${value}</p>`).join("")}
  </div>`;


// ── CareerBoost branded email kit (introduction + service requests) ─────────
function makeCb(it: boolean) {
        const CB_TEAM_EMAILS = ["info@careerboost.it", ADMIN_EMAIL];
        const CB_FROM = "CareerBoost <noreply@careerpilot.it>";
        const CB_LOGO = "https://careerboost.it/__l5e/assets-v1/c84f8942-3466-4e28-ba80-51cf0a680362/careerboost-logo-white.png";

        const personCard = (name: string, subtitle: string, img?: string) => `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F8FC;border:1px solid #E3E7F1;border-radius:14px;margin:24px 0;">
            <tr>
              ${img ? `<td width="88" style="padding:18px 0 18px 18px;vertical-align:middle;"><img src="${img}" width="70" height="70" alt="" style="display:block;width:70px;height:70px;border-radius:12px;object-fit:cover;filter:grayscale(100%);" /></td>` : ""}
              <td style="padding:18px;vertical-align:middle;">
                <p style="margin:0;font-family:'Times New Roman',Times,serif;font-size:22px;color:#0A0A1F;">${name}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#646E92;">${subtitle}</p>
              </td>
            </tr>
          </table>`;

        const steps = (items: string[]) => `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;">
            ${items.map((t, i) => `
              <tr>
                <td width="34" style="vertical-align:top;padding:6px 0;">
                  <div style="width:24px;height:24px;border-radius:12px;background:#1B2A8E;color:#ffffff;font-size:12px;font-weight:700;line-height:24px;text-align:center;">${i + 1}</div>
                </td>
                <td style="vertical-align:top;padding:8px 0;font-size:14px;line-height:1.55;color:#2E3550;">${t}</td>
              </tr>`).join("")}
          </table>`;

        const cbLayout = (preheader: string, kicker: string, title: string, body: string) => `<!DOCTYPE html>
  <html lang="${it ? "it" : "en"}">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(title)}</title></head>
  <body style="margin:0;padding:0;background:#EEF0F7;font-family:'Inter','Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EEF0F7;">
      <tr><td align="center" style="padding:28px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
          <tr><td style="background:#0A0A1F;background-image:linear-gradient(135deg,#05060D 0%,#0A0A1F 45%,#142C8A 85%,#2430D4 120%);border-radius:20px 20px 0 0;padding:34px 36px;">
            <img src="${CB_LOGO}" height="44" alt="CareerBoost" style="display:block;height:44px;width:auto;border:0;" />
            <p style="margin:26px 0 6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#85B3FF;font-weight:700;">${kicker}</p>
            <h1 style="margin:0;font-size:26px;line-height:1.25;color:#ffffff;font-weight:700;">${title}</h1>
          </td></tr>
          <tr><td style="background:#ffffff;padding:34px 36px;border-left:1px solid #E3E7F1;border-right:1px solid #E3E7F1;">
            ${body}
          </td></tr>
          <tr><td style="background:#F7F8FC;border:1px solid #E3E7F1;border-top:none;border-radius:0 0 20px 20px;padding:24px 36px;text-align:center;">
            <p style="margin:0;font-size:13px;color:#646E92;">${it ? "Domande? Scrivici a" : "Questions? Write to us at"} <a href="mailto:info@careerboost.it" style="color:#1B2A8E;font-weight:600;text-decoration:none;">info@careerboost.it</a></p>
            <p style="margin:10px 0 0;font-size:12px;color:#8E97B5;">© ${new Date().getFullYear()} CareerBoost · careerboost.it</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;

        const p = (html: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#2E3550;">${html}</p>`;
        const signature = `<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#2E3550;">${it ? "A presto," : "Talk soon,"}<br><strong style="color:#0A0A1F;">${it ? "Il team CareerBoost" : "The CareerBoost Team"}</strong></p>`;
        const detailRows = (rows: [string, string][]) => `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #E3E7F1;border-radius:14px;margin:20px 0;">
            ${rows.map(([k, v], i) => `<tr><td style="padding:12px 18px;font-size:13px;color:#646E92;width:38%;${i ? "border-top:1px solid #EEF0F7;" : ""}">${k}</td><td style="padding:12px 18px;font-size:14px;color:#0A0A1F;font-weight:600;${i ? "border-top:1px solid #EEF0F7;" : ""}">${v}</td></tr>`).join("")}
          </table>`;


  return { CB_TEAM_EMAILS, CB_FROM, CB_LOGO, personCard, steps, cbLayout, p, signature, detailRows };
}


const SERVICE_COPY = {
  cv: {
    it: { name: "Riscrittura del CV", what: "il tuo CV riscritto da un esperto del tuo settore", steps: ["Il team CareerBoost ti contatterà a breve via email o WhatsApp.", "Capiremo il tuo profilo, i settori e i ruoli a cui punti.", "Ti abbineremo all'esperto giusto per riscrivere il tuo CV."] },
    en: { name: "CV rewrite", what: "your CV rewritten by an expert in your sector", steps: ["The CareerBoost team will contact you shortly by email or WhatsApp.", "We'll understand your profile and the sectors and roles you're targeting.", "We'll match you with the right expert to rewrite your CV."] },
  },
  cover: {
    it: { name: "Riscrittura della cover letter", what: "la tua cover letter riscritta da un esperto del tuo settore", steps: ["Il team CareerBoost ti contatterà a breve via email o WhatsApp.", "Capiremo la tua storia e le aziende a cui ti candidi.", "Ti abbineremo all'esperto giusto per riscrivere la tua cover letter."] },
    en: { name: "Cover letter rewrite", what: "your cover letter rewritten by an expert in your sector", steps: ["The CareerBoost team will contact you shortly by email or WhatsApp.", "We'll understand your story and the companies you're applying to.", "We'll match you with the right expert to rewrite your cover letter."] },
  },
  cvcover: {
    it: { name: "CV e Cover Letter", what: "maggiori informazioni sulla riscrittura di CV e cover letter", steps: ["Il team CareerBoost ti contatterà a breve via email o WhatsApp.", "Capiremo il tuo profilo, la tua storia e i ruoli a cui punti.", "Ti spiegheremo come funziona e ti abbineremo all'esperto giusto del tuo settore."] },
    en: { name: "CV & Cover Letter", what: "more information about the CV and cover letter rewrite", steps: ["The CareerBoost team will contact you shortly by email or WhatsApp.", "We'll understand your profile, your story and the roles you're targeting.", "We'll explain how it works and match you with the right expert in your sector."] },
  },
  outreach: {
    it: { name: "Outreach Power Pack", what: "maggiori informazioni sull'Outreach Power Pack", steps: ["Il team CareerBoost ti contatterà a breve via email o WhatsApp.", "Ti spiegheremo come funziona: database di contatti su misura e invio automatico.", "Capiremo insieme settori e città su cui puntare."] },
    en: { name: "Outreach Power Pack", what: "more information about the Outreach Power Pack", steps: ["The CareerBoost team will contact you shortly by email or WhatsApp.", "We'll walk you through how it works: a tailored contact database and automatic sending.", "Together we'll choose the sectors and cities to target."] },
  },
  video: {
    it: { name: "Video di presentazione", what: "assistenza per realizzare il tuo video di presentazione", steps: ["Il team CareerBoost ti contatterà a breve via email o WhatsApp.", "Ti spiegheremo come girare un video di presentazione efficace: cosa dire, come e in quanto tempo.", "Ti seguiremo passo passo finché il video non è pronto per il tuo profilo."] },
    en: { name: "Presentation video", what: "help creating your presentation video", steps: ["The CareerBoost team will contact you shortly by email or WhatsApp.", "We'll show you how to record an effective presentation video: what to say, how, and how long.", "We'll guide you step by step until your video is ready for your profile."] },
  },
} as const;

async function handleServiceRequest(o: {
  firstName: string; lastName: string; email: string; whatsapp: string;
  service: "cv" | "cover" | "cvcover" | "outreach" | "video"; it: boolean; source?: string;
}): Promise<Response> {
  const { it } = o;
  const { CB_FROM, steps, cbLayout, p, signature, detailRows } = makeCb(it);
  // The two CareerBoost admins that receive service requests (CV / cover letter / video).
  const TEAM_EMAILS = ["info@careerboost.it", "fassio.leone@gmail.com"];
  const copy = SERVICE_COPY[o.service][it ? "it" : "en"];
  const clientName = `${o.firstName} ${o.lastName}`.trim();
  const safeName = escapeHtml(clientName);
  const safeFirst = escapeHtml(o.firstName.trim());
  const safeEmail = escapeHtml(o.email);
  const safeWhatsapp = escapeHtml(o.whatsapp);
  const serviceName = escapeHtml(copy.name);

  const serviceBadge = `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:20px 0 24px;">
      <tr><td style="background:#EEF0FB;border:1px solid #D9DBF8;border-radius:999px;padding:8px 16px;font-size:13px;font-weight:700;color:#1B2A8E;">${serviceName}</td></tr>
    </table>`;

  const studentHtml = cbLayout(
    it ? `Grazie ${safeFirst}, abbiamo ricevuto la tua richiesta` : `Thanks ${safeFirst}, we've received your request`,
    it ? "Richiesta ricevuta" : "Request received",
    it ? `Grazie ${safeFirst}!` : `Thank you, ${safeFirst}!`,
    p(it
      ? `Abbiamo ricevuto la tua richiesta per <strong>${escapeHtml(copy.what)}</strong>.`
      : `We've received your request for <strong>${escapeHtml(copy.what)}</strong>.`) +
    serviceBadge +
    `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0A0A1F;text-transform:uppercase;letter-spacing:1px;">${it ? "Cosa succede ora" : "What happens next"}</p>` +
    steps(copy.steps as unknown as string[]) +
    signature
  );

  const teamHtml = cbLayout(
    `${safeName} → ${serviceName}`,
    it ? "Nuova richiesta di servizio" : "New service request",
    it ? `${safeName} ha richiesto: ${serviceName}` : `${safeName} requested: ${serviceName}`,
    p(it
      ? "Uno studente della Talent Pool ha richiesto un servizio CareerBoost. Contattalo a breve per capire le sue esigenze."
      : "A Talent Pool student has requested a CareerBoost service. Contact them shortly to understand their needs.") +
    detailRows([
      [it ? "Studente" : "Student", safeName],
      ["Email", `<a href="mailto:${safeEmail}" style="color:#1B2A8E;text-decoration:none;">${safeEmail}</a>`],
      ["WhatsApp", safeWhatsapp],
      [it ? "Servizio richiesto" : "Requested service", serviceName],
      [it ? "Lingua" : "Language", it ? "Italiano" : "English"],
      [it ? "Provenienza" : "Source", escapeHtml(o.source || "Talent Pool")],
    ]) +
    p(it ? "Lo studente è già stato avvisato che lo contatteremo a breve." : "The student has already been told we'll contact them shortly.")
  );

  const [teamRes, studentRes] = await Promise.all([
    resend.emails.send({ from: CB_FROM, to: TEAM_EMAILS, reply_to: o.email,
      subject: it ? `Richiesta ${copy.name}: ${clientName}` : `${copy.name} request: ${clientName}`, html: teamHtml }),
    resend.emails.send({ from: CB_FROM, to: [o.email], reply_to: "info@careerboost.it",
      subject: it ? `Grazie! Abbiamo ricevuto la tua richiesta — ${copy.name}` : `Thank you! We've received your request — ${copy.name}`, html: studentHtml }),
  ]);
  for (const [label, res] of [["team", teamRes], ["student", studentRes]] as const) {
    if (res.error) {
      console.error(`${label} service email error:`, res.error);
      throw new Error(res.error.message || `${label} service email failed`);
    }
  }
  return json(200, { success: true, requestType: "service", service: o.service });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body: MentorBookingRequest = await req.json();
    const {
      mentorId,
      firstName,
      lastName,
      email,
      whatsapp,
      message,
      slot1,
      slot2,
      cvPath,
      language,
      requestType,
      source,
      service,
    } = body;
    const lang: "it" | "en" = language === "en" ? "en" : "it";
    const isInterest = requestType === "interest";

    // ── Service request (CV rewrite / cover letter / Outreach Power Pack) ──
    if (requestType === "service") {
      if (!firstName || !lastName || !email || !whatsapp || !service || !["cv", "cover", "cvcover", "outreach", "video"].includes(service)) {
        return json(400, { error: "Missing required service request fields" });
      }
      if (!isValidEmail(email)) return json(400, { error: "Invalid client email" });
      return await handleServiceRequest({ firstName, lastName, email, whatsapp, service, it: lang === "it", source });
    }

    if (
      !mentorId || !firstName || !lastName || !email || !whatsapp ||
      (!isInterest && (!slot1?.date || !slot1?.time || !slot2?.date || !slot2?.time))
    ) {
      return json(400, { error: "Missing required booking fields" });
    }
    if (!isValidEmail(email)) {
      return json(400, { error: "Invalid client email" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: mentor, error: mentorError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .eq("id", mentorId)
      .eq("role", "ASSOCIATE")
      .maybeSingle();

    if (mentorError) throw mentorError;
    if (!mentor || !mentor.email) {
      return json(404, { error: "Mentor not found" });
    }

    const mentorName = `${mentor.first_name || ""} ${mentor.last_name || ""}`.trim() || "Mentor";
    const clientName = `${firstName} ${lastName}`.trim();

    let cvUrl: string | null = null;
    if (cvPath) {
      const { data: signed, error: signError } = await supabase.storage
        .from(CV_BUCKET)
        .createSignedUrl(cvPath, CV_SIGNED_URL_TTL);
      if (signError) {
        console.error("CV signed URL error:", signError);
      } else {
        cvUrl = signed?.signedUrl ?? null;
      }
    }

    const safeClientName = escapeHtml(clientName);
    const safeMentorName = escapeHtml(mentorName);
    const safeEmail = escapeHtml(email);
    const safeWhatsapp = escapeHtml(whatsapp);
    const safeMessage = message ? escapeHtml(message) : "";
    // ── Interest-only request (no time slots) ─────────────────────────────
    // A Talent Pool student asks for an introduction to a mentor. Three branded
    // CareerBoost emails, all in the student's language (it/en): mentor (you've
    // been selected), CareerBoost team (who selected whom) and student (thanks).
    if (isInterest) {
      const it = lang === "it";
      const { data: mentorExtra } = await supabase
        .from("profiles")
        .select("photo_url")
        .eq("id", mentorId)
        .maybeSingle();
      const photo = (mentorExtra?.photo_url || "").trim();
      const mentorFirst = escapeHtml((mentor.first_name || "").trim() || mentorName);
      const studentFirst = escapeHtml(firstName.trim());
      const sourceLabel = source ? escapeHtml(source) : "Talent Pool";
      const { CB_TEAM_EMAILS, CB_FROM, personCard, steps, cbLayout, p, signature, detailRows } = makeCb(it);

      // Mentor — you've been selected
      const mentorHtmlI = cbLayout(
        it ? `${safeClientName} ti ha scelto come mentor` : `${safeClientName} has chosen you as a mentor`,
        "Mentor · CareerBoost",
        it ? `Ciao ${mentorFirst}, sei stato selezionato` : `Hi ${mentorFirst}, you've been selected`,
        p(it
          ? `Ottime notizie: <strong>${safeClientName}</strong>, studente della Talent Pool CareerBoost, ti ha selezionato come mentor e vorrebbe organizzare una sessione o un percorso con te.`
          : `Great news: <strong>${safeClientName}</strong>, a student in the CareerBoost Talent Pool, has selected you as a mentor and would like to arrange a session or a plan with you.`) +
        personCard(safeClientName, it ? "Studente · Talent Pool" : "Student · Talent Pool") +
        `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0A0A1F;text-transform:uppercase;letter-spacing:1px;">${it ? "Prossimi passi" : "Next steps"}</p>` +
        steps(it
          ? ["Il team CareerBoost ti contatterà a breve.", `Insieme capiremo le esigenze di ${studentFirst} e definiremo una sessione o un piano.`, "Ti confermeremo data, orario e dettagli prima della call."]
          : ["The CareerBoost team will contact you shortly.", `Together we'll understand ${studentFirst}'s needs and define a session or a plan.`, "We'll confirm date, time and details before the call."]) +
        p(it ? "Non devi fare nulla per ora: ci pensiamo noi. Grazie per il supporto alla community CareerBoost!" : "There's nothing you need to do for now — we'll take care of it. Thank you for supporting the CareerBoost community!") +
        signature
      );

      // CareerBoost team — who selected whom
      const teamHtmlI = cbLayout(
        `${safeClientName} → ${safeMentorName}`,
        it ? "Nuova richiesta di introduzione" : "New introduction request",
        it ? `${safeClientName} ha selezionato ${safeMentorName}` : `${safeClientName} selected ${safeMentorName}`,
        p(it
          ? "Uno studente della Talent Pool ha richiesto un'introduzione con un mentor. Contattalo per capire le sue esigenze e organizzare una sessione o un piano."
          : "A Talent Pool student has requested an introduction to a mentor. Contact them to understand their needs and arrange a session or a plan.") +
        detailRows([
          [it ? "Studente" : "Student", safeClientName],
          ["Email", `<a href="mailto:${safeEmail}" style="color:#1B2A8E;text-decoration:none;">${safeEmail}</a>`],
          ["WhatsApp", safeWhatsapp],
          [it ? "Mentor selezionato" : "Selected mentor", safeMentorName],
          [it ? "Email mentor" : "Mentor email", escapeHtml(mentor.email)],
          [it ? "Lingua" : "Language", it ? "Italiano" : "English"],
          [it ? "Provenienza" : "Source", sourceLabel],
        ]) +
        p(it ? "Il mentor e lo studente sono già stati avvisati che il team li contatterà a breve." : "The mentor and the student have already been told the team will contact them shortly.")
      );

      // Student — thank you
      const studentHtmlI = cbLayout(
        it ? `Grazie ${studentFirst}, abbiamo ricevuto la tua richiesta` : `Thanks ${studentFirst}, we've received your request`,
        it ? "Richiesta di introduzione" : "Introduction request",
        it ? `Grazie ${studentFirst}!` : `Thank you, ${studentFirst}!`,
        p(it
          ? `Abbiamo ricevuto la tua richiesta di introduzione con <strong>${safeMentorName}</strong>, che è già stato avvisato del tuo interesse.`
          : `We've received your introduction request for <strong>${safeMentorName}</strong>, who has already been told about your interest.`) +
        personCard(safeMentorName, it ? "Il tuo mentor · CareerBoost" : "Your mentor · CareerBoost", photo || undefined) +
        `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0A0A1F;text-transform:uppercase;letter-spacing:1px;">${it ? "Cosa succede ora" : "What happens next"}</p>` +
        steps(it
          ? ["Il team CareerBoost ti contatterà a breve via email o WhatsApp.", "Capiremo insieme le tue esigenze e i tuoi obiettivi.", `Organizzeremo una sessione o un piano con ${safeMentorName}, breve o lungo in base a ciò che ti serve.`]
          : ["The CareerBoost team will contact you shortly by email or WhatsApp.", "Together we'll understand your needs and goals.", `We'll arrange a session or a plan with ${safeMentorName}, short or long depending on what you need.`]) +
        signature
      );

      const [aRes, mRes, cRes] = await Promise.all([
        resend.emails.send({ from: CB_FROM, to: CB_TEAM_EMAILS, reply_to: email,
          subject: it ? `Introduzione mentor: ${clientName} → ${mentorName}` : `Mentor introduction: ${clientName} → ${mentorName}`, html: teamHtmlI }),
        resend.emails.send({ from: CB_FROM, to: [mentor.email], reply_to: "info@careerboost.it",
          subject: it ? `${clientName} ti ha selezionato come mentor` : `${clientName} has selected you as a mentor`, html: mentorHtmlI }),
        resend.emails.send({ from: CB_FROM, to: [email], reply_to: "info@careerboost.it",
          subject: it ? `Grazie! La tua richiesta per ${mentorName} è arrivata` : `Thank you! Your request for ${mentorName} has arrived`, html: studentHtmlI }),
      ]);
      for (const [label, res] of [["team", aRes], ["mentor", mRes], ["student", cRes]] as const) {
        if (res.error) {
          console.error(`${label} introduction email error:`, res.error);
          throw new Error(res.error.message || `${label} introduction email failed`);
        }
      }
      return json(200, { success: true, requestType: "interest" });
    }

    const slot1Text = formatSlot(slot1, lang);
    const slot2Text = formatSlot(slot2, lang);

    const cvLineHtml = cvUrl
      ? `<p style="margin:0 0 0;"><strong>${lang === "it" ? "CV" : "Resume"}:</strong> <a href="${cvUrl}" style="color:#1a365d;">${lang === "it" ? "Scarica il CV" : "Download resume"}</a></p>`
      : "";
    const cvLineText = cvUrl ? `\n${lang === "it" ? "CV" : "Resume"}: ${cvUrl}` : "";

    // ── Admin email ──────────────────────────────────────────────────────
    const adminSubject = lang === "it"
      ? `Nuova prenotazione mentor: ${clientName} → ${mentorName}`
      : `New mentor booking: ${clientName} → ${mentorName}`;

    const adminHtml = emailLayout(`
      <h2 style="margin:0 0 20px;color:#1a365d;font-size:22px;">
        ${lang === "it" ? "Nuova richiesta di prenotazione mentor" : "New mentor booking request"}
      </h2>
      ${detailsBlock([
        [lang === "it" ? "Cliente" : "Client", safeClientName],
        ["Email", safeEmail],
        ["WhatsApp", safeWhatsapp],
        [lang === "it" ? "Mentor richiesto" : "Requested mentor", safeMentorName],
        [lang === "it" ? "Fascia oraria 1" : "Time slot 1", slot1Text],
        [lang === "it" ? "Fascia oraria 2" : "Time slot 2", slot2Text],
      ])}
      ${safeMessage ? `<p style="font-size:15px;line-height:1.6;"><strong>${lang === "it" ? "Di cosa ha bisogno" : "What they need help with"}:</strong><br>${safeMessage}</p>` : ""}
      ${cvLineHtml}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
      <p style="font-size:13px;color:#64748b;"><em>${lang === "it" ? "Notifica automatica dal sistema di prenotazione mentor CareerBoost." : "Automatic notification from the CareerBoost mentor booking system."}</em></p>
    `);
    const adminText = `${lang === "it" ? "Nuova richiesta di prenotazione mentor" : "New mentor booking request"}
${lang === "it" ? "Cliente" : "Client"}: ${clientName}
Email: ${email}
WhatsApp: ${whatsapp}
${lang === "it" ? "Mentor richiesto" : "Requested mentor"}: ${mentorName}
${lang === "it" ? "Fascia oraria 1" : "Time slot 1"}: ${slot1Text}
${lang === "it" ? "Fascia oraria 2" : "Time slot 2"}: ${slot2Text}${message ? `\n${lang === "it" ? "Di cosa ha bisogno" : "What they need"}: ${message}` : ""}${cvLineText}`;

    // ── Mentor email ─────────────────────────────────────────────────────
    const mentorSubject = lang === "it"
      ? `${clientName} vorrebbe prenotare una sessione con te`
      : `${clientName} would like to book a session with you`;

    const mentorHtml = emailLayout(`
      <h2 style="margin:0 0 20px;color:#1a365d;font-size:22px;">
        ${lang === "it" ? `Ciao ${escapeHtml((mentor.first_name || "").trim() || mentorName)}, hai una nuova richiesta` : `Hi ${escapeHtml((mentor.first_name || "").trim() || mentorName)}, you have a new request`}
      </h2>
      <p style="font-size:16px;line-height:1.6;">
        ${lang === "it"
          ? `<strong>${safeClientName}</strong> ha richiesto una sessione di mentoring con te tramite CareerBoost.`
          : `<strong>${safeClientName}</strong> has requested a mentoring session with you through CareerBoost.`}
      </p>
      ${detailsBlock([
        [lang === "it" ? "Nome" : "Name", safeClientName],
        ["Email", safeEmail],
        ["WhatsApp", safeWhatsapp],
        [lang === "it" ? "Fascia oraria proposta 1" : "Proposed time slot 1", slot1Text],
        [lang === "it" ? "Fascia oraria proposta 2" : "Proposed time slot 2", slot2Text],
      ])}
      ${safeMessage ? `<p style="font-size:15px;line-height:1.6;"><strong>${lang === "it" ? "Di cosa ha bisogno" : "What they need help with"}:</strong><br>${safeMessage}</p>` : ""}
      ${cvLineHtml}
      ${emailCallout(
        lang === "it"
          ? "Il nostro team si occuperà di confermare l'orario definitivo con entrambi. Se una delle due fasce non ti va bene, rispondi a questa email o scrivi a " + ADMIN_EMAIL + "."
          : "Our team will confirm the final time with both of you. If neither slot works, reply to this email or write to " + ADMIN_EMAIL + ".",
        "info"
      )}
      <p style="font-size:16px;line-height:1.6;">${lang === "it" ? "Grazie per il tuo supporto alla community CareerBoost!" : "Thank you for supporting the CareerBoost community!"}</p>
    `);
    const mentorText = `${lang === "it" ? "Nuova richiesta di sessione" : "New session request"}
${lang === "it" ? "Da" : "From"}: ${clientName}
Email: ${email}
WhatsApp: ${whatsapp}
${lang === "it" ? "Fascia oraria proposta 1" : "Proposed time slot 1"}: ${slot1Text}
${lang === "it" ? "Fascia oraria proposta 2" : "Proposed time slot 2"}: ${slot2Text}${message ? `\n${lang === "it" ? "Di cosa ha bisogno" : "What they need"}: ${message}` : ""}${cvLineText}

${lang === "it" ? "Il nostro team confermerà l'orario definitivo con entrambi." : "Our team will confirm the final time with both of you."}`;

    // ── Client email ─────────────────────────────────────────────────────
    const clientSubject = lang === "it"
      ? `La tua richiesta a ${mentorName} è stata inviata`
      : `Your request to ${mentorName} has been sent`;

    const clientHtml = emailLayout(`
      <h2 style="margin:0 0 20px;color:#1a365d;font-size:22px;">
        ${lang === "it" ? `Ciao ${escapeHtml(firstName)}, richiesta inviata!` : `Hi ${escapeHtml(firstName)}, your request is on its way!`}
      </h2>
      <p style="font-size:16px;line-height:1.6;">
        ${lang === "it"
          ? `Abbiamo inoltrato la tua richiesta di sessione con <strong>${safeMentorName}</strong>. Ecco il riepilogo:`
          : `We've forwarded your session request to <strong>${safeMentorName}</strong>. Here's a recap:`}
      </p>
      ${detailsBlock([
        [lang === "it" ? "Mentor" : "Mentor", safeMentorName],
        [lang === "it" ? "Fascia oraria proposta 1" : "Proposed time slot 1", slot1Text],
        [lang === "it" ? "Fascia oraria proposta 2" : "Proposed time slot 2", slot2Text],
      ])}
      ${safeMessage ? `<p style="font-size:15px;line-height:1.6;"><strong>${lang === "it" ? "Il tuo messaggio" : "Your message"}:</strong><br>${safeMessage}</p>` : ""}
      ${emailCallout(
        lang === "it"
          ? "Il nostro team confermerà l'orario definitivo con te e con il mentor via email o WhatsApp entro breve."
          : "Our team will confirm the final time with you and the mentor via email or WhatsApp shortly.",
        "success"
      )}
      <p style="font-size:16px;line-height:1.6;">${lang === "it" ? "Se devi modificare qualcosa, rispondi a questa email." : "If you need to change anything, just reply to this email."}</p>
      <br>
      <p style="font-size:16px;line-height:1.6;">${lang === "it" ? "A presto," : "Talk soon,"}<br><strong>${lang === "it" ? "Il team CareerBoost" : "The CareerBoost Team"}</strong></p>
    `);
    const clientText = `${lang === "it" ? "Richiesta inviata" : "Request sent"}
${lang === "it" ? "Mentor" : "Mentor"}: ${mentorName}
${lang === "it" ? "Fascia oraria proposta 1" : "Proposed time slot 1"}: ${slot1Text}
${lang === "it" ? "Fascia oraria proposta 2" : "Proposed time slot 2"}: ${slot2Text}${message ? `\n${lang === "it" ? "Il tuo messaggio" : "Your message"}: ${message}` : ""}

${lang === "it" ? "Il nostro team confermerà l'orario definitivo a breve." : "Our team will confirm the final time shortly."}`;

    const [adminRes, mentorRes, clientRes] = await Promise.all([
      resend.emails.send({
        from: FROM,
        to: [ADMIN_EMAIL],
        reply_to: email,
        subject: adminSubject,
        html: adminHtml,
        text: adminText,
      }),
      resend.emails.send({
        from: FROM,
        to: [mentor.email],
        reply_to: email,
        subject: mentorSubject,
        html: mentorHtml,
        text: mentorText,
      }),
      resend.emails.send({
        from: FROM,
        to: [email],
        reply_to: ADMIN_EMAIL,
        subject: clientSubject,
        html: clientHtml,
        text: clientText,
      }),
    ]);

    for (const [label, res] of [["admin", adminRes], ["mentor", mentorRes], ["client", clientRes]] as const) {
      if (res.error) {
        console.error(`${label} email error:`, res.error);
        throw new Error(res.error.message || `${label} booking email failed`);
      }
    }

    return json(200, { success: true, data: { admin: adminRes, mentor: mentorRes, client: clientRes } });
  } catch (error: any) {
    console.error("Error in send-mentor-booking-email function:", error);
    return json(500, { error: error.message || "Unexpected error" });
  }
};

serve(handler);
