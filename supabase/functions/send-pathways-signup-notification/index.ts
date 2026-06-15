import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SignupNotificationRequest {
  studentEmail: string;
  studentName: string;
  studentPhone: string;
  studentSchool: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-pathways-signup-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentEmail, studentName, studentPhone, studentSchool }: SignupNotificationRequest = await req.json();

    console.log("Processing signup notifications:", { studentEmail, studentName });

    // Email to admin (Career Pilot)
    const adminEmailResponse = await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `New Pathways Student Registration – ${studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Student Registration</h1>
          <p>A new student has registered on the Pathways platform:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${studentName}</p>
            <p><strong>Email:</strong> ${studentEmail}</p>
            <p><strong>Phone:</strong> ${studentPhone}</p>
            <p><strong>School:</strong> ${studentSchool}</p>
          </div>
          <p>Please review and approve the student's access in the admin dashboard.</p>
          <br>
          <p style="color: #6b7280; font-size: 12px;">Career Pilot – Pathways Platform</p>
        </div>
      `,
    });

    console.log("Admin email sent successfully:", adminEmailResponse);

    // Email to student (in English)
    const studentEmailResponse = await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [studentEmail],
      subject: "Welcome to Career Pilot Pathways!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Welcome to Career Pilot Pathways! 🎓</h1>
          <p>Dear ${studentName},</p>
          <p>Thank you for registering with Career Pilot Pathways! We're excited to have you join our community.</p>
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p><strong>What's next?</strong></p>
            <p>Our team is currently reviewing your registration. You will receive login access shortly and be able to explore all the amazing opportunities we have for you.</p>
          </div>
          <p>We will notify you via email as soon as your account is activated. This usually takes less than 24 hours.</p>
          <p>If you have any questions in the meantime, feel free to reach out to us.</p>
          <br>
          <p>Best regards,<br><strong>The Career Pilot Team</strong></p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Career Pilot – Empowering Your Future</p>
        </div>
      `,
    });

    console.log("Student email sent successfully:", studentEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        adminEmail: adminEmailResponse,
        studentEmail: studentEmailResponse 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-pathways-signup-notification function:", error);
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
