import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentNotificationRequest {
  recipients: Array<{ email: string; name: string; firstName?: string; lastName?: string }>;
  uploaderName: string;
  filename: string;
  action: 'uploaded' | 'deleted';
  projectName?: string;
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
    const { recipients, uploaderName, filename, action, projectName }: DocumentNotificationRequest = await req.json();

    console.log("Sending document notification:", { recipients: recipients.length, action, filename });

    const actionText = action === 'uploaded' ? 'uploaded' : 'deleted';
    const emoji = action === 'uploaded' ? '📄' : '🗑️';

    const emailPromises = recipients.map((recipient) => {
      const recipientName = recipient.firstName && recipient.lastName 
        ? `${recipient.firstName} ${recipient.lastName}` 
        : recipient.name;

      const content = `
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="display: inline-block; background-color: ${action === 'uploaded' ? '#dbeafe' : '#fef2f2'}; border-radius: 50%; padding: 20px;">
            <span style="font-size: 48px;">${emoji}</span>
          </div>
        </div>
        
        <h2 style="margin: 0 0 20px 0; color: #1a365d; font-size: 24px; font-weight: 600; text-align: center;">New Content Available</h2>
        
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
          Hi ${recipientName},
        </p>
        
        <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
          We wanted to let you know that <strong>${uploaderName}</strong> has ${actionText} a document in the shared space.
        </p>
        
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">File:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${filename}</td>
            </tr>
            ${projectName ? `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Project:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${projectName}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Action:</td>
              <td style="padding: 8px 0; color: ${action === 'uploaded' ? '#166534' : '#991b1b'}; font-size: 14px; font-weight: 600;">
                ${action === 'uploaded' ? 'Uploaded' : 'Deleted'}
              </td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://careerpilot.it/client-portal/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(26, 54, 93, 0.4);">
            View Documents
          </a>
        </div>
        
        <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
          See you soon!<br>
          <strong style="color: #1a365d;">The Career Pilot Team</strong>
        </p>
      `;

      return resend.emails.send({
        from: "Career Pilot <noreply@careerpilot.it>",
        to: [recipient.email],
        subject: `${emoji} New content available - Career Pilot`,
        html: getEmailTemplate(content),
      });
    });

    await Promise.all(emailPromises);

    console.log("Document notification emails sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending document notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
