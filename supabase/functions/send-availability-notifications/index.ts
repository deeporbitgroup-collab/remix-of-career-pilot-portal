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
      subject: "Availability Sent Successfully",
      html: `
        <h2>Availability Confirmed</h2>
        <p>Hi ${associate.first_name},</p>
        <p>Your availability for <strong>${serviceName}</strong> has been sent successfully.</p>
        <p>The client <strong>${client.first_name} ${client.last_name}</strong> will receive a notification and will be able to select one of the proposed time slots.</p>
        <p>We will keep you updated as soon as the client makes their choice.</p>
        <br>
        <p>Career Pilot Team</p>
      `,
    });

    // Send email to client (availability ready)
    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [client.email],
      subject: "New Availability Received",
      html: `
        <h2>Availability Received</h2>
        <p>Hi ${client.first_name},</p>
        <p><strong>${associate.first_name} ${associate.last_name}</strong> has provided their availability for the service <strong>${serviceName}</strong>.</p>
        <p>Log in to your personal area to view the available slots and confirm your choice.</p>
        <p>Once confirmed, you will be able to proceed with the payment.</p>
        <br>
        <p>Career Pilot Team</p>
      `,
    });

    // Send email to admin
    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: "New Availability Provided",
      html: `
        <h2>Availability Provided</h2>
        <p><strong>Associate:</strong> ${associate.first_name} ${associate.last_name}</p>
        <p><strong>Client:</strong> ${client.first_name} ${client.last_name}</p>
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Proposed slots:</strong> ${timeslots.length}</p>
        <p>The client must now confirm a slot and proceed with the payment.</p>
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
