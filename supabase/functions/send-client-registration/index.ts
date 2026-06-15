import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { firstName, lastName, email, phone, status, linkedinUrl } = await req.json();

    console.log("Sending registration emails for:", { firstName, lastName, email });

    // Email to admin
    const adminContent = `
      <h2 style="margin: 0 0 20px 0; color: #1a365d; font-size: 24px; font-weight: 600;">New Client Registration</h2>
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">A new client has registered on the platform:</p>
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; padding: 20px;">
        <tr><td style="padding: 10px 20px; color: #64748b; font-size: 14px;">Name</td><td style="padding: 10px 20px; color: #1e293b; font-size: 14px; font-weight: 600;">${firstName} ${lastName}</td></tr>
        <tr><td style="padding: 10px 20px; color: #64748b; font-size: 14px;">Email</td><td style="padding: 10px 20px; color: #1e293b; font-size: 14px; font-weight: 600;">${email}</td></tr>
        <tr><td style="padding: 10px 20px; color: #64748b; font-size: 14px;">Phone</td><td style="padding: 10px 20px; color: #1e293b; font-size: 14px; font-weight: 600;">${phone}</td></tr>
        <tr><td style="padding: 10px 20px; color: #64748b; font-size: 14px;">Status</td><td style="padding: 10px 20px; color: #1e293b; font-size: 14px; font-weight: 600;">${status}</td></tr>
        ${linkedinUrl ? `<tr><td style="padding: 10px 20px; color: #64748b; font-size: 14px;">LinkedIn</td><td style="padding: 10px 20px; color: #3b82f6; font-size: 14px;"><a href="${linkedinUrl}" style="color: #3b82f6; text-decoration: none;">${linkedinUrl}</a></td></tr>` : ''}
      </table>
      
      <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px;">Access the admin dashboard to approve the request.</p>
    `;

    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `New Client Registration: ${firstName} ${lastName}`,
      html: getEmailTemplate(adminContent),
    });

    // Email to client
    const clientContent = `
      <h2 style="margin: 0 0 20px 0; color: #1a365d; font-size: 24px; font-weight: 600;">Welcome to Career Pilot!</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Hi ${firstName} ${lastName},
      </p>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Thank you for registering with Career Pilot! We have received your access request.
      </p>
      
      <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 0 12px 12px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 15px; font-weight: 500;">
          What happens next?
        </p>
        <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
          Our team will verify your information and you will receive a confirmation email as soon as your account is active. This process typically takes 24-48 business hours.
        </p>
      </div>
      
      <p style="margin: 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Once approved, you will be able to:
      </p>
      
      <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #334155; font-size: 15px; line-height: 2;">
        <li>Access our exclusive career coaching services</li>
        <li>Book personalized consultations with our Associates</li>
        <li>Benefit from special discounts and exclusive promotions</li>
        <li>Manage your projects in your personal area</li>
      </ul>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        See you soon!<br>
        <strong style="color: #1a365d;">The Career Pilot Team</strong>
      </p>
    `;

    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [email],
      subject: "Thank you for registering with Career Pilot!",
      html: getEmailTemplate(clientContent),
    });

    console.log("Registration emails sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending registration email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
