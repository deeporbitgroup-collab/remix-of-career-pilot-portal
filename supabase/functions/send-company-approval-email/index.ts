import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  companyName: string;
  companyEmail: string;
  approved: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, companyEmail, approved }: ApprovalEmailRequest = await req.json();

    console.log("Sending company approval email:", { companyName, companyEmail, approved });

    if (!companyName || !companyEmail) {
      return new Response(
        JSON.stringify({ error: "Company name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailHtml = "";
    let subject = "";

    if (approved) {
      subject = "Registration Approved - Talent Pool";
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Registration Approved!</h1>
          </div>

          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Dear <strong>${companyName}</strong>,
            </p>

            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              We are pleased to inform you that your registration with the <strong>CareerPilot Talent Pool</strong> has been approved!
            </p>

            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              You can now log in to the platform and start browsing the profiles of available students.
            </p>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #16a34a; margin-top: 0;">🎯 Next Steps:</h3>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>Log in to the platform with your credentials</li>
                <li>Explore the student profiles</li>
                <li>Select the candidates you are interested in</li>
                <li>You will receive an email notification for each selection</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://careerpilot.it/talent-pool/company"
                 style="display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Access the Talent Pool
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              Welcome to CareerPilot!<br>
              If you have any questions or need assistance, please don't hesitate to contact us.
            </p>
          </div>
        </div>
      `;
    } else {
      subject = "Registration Not Approved - Talent Pool";
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">❌ Registration Not Approved</h1>
          </div>

          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Dear <strong>${companyName}</strong>,
            </p>

            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              We regret to inform you that your registration with the <strong>CareerPilot Talent Pool</strong> has not been approved at this time.
            </p>

            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              For more information or to discuss your application, we invite you to contact us directly.
            </p>

            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="color: #991b1b; margin: 0; line-height: 1.6;">
                <strong>📧 Contact:</strong> careerpilot2025@gmail.com
              </p>
            </div>

            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              Thank you for your interest in CareerPilot.
            </p>
          </div>
        </div>
      `;
    }

    const { error: emailError } = await resend.emails.send({
      from: "CareerPilot <noreply@careerpilot.it>",
      to: [companyEmail],
      subject: subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Email error:", emailError);
      throw emailError;
    }

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-company-approval-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
