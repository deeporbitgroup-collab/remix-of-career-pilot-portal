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
    const { clientEmail, clientName, message } = await req.json();

    // If clientEmail is provided, admin is replying to client
    if (clientEmail) {
      await resend.emails.send({
        from: "Career Pilot <noreply@careerpilot.it>",
        to: [clientEmail],
        subject: "You've received a new message from Career Pilot",
        html: `
          <h2>New Message from Career Pilot</h2>
          <p>Hi ${clientName},</p>
          <p>Career Pilot has sent you a new message on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}.</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <br>
          <p>Log in to your personal area to read and respond.</p>
          <br>
          <p>Best regards,<br>The Career Pilot Team</p>
        `,
      });
    } else {
      // Client is sending message to admin
      await resend.emails.send({
        from: "Career Pilot <noreply@careerpilot.it>",
        to: ["careerpilot2025@gmail.com"],
        subject: `New message from ${clientName}`,
        html: `
          <h2>New Client Message</h2>
          <p><strong>From:</strong> ${clientName}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
          <br>
          <p>Please log in to the admin dashboard to respond.</p>
        `,
      });
    }

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
