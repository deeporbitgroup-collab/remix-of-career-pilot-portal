import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "careerpilot2025@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PartnerRegistrationRequest {
  companyName: string;
  email: string;
  phone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, email, phone }: PartnerRegistrationRequest = await req.json();

    console.log("Sending partner registration emails for:", email);

    const loginUrl = "https://careerpilot.it/auth";

    // ── Welcome email to the partner company ────────────────────────────────
    const partnerEmail = await resend.emails.send({
      from: "Career Pilot <onboarding@careerpilot.it>",
      to: [email],
      subject: "Welcome to Career Pilot — we've received your registration 🤝",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Career Pilot</title>
          </head>
          <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;background-color:#f4f6fb;color:#0f172a;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb;padding:48px 16px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
                    <!-- Hero -->
                    <tr>
                      <td style="padding:48px 40px 40px;text-align:center;background:linear-gradient(135deg,#0b1f4d 0%,#1e40af 50%,#3b82f6 100%);">
                        <div style="display:inline-block;padding:8px 16px;background-color:rgba(255,255,255,0.15);border-radius:999px;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:20px;">
                          Career Pilot · Partner
                        </div>
                        <h1 style="margin:0;color:#ffffff;font-size:30px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">
                          Welcome aboard, ${companyName}!
                        </h1>
                        <p style="margin:14px 0 0;color:rgba(255,255,255,0.85);font-size:16px;line-height:1.5;">
                          Your partner registration has been received.
                        </p>
                      </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                      <td style="padding:40px;">
                        <p style="margin:0 0 16px;color:#0f172a;font-size:16px;line-height:1.6;">
                          Thank you for choosing to partner with Career Pilot — we're excited to work with you.
                        </p>
                        <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.6;">
                          Our team is reviewing your registration now. You'll be able to sign in as soon as your access is activated — this usually happens within <strong>12 hours</strong>. We'll email you the moment your account is ready.
                        </p>

                        <!-- Status box -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;margin-bottom:28px;">
                          <tr>
                            <td style="padding:20px 24px;">
                              <p style="margin:0 0 6px;color:#b45309;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Status</p>
                              <p style="margin:0;color:#92400e;font-size:15px;font-weight:600;">⏳ Pending activation — review in progress</p>
                            </td>
                          </tr>
                        </table>

                        <!-- Credentials box -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:28px;">
                          <tr>
                            <td style="padding:20px 24px;">
                              <p style="margin:0 0 6px;color:#64748b;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Your login email</p>
                              <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">${email}</p>
                            </td>
                          </tr>
                        </table>

                        <!-- What's next -->
                        <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;font-weight:700;">What happens next</h2>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;font-size:15px;line-height:1.5;">
                              <span style="color:#3b82f6;font-weight:700;margin-right:8px;">1.</span> If prompted, confirm your email address to verify your account
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#334155;font-size:15px;line-height:1.5;">
                              <span style="color:#3b82f6;font-weight:700;margin-right:8px;">2.</span> Our team reviews and activates your partner access
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:10px 0;color:#334155;font-size:15px;line-height:1.5;">
                              <span style="color:#3b82f6;font-weight:700;margin-right:8px;">3.</span> You receive a confirmation email and can sign in to your dashboard
                            </td>
                          </tr>
                        </table>

                        <!-- CTA (login, available once activated) -->
                        <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:32px auto 0;">
                          <tr>
                            <td align="center" style="border-radius:10px;background:linear-gradient(135deg,#1e40af,#3b82f6);">
                              <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">
                                Go to the login page →
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin:32px 0 0;color:#475569;font-size:14px;line-height:1.6;">
                          If you have any questions, just reply to this email — our team is here to help.
                        </p>
                        <p style="margin:24px 0 0;color:#0f172a;font-size:15px;line-height:1.6;">
                          Welcome to the journey,<br>
                          <strong style="color:#1e40af;">The Career Pilot Team</strong>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding:28px 40px;background-color:#0b1f4d;text-align:center;">
                        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;line-height:1.6;">
                          © ${new Date().getFullYear()} Career Pilot · All rights reserved
                        </p>
                        <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:12px;">
                          You're receiving this email because you registered as a Career Pilot Partner.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log("Partner welcome email sent:", partnerEmail);

    // ── Notification email to Career Pilot admin ────────────────────────────
    const adminEmail = await resend.emails.send({
      from: "Career Pilot <onboarding@careerpilot.it>",
      to: [ADMIN_EMAIL],
      subject: `New Partner Registration – ${companyName}`,
      html: `
        <h2>New Partner Registration</h2>
        <p>A new partner company has registered on the Career Pilot Crew Portal and is awaiting activation.</p>
        <br>
        <p><strong>Company:</strong> ${companyName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
        <br>
        <p>Please review and activate the partner's access in the admin dashboard.</p>
      `,
    });

    console.log("Admin notification email sent:", adminEmail);

    return new Response(
      JSON.stringify({ success: true, partnerEmail, adminEmail }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-partner-registration function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
