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
      subject: `Nuova richiesta da ${clientName}`,
      html: `
        <h2>Nuova Richiesta Cliente</h2>
        <p>Ciao ${associateName},</p>
        <p>Hai ricevuto una nuova richiesta da <strong>${clientName}</strong>.</p>
        <p><strong>Servizio:</strong> ${serviceName}</p>
        <p>Accedi alla tua dashboard per visualizzare i dettagli e proporre le tue disponibilità orarie.</p>
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