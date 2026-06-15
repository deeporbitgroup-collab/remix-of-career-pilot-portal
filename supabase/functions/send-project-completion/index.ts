import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProjectCompletionRequest {
  clientEmail: string;
  clientName: string;
  associateEmail: string;
  associateName: string;
  serviceName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientEmail, clientName, associateEmail, associateName, serviceName }: ProjectCompletionRequest = await req.json();

    console.log("Sending project completion emails for:", { clientEmail, associateEmail, serviceName });

    // Email to Client - Thank you for choosing Career Pilot
    const clientEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You - Career Pilot</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 Congratulations!</h1>
              <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">Your Journey Has Reached a Milestone</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 22px;">Dear ${clientName},</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                We are thrilled to inform you that your <strong style="color: #1e3a5f;">${serviceName}</strong> has been successfully completed!
              </p>
              
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #22c55e;">
                <p style="color: #166534; font-size: 16px; margin: 0; font-weight: 500;">
                  ✨ Thank you for choosing Career Pilot to guide you on your career journey. Your trust in us means the world!
                </p>
              </div>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                We hope this experience has been valuable for your career growth. If you have any feedback or would like to explore more services, we'd love to hear from you.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://career-pilot-portal.lovable.app/client-portal" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View Your Dashboard
                </a>
              </div>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.8; margin: 20px 0 0 0;">
                Wishing you all the best in your career endeavors!
              </p>
              
              <p style="color: #1e3a5f; font-size: 16px; margin: 20px 0 0 0; font-weight: 600;">
                Warm regards,<br>
                The Career Pilot Team ✈️
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                Career Pilot - Your Partner in Career Success
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
                © 2025 Career Pilot. All rights reserved.
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

    // Email to Associate - Thank you for helping the client
    const associateEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You - Career Pilot</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🌟 Amazing Work!</h1>
              <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Another Client Successfully Helped</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #065f46; margin: 0 0 20px 0; font-size: 22px;">Dear ${associateName},</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                We wanted to take a moment to express our sincere gratitude for your exceptional work on the <strong style="color: #065f46;">${serviceName}</strong> project with <strong>${clientName}</strong>.
              </p>
              
              <div style="background: linear-gradient(135deg, #fefce8 0%, #fef9c3 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #eab308;">
                <p style="color: #854d0e; font-size: 16px; margin: 0; font-weight: 500;">
                  🏆 Your dedication and expertise have made a real difference in our client's career journey. Thank you for being an essential part of the Career Pilot family!
                </p>
              </div>
              
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center;">
                <p style="color: #1e40af; font-size: 14px; margin: 0 0 5px 0;">Your updated KPIs:</p>
                <p style="color: #1e3a8a; font-size: 18px; margin: 0; font-weight: 700;">+1 Client Assisted • +1 Call Completed</p>
              </div>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0;">
                Keep up the fantastic work! Your contributions are helping shape the careers of many aspiring professionals.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://career-pilot-portal.lovable.app/app/associate" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  View Your Dashboard
                </a>
              </div>
              
              <p style="color: #065f46; font-size: 16px; margin: 20px 0 0 0; font-weight: 600;">
                With gratitude,<br>
                The Career Pilot Team ✈️
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 14px; margin: 0;">
                Career Pilot - Empowering Career Success Together
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
                © 2025 Career Pilot. All rights reserved.
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

    // Send email to client
    const clientEmailResponse = await resend.emails.send({
      from: "Career Pilot <onboarding@careerpilot.it>",
      to: [clientEmail],
      subject: `🎉 Congratulations! Your ${serviceName} is Complete - Career Pilot`,
      html: clientEmailHtml,
    });

    console.log("Client email sent:", clientEmailResponse);

    // Send email to associate
    const associateEmailResponse = await resend.emails.send({
      from: "Career Pilot <onboarding@careerpilot.it>",
      to: [associateEmail],
      subject: `🌟 Great Job! ${serviceName} Completed Successfully - Career Pilot`,
      html: associateEmailHtml,
    });

    console.log("Associate email sent:", associateEmailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        clientEmail: clientEmailResponse,
        associateEmail: associateEmailResponse,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending project completion emails:", error);
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
