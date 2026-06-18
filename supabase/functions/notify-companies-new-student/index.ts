import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

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

    const name = (studentName || "").trim() || "A new candidate";

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

    const recipients = Array.from(
      new Set(
        companyUsers
          .map((c: any) => (refMap[c.id] || c.email || "").trim())
          .filter((e: string) => e.length > 0)
      )
    );

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No company emails resolved" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New candidate in the Talent Pool</title>
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
                      A new candidate just joined ✨
                    </h1>
                    <p style="margin:12px 0 0;color:rgba(255,255,255,0.85);font-size:15px;line-height:1.5;">
                      Fresh talent is now available in your Talent Pool.
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <p style="margin:0 0 24px;color:#0f172a;font-size:16px;line-height:1.6;">
                      A new candidate has just been added to the <strong>Career Pilot Talent Pool</strong> and is ready to be discovered.
                    </p>

                    <!-- Candidate card -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#eff6ff 0%,#f8fafc 100%);border:1px solid #dbeafe;border-radius:14px;margin-bottom:28px;">
                      <tr>
                        <td style="padding:26px 28px;text-align:center;">
                          <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">New candidate</p>
                          <p style="margin:0;color:#1e3a8a;font-size:22px;font-weight:700;">${name}</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.6;">
                      Open your dashboard to view their profile, presentation video and details — and express your interest before anyone else.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
                      <tr>
                        <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#1e40af,#3b82f6);">
                          <a href="${COMPANY_DASHBOARD_URL}" target="_blank" style="display:inline-block;padding:15px 38px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
                            View candidate in your dashboard →
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:34px 0 0;color:#0f172a;font-size:15px;line-height:1.6;">
                      Happy scouting,<br>
                      <strong style="color:#1e40af;">The Career Pilot Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding:28px 40px;background-color:#0b1f4d;text-align:center;">
                    <p style="margin:0 0 8px;color:rgba(255,255,255,0.7);font-size:13px;">Have questions? Contact us at <a href="mailto:careerpilot2025@gmail.com" style="color:#93c5fd;text-decoration:none;">careerpilot2025@gmail.com</a></p>
                    <p style="margin:0;color:rgba(255,255,255,0.5);font-size:12px;line-height:1.6;">
                      © ${new Date().getFullYear()} Career Pilot · All rights reserved
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
      recipients.map((email: string) =>
        resend.emails.send({
          from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
          to: [email],
          subject: `New candidate in the Talent Pool: ${name}`,
          html,
        })
      )
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
