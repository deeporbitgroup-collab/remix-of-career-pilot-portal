import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Career Pilot URLs - NEVER use Lovable URLs
const STUDENT_DASHBOARD = "https://careerpilot.it/talent-pool/student/dashboard";
const COMPANY_DASHBOARD = "https://careerpilot.it/talent-pool/company/dashboard";
const TALENT_POOL_ADMIN = "https://careerpilot.it/talent-pool/admin";

interface NextStepRequest {
  companyId: string;
  studentId: string;
  companyName: string;
  companyEmail: string;
  studentName: string;
  studentEmail: string;
  nextStep: 'DIRECT_HIRING' | 'INTERVIEW' | 'ONLINE_ASSESSMENT';
}

const getNextStepLabel = (step: string): string => {
  switch (step) {
    case 'DIRECT_HIRING': return 'Direct Hiring';
    case 'INTERVIEW': return 'Interview';
    case 'ONLINE_ASSESSMENT': return 'Online Assessment';
    default: return step;
  }
};

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
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Talent Pool - Active Recruiting</p>
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
  console.log("send-recruiting-next-step function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, companyEmail, studentName, studentEmail, nextStep }: NextStepRequest = await req.json();

    console.log("Processing next step notification:", { companyName, studentName, nextStep });

    const timestamp = new Date().toLocaleString('en-GB', { 
      timeZone: 'Europe/Rome',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const nextStepLabel = getNextStepLabel(nextStep);

    // Email to student
    const studentContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">🚀</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 24px; font-weight: 600; text-align: center;">Active Recruiting Started!</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Dear ${studentName},
      </p>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Exciting news! <strong>${companyName}</strong> has confirmed the next step in your recruiting process.
      </p>
      
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Next Step</p>
        <p style="margin: 0; color: #1e3a8a; font-size: 24px; font-weight: 700;">${nextStepLabel}</p>
      </div>
      
      <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 15px; font-weight: 500;">
          📋 What's next?
        </p>
        <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
          Check your Active Recruiting section in the dashboard. You'll be able to chat with the company and Career Pilot, and access any shared documents or materials.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${STUDENT_DASHBOARD}" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(30, 58, 138, 0.4);">
          Open Active Recruiting
        </a>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Good luck!<br>
        <strong style="color: #1e3a8a;">The Career Pilot Team</strong>
      </p>
    `;

    // Email to company
    const companyContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">✅</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #16a34a; font-size: 24px; font-weight: 600; text-align: center;">Next Step Confirmed!</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        You have confirmed the next step for <strong>${studentName}</strong>.
      </p>
      
      <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Next Step</p>
        <p style="margin: 0; color: #16a34a; font-size: 24px; font-weight: 700;">${nextStepLabel}</p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Student:</strong> ${studentName}</p>
        <p style="margin: 8px 0;"><strong>Confirmed on:</strong> ${timestamp}</p>
      </div>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        You can now use the Active Recruiting section to chat with the student and share documents.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${COMPANY_DASHBOARD}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);">
          Open Active Recruiting
        </a>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #16a34a;">The Career Pilot Team</strong>
      </p>
    `;

    // Email to admin
    const adminContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">📩</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 24px; font-weight: 600; text-align: center;">New Recruiting Process Started</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        A company has confirmed the next step for a student.
      </p>
      
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Next Step</p>
        <p style="margin: 0; color: #1e3a8a; font-size: 24px; font-weight: 700;">${nextStepLabel}</p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Company:</strong> ${companyName}</p>
        <p style="margin: 8px 0;"><strong>Student:</strong> ${studentName}</p>
        <p style="margin: 8px 0;"><strong>Date:</strong> ${timestamp}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${TALENT_POOL_ADMIN}" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600;">
          Open Active Recruiting
        </a>
      </div>
    `;

    // Send all emails
    const [studentResult, companyResult, adminResult] = await Promise.allSettled([
      resend.emails.send({
        from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
        to: [studentEmail],
        subject: `Active Recruiting Started - ${nextStepLabel} with ${companyName}`,
        html: getEmailTemplate(studentContent),
      }),
      resend.emails.send({
        from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
        to: [companyEmail],
        subject: `Next Step Confirmed: ${nextStepLabel} with ${studentName}`,
        html: getEmailTemplate(companyContent, "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"),
      }),
      resend.emails.send({
        from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
        to: ["careerpilot2025@gmail.com"],
        subject: `Active Recruiting: ${companyName} → ${studentName} (${nextStepLabel})`,
        html: getEmailTemplate(adminContent),
      }),
    ]);

    console.log("Next step emails sent:", { studentResult, companyResult, adminResult });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-recruiting-next-step function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
