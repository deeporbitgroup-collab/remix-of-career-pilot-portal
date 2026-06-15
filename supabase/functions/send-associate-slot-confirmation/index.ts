import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Career Pilot</h1>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Your Career Partner</p>
    </div>
    <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      ${content}
    </div>
    <div style="text-align: center; padding: 30px 20px;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        © 2024 Career Pilot. All rights reserved.<br>
        <a href="https://careerpilot.it" style="color: #1e3a5f; text-decoration: none;">careerpilot.it</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

interface SlotConfirmationRequest {
  projectId: string;
  slotId: string;
  selectedTime: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, slotId, selectedTime }: SlotConfirmationRequest = await req.json();

    if (!projectId || !slotId) {
      throw new Error('projectId and slotId are required');
    }

    console.log('Processing slot confirmation for projectId:', projectId);

    // Fetch project with all related data
    const { data: project, error: projectError } = await supabase
      .from('client_projects')
      .select(`
        *,
        service:client_services(id, name, category),
        client:client_users(id, first_name, last_name, email, phone),
        order:client_orders(id, created_at)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Failed to fetch project:', projectError);
      throw new Error('Project not found');
    }

    // Fetch associate info
    let associate = null;
    if (project.associate_id) {
      const { data: assocData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('id', project.associate_id)
        .single();
      associate = assocData;
    }

    if (!associate) {
      throw new Error('Associate not found');
    }

    const clientName = project.client ? `${project.client.first_name} ${project.client.last_name}` : 'Client';
    const clientEmail = project.client?.email || '';
    const associateName = `${associate.first_name} ${associate.last_name}`;
    const associateEmail = associate.email;
    const serviceName = project.service?.name || 'Service';
    const serviceCategory = project.service?.category || '';
    const orderRef = project.order ? `CP-${project.order.id.slice(0, 8).toUpperCase()}` : '';

    // Format the selected time nicely
    const formattedTime = selectedTime;

    // 1. Email to Client - Appointment confirmed
    const clientContent = `
      <h2 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 24px;">Hi ${project.client?.first_name},</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        Great news! Your appointment has been confirmed.
      </p>
      
      <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
        <p style="margin: 0 0 5px 0; font-size: 14px; color: #166534;">✅ APPOINTMENT CONFIRMED</p>
        <p style="margin: 0; font-size: 22px; font-weight: 700; color: #15803d;">${formattedTime}</p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e3a5f;">Appointment Details</h3>
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.8;">
          <strong>Service:</strong> ${serviceName}<br>
          <strong>Category:</strong> ${serviceCategory}<br>
          <strong>Associate:</strong> ${associateName}<br>
          ${orderRef ? `<strong>Reference:</strong> ${orderRef}` : ''}
        </p>
      </div>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Next steps:</strong><br>
          You will receive the meeting link via email as soon as it's available.
          Make sure you are available at the confirmed time.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://careerpilot.it/client-portal/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600;">
          Go to Dashboard
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
        Thank you for choosing Career Pilot!<br>
        <strong>The Career Pilot Team</strong>
      </p>
    `;

    // 2. Email to Associate - Confirmation of their selection
    const associateContent = `
      <h2 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 24px;">Hi ${associate.first_name},</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        The appointment has been successfully confirmed!
      </p>
      
      <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
        <p style="margin: 0 0 5px 0; font-size: 14px; color: #166534;">✅ TIME CONFIRMED</p>
        <p style="margin: 0; font-size: 22px; font-weight: 700; color: #15803d;">${formattedTime}</p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e3a5f;">Client Details</h3>
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.8;">
          <strong>Name:</strong> ${clientName}<br>
          <strong>Service:</strong> ${serviceName}<br>
          <strong>Category:</strong> ${serviceCategory}
        </p>
      </div>
      
      <div style="background-color: #e0f2fe; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 14px; color: #0369a1;">
          <strong>Note:</strong> The admin will add the Google Meet link.
          You will receive a notification when it's available.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://careerpilot.it/associate/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600;">
          Go to Dashboard
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
        Thank you for your collaboration!<br>
        <strong>The Career Pilot Team</strong>
      </p>
    `;

    // 3. Email to Admin - Appointment scheduled notification
    const adminContent = `
      <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 24px;">Appointment Confirmed</h2>
      
      <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 14px; color: #166534;">
          <strong>Selected time:</strong> ${formattedTime}<br>
          ${orderRef ? `<strong>Reference:</strong> ${orderRef}` : ''}
        </p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e3a5f;">Details</h3>
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.8;">
          <strong>Client:</strong> ${clientName} (${clientEmail})<br>
          <strong>Associate:</strong> ${associateName} (${associateEmail})<br>
          <strong>Service:</strong> ${serviceName}<br>
          <strong>Category:</strong> ${serviceCategory}
        </p>
      </div>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Action required:</strong> Add the Google Meet link for this appointment.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://careerpilot.it/admin/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600;">
          Manage Appointment
        </a>
      </div>
    `;

    // Send all emails
    await Promise.all([
      resend.emails.send({
        from: "Career Pilot <noreply@careerpilot.it>",
        to: [clientEmail],
        subject: `Appointment confirmed - ${formattedTime}`,
        html: getEmailTemplate(clientContent),
      }),
      resend.emails.send({
        from: "Career Pilot <noreply@careerpilot.it>",
        to: [associateEmail],
        subject: `Appointment confirmed with ${clientName}`,
        html: getEmailTemplate(associateContent),
      }),
      resend.emails.send({
        from: "Career Pilot <noreply@careerpilot.it>",
        to: ["careerpilot2025@gmail.com"],
        subject: `Appointment confirmed: ${clientName} - ${associateName}`,
        html: getEmailTemplate(adminContent),
      }),
    ]);

    console.log('All slot confirmation emails sent successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
