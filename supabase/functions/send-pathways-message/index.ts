import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MessageRequest {
  to: string;
  studentName: string;
  studentEmail?: string;
  message: string;
  type: 'student_to_admin' | 'admin_to_student';
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-pathways-message function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, studentName, studentEmail, message, type }: MessageRequest = await req.json();

    console.log("Processing message notification:", { to, studentName, type });

    let subject: string;
    let htmlContent: string;

    if (type === 'student_to_admin') {
      subject = `New message from ${studentName} – Career Pilot`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Student Message</h1>
          <p><strong>From:</strong> ${studentName} (${studentEmail})</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="white-space: pre-wrap; margin: 0;">${message}</p>
          </div>
          <p>Please log in to the admin dashboard to respond.</p>
          <br>
          <p style="color: #6b7280; font-size: 12px;">Career Pilot – Pathways Platform</p>
        </div>
      `;
    } else {
      subject = `New Message from Career Pilot`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Message from Career Pilot Support</h1>
          <p>Dear ${studentName},</p>
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="white-space: pre-wrap; margin: 0;">${message}</p>
          </div>
          <p>You can reply to this message by logging in to your dashboard.</p>
          <br>
          <p>Best regards,<br>The Career Pilot Team</p>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [to],
      subject,
      html: htmlContent,
    });

    console.log("Message email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-pathways-message function:", error);
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
