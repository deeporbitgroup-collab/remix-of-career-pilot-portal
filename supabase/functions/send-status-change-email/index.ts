import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Career Pilot URLs - NEVER use Lovable URLs
const TALENT_POOL_HOME = "https://careerpilot.it/talent-pool";
const STUDENT_DASHBOARD = "https://careerpilot.it/talent-pool/student/dashboard";
const COMPANY_DASHBOARD = "https://careerpilot.it/talent-pool/company/dashboard";

interface StatusChangeRequest {
  email: string;
  name: string;
  role: 'STUDENT' | 'COMPANY';
  action: 'LOGIN_ACCESS' | 'TALENT_POOL_ACCESS' | 'PAYMENT_REQUIRED' | 'PAYMENT_VERIFIED' | 'REJECTED';
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
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${gradient}; border-radius: 16px 16px 0 0;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Career Pilot</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Talent Pool</p>
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
              <p style="margin: 0; color: #1e3a8a; font-size: 14px; font-weight: 600;">careerpilot2025@gmail.com</p>
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
    const { email, name, role, action }: StatusChangeRequest = await req.json();

    let subject = "";
    let content = "";
    let gradient = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";
    const dashboardUrl = role === 'STUDENT' ? STUDENT_DASHBOARD : COMPANY_DASHBOARD;

    switch (action) {
      case 'LOGIN_ACCESS':
        subject = "Login Access Granted - Career Pilot Talent Pool";
        gradient = "linear-gradient(135deg, #16a34a 0%, #15803d 100%)";
        content = `
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 20px;">
              <span style="font-size: 48px;">✅</span>
            </div>
          </div>
          
          <h2 style="margin: 0 0 20px 0; color: #16a34a; font-size: 24px; font-weight: 600; text-align: center;">Login Access Granted!</h2>
          
          <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Dear <strong>${name}</strong>,
          </p>
          
          <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Great news! Your registration has been reviewed and you now have access to log in to the Career Pilot Talent Pool platform.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);">
              Access Platform
            </a>
          </div>
          
          <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Best regards,<br>
            <strong style="color: #16a34a;">The Career Pilot Team</strong>
          </p>
        `;
        break;

      case 'TALENT_POOL_ACCESS':
        subject = "Full Talent Pool Access Granted - Career Pilot";
        gradient = "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)";
        content = `
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #e0f2fe; border-radius: 50%; padding: 20px;">
              <span style="font-size: 48px;">🎉</span>
            </div>
          </div>
          
          <h2 style="margin: 0 0 20px 0; color: #0284c7; font-size: 24px; font-weight: 600; text-align: center;">Full Access Granted!</h2>
          
          <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Dear <strong>${name}</strong>,
          </p>
          
          <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Congratulations! You now have <strong>full access</strong> to the Career Pilot Talent Pool platform.
          </p>
          
          ${role === 'STUDENT' ? `
          <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
            <p style="margin: 0; color: #0369a1; font-size: 15px; font-weight: 500;">
              🚀 What you can do now:
            </p>
            <ul style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.8; padding-left: 20px;">
              <li>View all partner companies</li>
              <li>Update your profile and preferences</li>
              <li>See which companies have selected you</li>
              <li>Connect with potential employers</li>
            </ul>
          </div>
          ` : `
          <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
            <p style="margin: 0; color: #0369a1; font-size: 15px; font-weight: 500;">
              🚀 What you can do now:
            </p>
            <ul style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.8; padding-left: 20px;">
              <li>Browse all student profiles</li>
              <li>Select candidates of interest</li>
              <li>Access detailed student information</li>
              <li>Start your recruiting journey</li>
            </ul>
          </div>
          `}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4);">
              Go to Dashboard
            </a>
          </div>
          
          <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Best regards,<br>
            <strong style="color: #0284c7;">The Career Pilot Team</strong>
          </p>
        `;
        break;

      case 'PAYMENT_REQUIRED':
        subject = "You're Admitted! Complete Your Payment - Career Pilot Talent Pool";
        gradient = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
        content = `
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; padding: 20px;">
              <span style="font-size: 48px;">🎉</span>
            </div>
          </div>
          
          <h2 style="margin: 0 0 20px 0; color: #d97706; font-size: 24px; font-weight: 600; text-align: center;">You've Been Admitted!</h2>
          
          <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Dear <strong>${name}</strong>,
          </p>
          
          <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Great news! Your application has been reviewed and <strong>approved</strong>! You've been selected to join the Career Pilot Talent Pool.
          </p>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
            <p style="margin: 0; color: #92400e; font-size: 15px; font-weight: 500;">
              💳 Next Step: Complete Your Payment
            </p>
            <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
              To activate your full access, please complete the payment. Log in to your dashboard to find payment instructions and upload your payment receipt.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${STUDENT_DASHBOARD}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
              Make Payment
            </a>
          </div>
          
          <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Best regards,<br>
            <strong style="color: #d97706;">The Career Pilot Team</strong>
          </p>
        `;
        break;

      case 'PAYMENT_VERIFIED':
        subject = "Payment Verified - Welcome to Career Pilot Talent Pool!";
        gradient = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
        content = `
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #d1fae5; border-radius: 50%; padding: 20px;">
              <span style="font-size: 48px;">✅</span>
            </div>
          </div>
          
          <h2 style="margin: 0 0 20px 0; color: #059669; font-size: 24px; font-weight: 600; text-align: center;">Payment Verified!</h2>
          
          <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Dear <strong>${name}</strong>,
          </p>
          
          <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Great news! Your payment has been verified and you now have <strong>full access</strong> to the Career Pilot Talent Pool.
          </p>
          
          <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
            <p style="margin: 0; color: #065f46; font-size: 15px; font-weight: 500;">
              🚀 You can now:
            </p>
            <ul style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.8; padding-left: 20px;">
              <li>View all partner companies</li>
              <li>Update your profile and preferences</li>
              <li>See which companies are interested in you</li>
              <li>Start your career journey!</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${STUDENT_DASHBOARD}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
              Access Talent Pool
            </a>
          </div>
          
          <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Best regards,<br>
            <strong style="color: #059669;">The Career Pilot Team</strong>
          </p>
        `;
        break;

      case 'REJECTED':
        subject = "Application Update - Career Pilot Talent Pool";
        gradient = "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";
        content = `
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; background-color: #fef2f2; border-radius: 50%; padding: 20px;">
              <span style="font-size: 48px;">📋</span>
            </div>
          </div>
          
          <h2 style="margin: 0 0 20px 0; color: #dc2626; font-size: 24px; font-weight: 600; text-align: center;">Application Update</h2>
          
          <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Dear <strong>${name}</strong>,
          </p>
          
          <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Thank you for your interest in the Career Pilot Talent Pool. After careful review, we regret to inform you that we are unable to approve your application at this time.
          </p>
          
          <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
            For further information or if you have any questions, please don't hesitate to contact us at <a href="mailto:careerpilot2025@gmail.com" style="color: #1e3a8a; font-weight: 600;">careerpilot2025@gmail.com</a>
          </p>
          
          <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
            Best regards,<br>
            <strong style="color: #dc2626;">The Career Pilot Team</strong>
          </p>
        `;
        break;
    }

    const { error: emailError } = await resend.emails.send({
      from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
      to: [email],
      subject,
      html: getEmailTemplate(content, gradient),
    });

    if (emailError) {
      console.error("Email error:", emailError);
    }

    console.log("Status change email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
