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

interface CompanyRegistrationData {
  companyName: string;
  email: string;
  sector: string;
  size: string;
  referenceEmail: string;
  linkedin?: string;
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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); border-radius: 16px 16px 0 0;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Career Pilot</h1>
              <p style="margin: 10px 0 0 0; color: #bbf7d0; font-size: 14px;">Talent Pool - Partner Companies</p>
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
              <p style="margin: 0; color: #16a34a; font-size: 14px; font-weight: 600;">careerpilot2025@gmail.com</p>
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
    const data: CompanyRegistrationData = await req.json();
    const timestamp = new Date().toLocaleString('en-GB', { 
      timeZone: 'Europe/Rome',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // Email to company (EN)
    const companyContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">🏢</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #16a34a; font-size: 24px; font-weight: 600; text-align: center;">Thanks for Registering!</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Dear ${data.companyName} Team,
      </p>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Thank you for registering your company on the <strong>Career Pilot Talent Pool</strong>. We're excited to have you as a potential partner!
      </p>
      
      <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
        <p style="margin: 0; color: #166534; font-size: 15px; font-weight: 500;">
          📋 Your Registration Status
        </p>
        <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
          <strong>Status:</strong> Under Review<br>
          Your company profile is being reviewed by our team. We'll activate your Talent Pool access soon!
        </p>
      </div>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Once approved, you'll be able to browse talented students and discover the next great addition to your team.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${TALENT_POOL_HOME}" style="display: inline-block; background-color: #16a34a; background-image: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4); mso-padding-alt: 0;">
          Visit Talent Pool
        </a>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #16a34a;">The Career Pilot Team</strong>
      </p>
    `;

    // Send email to company
    const { error: companyEmailError } = await resend.emails.send({
      from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
      to: [data.referenceEmail],
      subject: "Thanks for registering — we'll activate your Talent Pool access soon",
      html: getEmailTemplate(companyContent),
    });

    if (companyEmailError) {
      console.error("Company email error:", companyEmailError);
    }

    // Email to Career Pilot admin (EN)
    const adminContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">📩</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #16a34a; font-size: 24px; font-weight: 600; text-align: center;">New Company Registration</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        A new company has registered and is awaiting approval.
      </p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Company Name:</strong> ${data.companyName}</p>
        <p style="margin: 8px 0;"><strong>Email:</strong> ${data.referenceEmail}</p>
        <p style="margin: 8px 0;"><strong>Sector:</strong> ${data.sector}</p>
        <p style="margin: 8px 0;"><strong>Size:</strong> ${data.size}</p>
        ${data.linkedin ? `<p style="margin: 8px 0;"><strong>LinkedIn:</strong> <a href="${data.linkedin}">${data.linkedin}</a></p>` : ''}
        <p style="margin: 8px 0;"><strong>Date:</strong> ${timestamp}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${TALENT_POOL_ADMIN}" style="display: inline-block; background-color: #16a34a; background-image: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4); mso-padding-alt: 0;">
          Review Company
        </a>
      </div>
    `;

    // Send email to Career Pilot admin
    const { error: adminEmailError } = await resend.emails.send({
      from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `New company registration awaiting approval - ${data.companyName}`,
      html: getEmailTemplate(adminContent),
    });

    if (adminEmailError) {
      console.error("Admin email error:", adminEmailError);
    }

    console.log("Company registration emails sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-company-registration function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
