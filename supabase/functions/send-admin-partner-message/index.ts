import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  companyName: string;
  companyEmail: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, companyEmail, message }: NotificationRequest = await req.json();

    console.log("Sending notification to admin about partner message:", { companyName, companyEmail });

    const emailResponse = await resend.emails.send({
      from: "Career Pilot Partner <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      reply_to: companyEmail,
      subject: `New Message from Partner – ${companyName}`,
      html: `
        <h2>New Message from Partner</h2>
        <p>The partner <strong>${companyName}</strong> has sent a new message through the reserved area.</p>
        <p><strong>Message:</strong></p>
        <p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">${message}</p>
        <p><strong>Partner Email:</strong> ${companyEmail}</p>
        <p>Please check the admin dashboard to view and respond.</p>
        <br>
        <p>Career Pilot Platform</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
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
