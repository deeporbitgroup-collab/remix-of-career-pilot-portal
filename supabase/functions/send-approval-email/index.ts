import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalRequest {
  email: string;
  name: string;
  approved: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, approved }: ApprovalRequest = await req.json();

    console.log("Sending approval email:", { email, name, approved });

    const subject = approved 
      ? "Career Pilot Access Granted" 
      : "Career Pilot Registration Update";

    const htmlContent = approved
      ? `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f4f4f7;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f7;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">🎉 Congratulations!</h1>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding: 40px;">
                        <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                          Hello <strong>${name}</strong>,
                        </p>
                        <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                          Great news! Your registration has been approved by the Career Pilot team.
                        </p>
                        <div style="margin: 30px 0; padding: 20px; background-color: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px;">
                          <p style="margin: 0; color: #065f46; font-size: 15px; line-height: 1.6;">
                            <strong>You're all set!</strong><br>
                            You can now log in to your personal area and start using the Career Pilot platform.
                          </p>
                        </div>
                        <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                          We're excited to have you on board and look forward to supporting you in achieving your career goals.
                        </p>
                        <p style="margin: 30px 0 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                          Best regards,<br>
                          <strong style="color: #1e40af;">The Career Pilot Team</strong>
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                          This is an automated message. Please do not reply to this email.
                        </p>
                        <p style="margin: 10px 0 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                          © ${new Date().getFullYear()} Career Pilot. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f4f4f7;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f7;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">Registration Update</h1>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding: 40px;">
                        <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                          Dear ${name},
                        </p>
                        <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                          We regret to inform you that your registration could not be approved at this time.
                        </p>
                        <p style="margin: 0 0 20px; color: #1f2937; font-size: 16px; line-height: 1.6;">
                          For further information, please contact the Career Pilot team at careerpilot2025@gmail.com
                        </p>
                        <p style="margin: 30px 0 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
                          Best regards,<br>
                          <strong style="color: #1e40af;">The Career Pilot Team</strong>
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                          This is an automated message. Please do not reply to this email.
                        </p>
                        <p style="margin: 10px 0 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                          © ${new Date().getFullYear()} Career Pilot. All rights reserved.
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

    const emailResponse = await resend.emails.send({
      from: "Career Pilot <onboarding@careerpilot.it>",
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending approval email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
