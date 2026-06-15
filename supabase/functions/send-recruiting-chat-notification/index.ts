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

interface ChatMessageRequest {
  processId: string;
  senderName: string;
  senderType: 'STUDENT' | 'COMPANY' | 'ADMIN';
  messagePreview: string;
  studentName: string;
  studentEmail: string;
  companyName: string;
  companyEmail: string;
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
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border-radius: 16px 16px 0 0;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Career Pilot</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Active Recruiting - New Message</p>
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
  console.log("send-recruiting-chat-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      senderName, 
      senderType, 
      messagePreview, 
      studentName, 
      studentEmail, 
      companyName, 
      companyEmail 
    }: ChatMessageRequest = await req.json();

    console.log("Processing chat notification:", { senderName, senderType });

    const senderLabel = senderType === 'ADMIN' ? 'Career Pilot' : senderName;

    const createEmailContent = (recipientName: string, dashboardUrl: string) => `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">💬</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 24px; font-weight: 600; text-align: center;">New Message in Active Recruiting</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Hi ${recipientName},
      </p>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        <strong>${senderLabel}</strong> posted a new message in your Active Recruiting chat.
      </p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Message Preview</p>
        <p style="margin: 10px 0 0 0; color: #334155; font-size: 15px; line-height: 1.6; font-style: italic;">
          "${messagePreview.length > 150 ? messagePreview.substring(0, 150) + '...' : messagePreview}"
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(30, 58, 138, 0.4);">
          Open Chat
        </a>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #1e3a8a;">The Career Pilot Team</strong>
      </p>
    `;

    const emailPromises = [];

    // Send to student (if sender is not student)
    if (senderType !== 'STUDENT') {
      emailPromises.push(
        resend.emails.send({
          from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
          to: [studentEmail],
          subject: `New message from ${senderLabel} in Active Recruiting`,
          html: getEmailTemplate(createEmailContent(studentName, STUDENT_DASHBOARD)),
        })
      );
    }

    // Send to company (if sender is not company)
    if (senderType !== 'COMPANY') {
      emailPromises.push(
        resend.emails.send({
          from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
          to: [companyEmail],
          subject: `New message from ${senderLabel} in Active Recruiting`,
          html: getEmailTemplate(createEmailContent(companyName, COMPANY_DASHBOARD)),
        })
      );
    }

    // Send to admin (if sender is not admin)
    if (senderType !== 'ADMIN') {
      emailPromises.push(
        resend.emails.send({
          from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
          to: ["careerpilot2025@gmail.com"],
          subject: `Active Recruiting: New message from ${senderLabel} (${studentName} ↔ ${companyName})`,
          html: getEmailTemplate(createEmailContent('Career Pilot Team', TALENT_POOL_ADMIN)),
        })
      );
    }

    const results = await Promise.allSettled(emailPromises);
    console.log("Chat notification emails sent:", results);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-recruiting-chat-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
