import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentApprovalRequest {
  clientEmail: string;
  clientName: string;
  approved: boolean;
  firstName?: string;
  lastName?: string;
}

const getEmailTemplate = (content: string) => `
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
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); border-radius: 16px 16px 0 0;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Career Pilot</h1>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 14px;">Your Flight Plan to Success</p>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Have questions? Contact us:</p>
              <p style="margin: 0; color: #1a365d; font-size: 14px; font-weight: 600;">careerpilot2025@gmail.com</p>
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: PaymentApprovalRequest = await req.json();

    // Parse name from clientName if firstName/lastName not provided
    let firstName = body.firstName;
    let lastName = body.lastName;
    
    if (!firstName && body.clientName) {
      const parts = body.clientName.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    console.log("Sending payment approval email:", { email: body.clientEmail, approved: body.approved });

    let content: string;
    let subject: string;

    if (body.approved) {
      subject = "Payment Verified - Career Pilot";
      content = `
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 20px;">
            <span style="font-size: 48px;">✅</span>
          </div>
        </div>
        
        <h2 style="margin: 0 0 20px 0; color: #166534; font-size: 24px; font-weight: 600; text-align: center;">Payment Verified!</h2>
        
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
          Hi ${firstName} ${lastName},
        </p>
        
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
          We are pleased to confirm that your payment has been <strong style="color: #166534;">successfully verified</strong>!
        </p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
          <p style="margin: 0; color: #1e40af; font-size: 15px; font-weight: 500;">
            Next steps
          </p>
          <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
            Your selected Associate has been notified and will contact you shortly to schedule your consultation.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://careerpilot.it/client-portal/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(26, 54, 93, 0.4);">
            Go to Your Dashboard
          </a>
        </div>
        
        <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
          Thank you for choosing Career Pilot!<br>
          <strong style="color: #1a365d;">The Career Pilot Team</strong>
        </p>
      `;
    } else {
      subject = "Payment Verification Issue - Career Pilot";
      content = `
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background-color: #fef2f2; border-radius: 50%; padding: 20px;">
            <span style="font-size: 48px;">⚠️</span>
          </div>
        </div>
        
        <h2 style="margin: 0 0 20px 0; color: #991b1b; font-size: 24px; font-weight: 600; text-align: center;">Payment Verification Issue</h2>
        
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
          Hi ${firstName} ${lastName},
        </p>
        
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
          We were unable to verify your payment receipt. This could be due to:
        </p>
        
        <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #334155; font-size: 15px; line-height: 2;">
          <li>Incorrect payment amount</li>
          <li>Payment not yet received</li>
          <li>Unclear or incomplete receipt image</li>
        </ul>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
          <p style="margin: 0; color: #92400e; font-size: 15px; font-weight: 500;">
            What can you do?
          </p>
          <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
            Please verify your payment details and upload a clear receipt again, or contact us at <a href="mailto:careerpilot2025@gmail.com" style="color: #1a365d; font-weight: 600;">careerpilot2025@gmail.com</a> for assistance.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://careerpilot.it/client-portal/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(26, 54, 93, 0.4);">
            Go to Your Dashboard
          </a>
        </div>
        
        <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
          Best regards,<br>
          <strong style="color: #1a365d;">The Career Pilot Team</strong>
        </p>
      `;
    }

    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [body.clientEmail],
      subject: subject,
      html: getEmailTemplate(content),
    });

    console.log("Payment approval email sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending payment approval email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
