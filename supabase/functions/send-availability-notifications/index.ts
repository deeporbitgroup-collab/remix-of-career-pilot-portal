import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, associateId, clientId, serviceName, timeslots } = await req.json();
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get associate details
    const { data: associate } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', associateId)
      .single();

    // Get client details
    const { data: client } = await supabase
      .from('client_users')
      .select('email, first_name, last_name')
      .eq('id', clientId)
      .single();

    if (!associate || !client) {
      throw new Error("User details not found");
    }

    // Send email to associate (confirmation)
    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [associate.email],
      subject: "Disponibilità Inviata con Successo",
      html: `
        <h2>Disponibilità Confermata</h2>
        <p>Ciao ${associate.first_name},</p>
        <p>La tua disponibilità per <strong>${serviceName}</strong> è stata inviata con successo.</p>
        <p>Il cliente <strong>${client.first_name} ${client.last_name}</strong> riceverà una notifica e potrà selezionare uno degli slot orari proposti.</p>
        <p>Ti aggiorneremo non appena il cliente farà la sua scelta.</p>
        <br>
        <p>Career Pilot Team</p>
      `,
    });

    // Send email to client (availability ready)
    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [client.email],
      subject: "Nuova Disponibilità Ricevuta",
      html: `
        <h2>Disponibilità Ricevuta</h2>
        <p>Ciao ${client.first_name},</p>
        <p><strong>${associate.first_name} ${associate.last_name}</strong> ha fornito la sua disponibilità per il servizio <strong>${serviceName}</strong>.</p>
        <p>Accedi alla tua area personale per visualizzare gli slot disponibili e confermare la tua scelta.</p>
        <p>Dopo la conferma, potrai procedere con il pagamento.</p>
        <br>
        <p>Career Pilot Team</p>
      `,
    });

    // Send email to admin
    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: "Nuova Disponibilità Fornita",
      html: `
        <h2>Disponibilità Fornita</h2>
        <p><strong>Associate:</strong> ${associate.first_name} ${associate.last_name}</p>
        <p><strong>Cliente:</strong> ${client.first_name} ${client.last_name}</p>
        <p><strong>Servizio:</strong> ${serviceName}</p>
        <p><strong>Slot proposti:</strong> ${timeslots.length}</p>
        <p>Il cliente deve ora confermare uno slot e procedere con il pagamento.</p>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
