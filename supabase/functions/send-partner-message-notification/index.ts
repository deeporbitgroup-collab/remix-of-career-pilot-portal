import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  companyEmail: string;
  companyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyEmail, companyName }: NotificationRequest = await req.json();

    console.log("Sending message notification to partner:", { companyEmail, companyName });

    const emailResponse = await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [companyEmail],
      subject: "New Message from Career Pilot",
      html: `
        <h2>New Message from Career Pilot</h2>
        <p>Dear ${companyName},</p>
        <p>You have received a new message from the Career Pilot team.</p>
        <p>Please log in to your company area to read and reply.</p>
        <br>
        <p>Career Pilot Team</p>
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
