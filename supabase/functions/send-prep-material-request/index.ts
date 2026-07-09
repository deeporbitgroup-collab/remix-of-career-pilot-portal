import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Career Pilot URLs - NEVER use Lovable URLs
const TALENT_POOL_HOME = "https://careerpilot.it/talent-pool";
const TALENT_POOL_ADMIN = "https://careerpilot.it/talent-pool/admin";

// Recipients
const TEAM_EMAIL = "careerpilot2025@gmail.com";
const CAREERBOOST_EMAIL = "Giacomo.Suriano@careerboost.it";

interface PrepRequest {
  studentName: string;
  studentEmail: string;
  partner: string;        // "CareerBoost" | "LanguageBoost"
  serviceTitle: string;
  priceLabel?: string;    // e.g. "€60" or "€35 / lesson · 50 lessons · €1750 total"
  targetLevel?: string;   // e.g. "For B2 students"
}

const getEmailTemplate = (content: string, gradient: string = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${gradient}; border-radius: 16px 16px 0 0;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Career Pilot</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Talent Pool · Prep Material</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Have questions? Contact us:</p>
              <p style="margin: 0; color: #1e3a8a; font-size: 14px; font-weight: 600;">${TEAM_EMAIL}</p>
              <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Career Pilot. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const detailsBlock = (rows: Array<[string, string]>) => `
  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
    ${rows.map(([k, v]) => `<p style="margin: 8px 0; color: #334155; font-size: 15px;"><strong>${k}:</strong> ${v}</p>`).join("")}
  </div>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      studentName,
      studentEmail,
      partner,
      serviceTitle,
      priceLabel,
      targetLevel,
    }: PrepRequest = await req.json();

    if (!studentEmail || !serviceTitle || !partner) {
      return new Response(
        JSON.stringify({ error: "studentEmail, partner and serviceTitle are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const name = studentName || "there";
    const timestamp = new Date().toLocaleString("en-GB", {
      timeZone: "Europe/Rome",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const detailRows: Array<[string, string]> = [
      ["Service", serviceTitle],
      ["Partner", partner],
    ];
    if (targetLevel) detailRows.push(["Level", targetLevel]);
    if (priceLabel) detailRows.push(["Price", priceLabel]);

    // ---- 1) Student confirmation (EN) ----
    const studentContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">✅</span>
        </div>
      </div>
      <h2 style="margin: 0 0 20px 0; color: #16a34a; font-size: 24px; font-weight: 600; text-align: center;">Request received!</h2>
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        We've received your request for <strong>${serviceTitle}</strong> by <strong>${partner}</strong>.
        Our team will get in touch with you shortly with the next steps.
      </p>
      ${detailsBlock(detailRows)}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${TALENT_POOL_HOME}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);">
          Back to Talent Pool
        </a>
      </div>
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Thank you for choosing Career Pilot!<br>
        <strong style="color: #16a34a;">The Career Pilot Team</strong>
      </p>
    `;

    const { error: studentErr } = await resend.emails.send({
      from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
      to: [studentEmail],
      subject: `Request received — ${serviceTitle}`,
      html: getEmailTemplate(studentContent, "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"),
    });
    if (studentErr) console.error("Student email error:", studentErr);

    // ---- 2) Team notification (EN) ----
    const teamContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">🔔</span>
        </div>
      </div>
      <h2 style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 24px; font-weight: 600; text-align: center;">New prep-material request</h2>
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        A student has requested a partner prep-material service from the Talent Pool.
      </p>
      ${detailsBlock([
        ["Student", name],
        ["Email", studentEmail],
        ...detailRows,
        ["Date", timestamp],
      ])}
      <div style="text-align: center; margin: 30px 0;">
        <a href="${TALENT_POOL_ADMIN}" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(30, 58, 138, 0.4);">
          Open Admin
        </a>
      </div>
    `;

    const { error: teamErr } = await resend.emails.send({
      from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
      to: [TEAM_EMAIL],
      subject: `New prep request — ${name} · ${partner}`,
      html: getEmailTemplate(teamContent),
    });
    if (teamErr) console.error("Team email error:", teamErr);

    // ---- 3) Partner (CareerBoost — receives both CareerBoost & LanguageBoost) (EN) ----
    const partnerContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">📩</span>
        </div>
      </div>
      <h2 style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 24px; font-weight: 600; text-align: center;">New request from a Career Pilot student</h2>
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        A Career Pilot Talent Pool student has requested one of your services. Please reach out to them directly to arrange the next steps.
      </p>
      ${detailsBlock([
        ["Student", name],
        ["Email", studentEmail],
        ...detailRows,
        ["Date", timestamp],
      ])}
    `;

    const { error: partnerErr } = await resend.emails.send({
      from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
      to: [CAREERBOOST_EMAIL],
      reply_to: studentEmail,
      subject: `New Career Pilot request — ${serviceTitle}`,
      html: getEmailTemplate(partnerContent, "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)"),
    });
    if (partnerErr) console.error("Partner email error:", partnerErr);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-prep-material-request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
