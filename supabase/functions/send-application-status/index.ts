import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApplicationStatusRequest {
  studentEmail: string;
  organizationName: string;
  status: 'accepted' | 'rejected';
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-application-status function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentEmail, organizationName, status }: ApplicationStatusRequest = await req.json();

    console.log("Processing application status notification:", { studentEmail, organizationName, status });

    const isAccepted = status === 'accepted';
    const subject = `Application Update – ${isAccepted ? 'Accepted' : 'Rejected'}`;
    
    const htmlContent = isAccepted 
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Congratulations! 🎉</h1>
          <p>Your application to <strong>${organizationName}</strong> through Career Pilot has been <strong>accepted</strong>!</p>
          <p>We will contact you soon with next steps and detailed information about your opportunity.</p>
          <br>
          <p>Best regards,<br>The Career Pilot Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">Application Update</h1>
          <p>We regret to inform you that your application to <strong>${organizationName}</strong> through Career Pilot has not been accepted at this time.</p>
          <p>Please don't be discouraged! We encourage you to explore other opportunities in our catalog and apply to organizations that match your interests and goals.</p>
          <br>
          <p>Best regards,<br>The Career Pilot Team</p>
        </div>
      `;

    const emailResponse = await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [studentEmail],
      subject,
      html: htmlContent,
    });

    console.log("Application status email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-application-status function:", error);
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
