import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { associateEmail, associateName, clientName, serviceName } = await req.json();

    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [associateEmail],
      subject: `New request from ${clientName}`,
      html: `
        <h2>New Client Request</h2>
        <p>Hi ${associateName},</p>
        <p>You have received a new request from <strong>${clientName}</strong>.</p>
        <p><strong>Service:</strong> ${serviceName}</p>
        <p>Log in to your dashboard to view the details and propose your available time slots.</p>
        <br>
        <p>Career Pilot Team</p>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);