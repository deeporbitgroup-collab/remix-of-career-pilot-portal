import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectNotificationRequest {
  associateEmail: string;
  associateName: string;
  clientName: string;
  serviceName: string;
  projectId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const body: ProjectNotificationRequest = await req.json();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">New Client Project Assigned</h2>
        <p>Dear ${body.associateName},</p>
        <p>You have been assigned a new client project!</p>
        
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2d3748; margin-top: 0;">Project Details</h3>
          <p><strong>Client:</strong> ${body.clientName}</p>
          <p><strong>Service:</strong> ${body.serviceName}</p>
        </div>
        
        <p>Please log in to your dashboard to:</p>
        <ul>
          <li>View project details</li>
          <li>Set your availability for the consultation call</li>
          <li>Upload project documents when ready</li>
        </ul>
        
        <p style="margin-top: 30px; color: #718096;">Best regards,<br/>The Career Pilot Team</p>
      </div>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Career Pilot <noreply@careerpilot.it>',
        to: [body.associateEmail],
        subject: `New Project Assignment: ${body.clientName}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Failed to send email: ${errorText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
