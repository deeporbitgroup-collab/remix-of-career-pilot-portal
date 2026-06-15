import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageRequest {
  associateName: string;
  associateEmail: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { associateName, associateEmail, message }: MessageRequest = await req.json();

    console.log("Sending admin notification for associate message:", { associateName, associateEmail });

    const emailResponse = await resend.emails.send({
      from: "Career Pilot <onboarding@resend.dev>",
      to: ["careerpilot2025@gmail.com"],
      subject: `New Message from Associate: ${associateName}`,
      html: `
        <h2>New Message from Associate</h2>
        <p><strong>From:</strong> ${associateName} (${associateEmail})</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <br>
        <p>Please log in to the admin dashboard to respond.</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending admin notification:", error);
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
