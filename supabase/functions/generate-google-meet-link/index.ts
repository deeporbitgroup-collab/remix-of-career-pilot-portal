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

interface MeetingLinkRequest {
  projectId: string;
  meetingLink: string;
  meetingDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, meetingLink, meetingDate }: MeetingLinkRequest = await req.json();

    if (!projectId || !meetingLink) {
      throw new Error('projectId and meetingLink are required');
    }

    console.log('Processing meeting link for projectId:', projectId);

    // Fetch project with all related data
    const { data: project, error: projectError } = await supabase
      .from('client_projects')
      .select(`
        *,
        service:client_services(id, name, category),
        client:client_users(id, first_name, last_name, email),
        order:client_orders(id)
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

    // Fetch scheduled meeting slot
    const { data: slots } = await supabase
      .from('client_meeting_slots')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'selected')
      .single();

    const scheduledTime = meetingDate || slots?.proposed_time || 'To be confirmed';

    const clientName = project.client ? `${project.client.first_name} ${project.client.last_name}` : 'Client';
    const clientEmail = project.client?.email || '';
    const clientFirstName = project.client?.first_name || 'Client';
    const associateName = associate ? `${associate.first_name} ${associate.last_name}` : 'Associate';
    const associateEmail = associate?.email || '';
    const associateFirstName = associate?.first_name || 'Associate';
    const serviceName = project.service?.name || 'Service';
    const orderRef = project.order ? `CP-${project.order.id.slice(0, 8).toUpperCase()}` : '';

    // 1. Email to Client - Meeting link available
    const clientContent = `
      <h2 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 24px;">Hi ${clientFirstName},</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        Your meeting link is now available!
      </p>
      
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e40af;">MEETING LINK</p>
        <a href="${meetingLink}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Join Meeting
        </a>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e3a5f;">Appointment Details</h3>
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.8;">
          <strong>Date and time:</strong> ${scheduledTime}<br>
          <strong>Service:</strong> ${serviceName}<br>
          <strong>Associate:</strong> ${associateName}<br>
          ${orderRef ? `<strong>Reference:</strong> ${orderRef}` : ''}
        </p>
      </div>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Tips:</strong><br>
          • Make sure you have a stable internet connection<br>
          • Join a few minutes before the scheduled time<br>
          • Prepare any questions or documents to share
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://careerpilot.it/client-portal/dashboard" style="display: inline-block; background: transparent; color: #1e3a5f; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; border: 2px solid #1e3a5f;">
          Go to Dashboard
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
        See you soon!<br>
        <strong>The Career Pilot Team</strong>
      </p>
    `;

    // 2. Email to Associate - Meeting link available
    const associateContent = `
      <h2 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 24px;">Hi ${associateFirstName},</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        The meeting link with ${clientName} has been added!
      </p>
      
      <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e40af;">MEETING LINK</p>
        <a href="${meetingLink}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Join Meeting
        </a>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e3a5f;">Appointment Details</h3>
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.8;">
          <strong>Date and time:</strong> ${scheduledTime}<br>
          <strong>Client:</strong> ${clientName}<br>
          <strong>Service:</strong> ${serviceName}
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://careerpilot.it/associate/dashboard" style="display: inline-block; background: transparent; color: #1e3a5f; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; border: 2px solid #1e3a5f;">
          Go to Dashboard
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
        Good luck!<br>
        <strong>The Career Pilot Team</strong>
      </p>
    `;

    // 3. Email to Admin - Confirmation of link insertion
    const adminContent = `
      <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 24px;">Meeting Link Added</h2>
      
      <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 14px; color: #166534;">
          <strong>✅ Link added successfully</strong>
        </p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e3a5f;">Details</h3>
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.8;">
          <strong>Client:</strong> ${clientName} (${clientEmail})<br>
          <strong>Associate:</strong> ${associateName} (${associateEmail})<br>
          <strong>Date and time:</strong> ${scheduledTime}<br>
          <strong>Service:</strong> ${serviceName}<br>
          <strong>Link:</strong> <a href="${meetingLink}" style="color: #1e3a5f;">${meetingLink}</a>
        </p>
      </div>
      
      <p style="color: #64748b; font-size: 14px;">
        Notifications have been sent to both participants.
      </p>
    `;

    // Send all emails individually so one failure doesn't hide the others
    const results: Record<string, any> = {};

    const sendOne = async (label: string, payload: any) => {
      try {
        const res: any = await resend.emails.send(payload);
        if (res?.error) {
          console.error(`[${label}] Resend error:`, JSON.stringify(res.error));
          results[label] = { ok: false, error: res.error };
        } else {
          console.log(`[${label}] Sent OK id=${res?.data?.id}`);
          results[label] = { ok: true, id: res?.data?.id };
        }
      } catch (e: any) {
        console.error(`[${label}] Exception:`, e?.message || e);
        results[label] = { ok: false, error: e?.message || String(e) };
      }
    };

    if (clientEmail) {
      await sendOne('client', {
        from: "Career Pilot <noreply@careerpilot.it>",
        to: [clientEmail],
        subject: `Meeting Link available - ${scheduledTime}`,
        html: getEmailTemplate(clientContent),
      });
    } else {
      console.warn('No client email available for project', projectId);
      results['client'] = { ok: false, error: 'no_client_email' };
    }

    if (associateEmail) {
      await sendOne('associate', {
        from: "Career Pilot <noreply@careerpilot.it>",
        to: [associateEmail],
        subject: `Meeting Link with ${clientName}`,
        html: getEmailTemplate(associateContent),
      });
    }

    await sendOne('admin', {
      from: "Career Pilot <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `Meeting Link added: ${clientName} - ${associateName}`,
      html: getEmailTemplate(adminContent),
    });

    console.log('Meeting link email results:', JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, results }), {
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
