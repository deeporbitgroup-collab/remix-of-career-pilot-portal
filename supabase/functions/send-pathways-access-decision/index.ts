import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AccessDecisionRequest {
  studentEmail: string;
  studentName: string;
  decision: 'approved' | 'rejected';
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-pathways-access-decision function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentEmail, studentName, decision }: AccessDecisionRequest = await req.json();

    console.log("Processing access decision notification:", { studentEmail, studentName, decision });

    const isApproved = decision === 'approved';
    const loginUrl = 'https://careerpilot.it/platforms/pathways/account';

    // Email to admin
    const adminEmailResponse = await resend.emails.send({
      from: "Career Pilot Pathways <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `Pathways Access ${isApproved ? 'Approved' : 'Rejected'} – ${studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Access Decision Notification</h2>
          <p>You have <strong>${isApproved ? 'approved' : 'rejected'}</strong> access for:</p>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Student:</strong> ${studentName}</li>
            <li><strong>Email:</strong> ${studentEmail}</li>
            <li><strong>Decision:</strong> ${isApproved ? 'Approved' : 'Rejected'}</li>
          </ul>
          <br>
          <p style="color: #666;">This is an automated notification from Career Pilot Pathways.</p>
        </div>
      `,
    });

    console.log("Admin email sent successfully:", adminEmailResponse);

    // Email to student
    const studentSubject = isApproved 
      ? 'Welcome to Career Pilot Pathways – Access Approved! 🎉'
      : 'Career Pilot Pathways – Application Update';
    
    const studentHtmlContent = isApproved 
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Congratulations, ${studentName}! 🎉</h1>
          <p>We're excited to inform you that your access to <strong>Career Pilot Pathways</strong> has been <strong>approved</strong>!</p>
          <p>You can now log in to the platform and proceed with your payment to unlock all features and opportunities.</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${loginUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Log In to Pathways
            </a>
          </div>
          <p>Once you complete the payment process, you'll gain full access to our exclusive catalog of opportunities.</p>
          <br>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <br>
          <p>Best regards,<br><strong>The Career Pilot Team</strong></p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">Application Update</h1>
          <p>Dear ${studentName},</p>
          <p>Thank you for your interest in <strong>Career Pilot Pathways</strong>.</p>
          <p>After careful review, we regret to inform you that we are unable to approve your access to the platform at this time.</p>
          <p>We appreciate your interest and encourage you to explore other opportunities that may align with your career goals.</p>
          <br>
          <p>If you believe this decision was made in error or would like more information, please don't hesitate to contact us.</p>
          <br>
          <p>Best regards,<br><strong>The Career Pilot Team</strong></p>
        </div>
      `;

    const studentEmailResponse = await resend.emails.send({
      from: "Career Pilot Pathways <noreply@careerpilot.it>",
      to: [studentEmail],
      subject: studentSubject,
      html: studentHtmlContent,
    });

    console.log("Student email sent successfully:", studentEmailResponse);

    return new Response(JSON.stringify({ success: true, adminEmailResponse, studentEmailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-pathways-access-decision function:", error);
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
