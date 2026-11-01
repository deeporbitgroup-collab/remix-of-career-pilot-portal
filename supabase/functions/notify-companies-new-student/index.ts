import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { DEFAULT_TP_LANG, getTpUsersLanguages, pick, type TpLang } from "../_shared/tpLanguage.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const COMPANY_DASHBOARD_URL = "https://careerpilot.it/talent-pool/company/dashboard";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  studentName: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { studentName }: NotifyRequest = await req.json();

    const rawName = (studentName || "").trim();

    // 1) All APPROVED company accounts (only valid/active companies — not pending/rejected).
    const { data: companyUsers, error: usersErr } = await supabase
      .from("talent_pool_users")
      .select("id, email")
      .eq("role", "COMPANY")
      .eq("registration_status", "APPROVED");

    if (usersErr) throw usersErr;

    if (!companyUsers || companyUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No approved companies to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Prefer each company's notification address (reference_email), fallback to the login email.
    const ids = companyUsers.map((c: any) => c.id);
    const { data: profiles } = await supabase
      .from("company_profiles")
      .select("user_id, reference_email")
      .in("user_id", ids);

    const refMap: Record<string, string> = Object.fromEntries(
      (profiles || []).map((p: any) => [p.user_id, p.reference_email])
    );

    // Each company's chosen language (one query; defaults to Italian).
    const langMap = await getTpUsersLanguages(supabase, ids);

    const recipientLang = new Map<string, TpLang>();
    for (const c of companyUsers as any[]) {
      const email = (refMap[c.id] || c.email || "").trim();
      if (email.length > 0 && !recipientLang.has(email)) {
        recipientLang.set(email, langMap.get(c.id) ?? DEFAULT_TP_LANG);
      }
    }
    const recipients = Array.from(recipientLang.keys());

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No company emails resolved" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const buildHtml = (lang: TpLang, name: string) => `
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${pick(lang, "New candidate in the Talent Pool", "Nuovo candidato nel Talent Pool")}</title>
      </head>
      <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f4f6fb;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb;padding:48px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
                <!-- Hero -->
                <tr>
                  <td style="padding:44px 40px 36px;text-align:center;background:linear-gradient(135deg,#0b1f4d 0%,#1e40af 50%,#3b82f6 100%);">
                    <div style="display:inline-block;padding:8px 16px;background-color:rgba(255,255,255,0.15);border-radius:999px;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:18px;">
                      Career Pilot · Talent Pool
                    </div>
                    <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.3px;line-height:1.25;">
                      ${pick(lang, "A new candidate just joined ✨", "È appena arrivato un nuovo candidato ✨")}
                    </h1>
                    <p style="margin:12px 0 0;color:rgba(255,255,255,0.85);font-size:15px;line-height:1.5;">
                      ${pick(lang, "Fresh talent is now available in your Talent Pool.", "Nuovi talenti sono ora disponibili nel tuo Talent Pool.")}
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <p style="margin:0 0 24px;color:#0f172a;font-size:16px;line-height:1.6;">
                      ${pick(lang, "A new candidate has just been added to the <strong>Career Pilot Talent Pool</strong> and is ready to be discovered.", "Un nuovo candidato è appena stato aggiunto al <strong>Career Pilot Talent Pool</strong> ed è pronto per essere scoperto.")}
                    </p>

                    <!-- Candidate card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#eff6ff 0%,#f8fafc 100%);border:1px solid #dbeafe;border-radius:14px;margin-bottom:28px;">
                      <tr>
                        <td style="padding:26px 28px;text-align:center;">
                          <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">${pick(lang, "New candidate", "Nuovo candidato")}</p>
                          <p style="margin:0;color:#1e3a8a;font-size:22px;font-weight:700;">${name}</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.6;">
                      ${pick(lang, "Open your dashboard to view their profile, presentation video and details — and express your interest before anyone else.", "Apri la tua dashboard per vederne il profilo, il video di presentazione e i dettagli — e manifesta il tuo interesse prima di chiunque altro.")}
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#1e40af,#3b82f6);">
                          <a href="${COMPANY_DASHBOARD_URL}" target="_blank" style="display:inline-block;padding:15px 38px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
                            ${pick(lang, "View candidate in your dashboard →", "Visualizza il candidato nella dashboard →")}
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:34px 0 0;color:#0f172a;font-size:15px;line-height:1.6;">
                      ${pick(lang, "Happy scouting,", "Buona ricerca,")}<br>
                      <strong style="color:#1e40af;">${pick(lang, "The Career Pilot Team", "Il team di Career Pilot")}</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:28px 40px;background-color:#0b1f4d;text-align:center;">
                    <p style="margin:0 0 8px;color:rgba(255,255,255,0.7);font-size:13px;">${pick(lang, "Have questions? Contact us at", "Hai domande? Contattaci a")} <a href="mailto:careerpilot2025@gmail.com" style="color:#93c5fd;text-decoration:none;">careerpilot2025@gmail.com</a></p>
                    <p style="margin:0;color:rgba(255,255,255,0.5);font-size:12px;line-height:1.6;">
                      © ${new Date().getFullYear()} Career Pilot · ${pick(lang, "All rights reserved", "Tutti i diritti riservati")}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // 3) One email per company (so addresses stay private). Failures are logged, never fatal.
    const results = await Promise.allSettled(
      recipients.map((email: string) => {
        const lang = recipientLang.get(email) ?? DEFAULT_TP_LANG;
        const name = rawName || pick(lang, "A new candidate", "Un nuovo candidato");
        return resend.emails.send({
          from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
          to: [email],
          subject: pick(
            lang,
            `New candidate in the Talent Pool: ${name}`,
            `Nuovo candidato nel Talent Pool: ${name}`
          ),
          html: buildHtml(lang, name),
        });
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`Email to ${recipients[i]} failed:`, r.reason);
      }
    });

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("notify-companies-new-student error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
