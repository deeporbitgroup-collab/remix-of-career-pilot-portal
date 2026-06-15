import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ActivationRequest {
  studentEmail: string;
  studentName: string;
  studentPhone?: string;
  studentSchool?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-pathways-activation function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentEmail, studentName, studentPhone, studentSchool }: ActivationRequest = await req.json();

    console.log("Processing student activation notification:", { studentEmail, studentName });

    const loginUrl = 'https://careerpilot.it/platforms/pathways/account';

    // Email to admin
    const adminEmailResponse = await resend.emails.send({
      from: "Career Pilot Pathways <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `Student Activated – ${studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Student Account Activated</h2>
          <p>Full access has been granted to the following student:</p>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Student:</strong> ${studentName}</li>
            <li><strong>Email:</strong> ${studentEmail}</li>
            ${studentPhone ? `<li><strong>Phone:</strong> ${studentPhone}</li>` : ''}
            ${studentSchool ? `<li><strong>School:</strong> ${studentSchool}</li>` : ''}
            <li><strong>Status:</strong> Active (Full Access)</li>
            <li><strong>Date:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</li>
          </ul>
          <br>
          <p>The student now has complete access to the Career Pilot Pathways platform and catalog.</p>
          <br>
          <p style="color: #666;">This is an automated notification from Career Pilot Pathways.</p>
        </div>
      `,
    });

    console.log("Admin email sent successfully:", adminEmailResponse);

    // Email to student
    const studentEmailResponse = await resend.emails.send({
      from: "Career Pilot Pathways <noreply@careerpilot.it>",
      to: [studentEmail],
      subject: 'Welcome to Career Pilot Pathways – Full Access Granted! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Congratulations, ${studentName}! 🎉</h1>
          <p>We're thrilled to inform you that your payment has been verified and your account is now <strong>fully activated</strong> on Career Pilot Pathways!</p>
          
          <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">✓ Full Access Granted</h2>
          </div>

          <h3>What You Can Do Now:</h3>
          <ul style="line-height: 1.8;">
            <li>Browse our <strong>exclusive catalog</strong> of opportunities</li>
            <li>Apply to internships, master's programs, and career opportunities</li>
            <li>Access personalized support from our team</li>
            <li>Connect with leading companies and universities</li>
            <li>Track your applications in real-time</li>
          </ul>

          <div style="margin: 30px 0; text-align: center;">
            <a href="${loginUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Access Your Dashboard
            </a>
          </div>

          <p>Our team is here to support you every step of the way. If you have any questions or need assistance, don't hesitate to reach out through the platform's messaging system.</p>
          
          <p><strong>Next Steps:</strong></p>
          <ol style="line-height: 1.8;">
            <li>Log in to your account</li>
            <li>Complete your profile (if not already done)</li>
            <li>Browse the catalog and start applying</li>
            <li>Stay tuned for new opportunities</li>
          </ol>

          <br>
          <p>We're excited to help you achieve your career goals!</p>
          <br>
          <p>Best regards,<br><strong>The Career Pilot Team</strong></p>
        </div>
      `,
    });

    console.log("Student email sent successfully:", studentEmailResponse);

    return new Response(JSON.stringify({ success: true, adminEmailResponse, studentEmailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-pathways-activation function:", error);
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
