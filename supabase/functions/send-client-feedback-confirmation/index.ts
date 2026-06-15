import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackConfirmationRequest {
  clientId: string;
  rating: number;
}

const getEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); border-radius: 16px 16px 0 0;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Career Pilot</h1>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 14px;">Your Flight Plan to Success</p>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Have questions? Contact us:</p>
              <p style="margin: 0; color: #1a365d; font-size: 14px; font-weight: 600;">careerpilot2025@gmail.com</p>
              <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Career Pilot. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, rating }: FeedbackConfirmationRequest = await req.json();

    console.log("Processing feedback confirmation:", { clientId, rating });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from('client_users')
      .select('email, first_name, last_name')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Fetch the latest feedback comment
    const { data: feedback } = await supabase
      .from('client_feedback')
      .select('comment, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Generate star rating display
    const stars = '⭐'.repeat(rating);
    const clientFullName = `${client.first_name} ${client.last_name}`;

    // Email content for client
    const clientContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">💬</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #1a365d; font-size: 24px; font-weight: 600; text-align: center;">Thank You for Your Feedback!</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Hi ${client.first_name},
      </p>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Thank you for sharing your opinion about Career Pilot! Your feedback has been <strong style="color: #166534;">successfully received</strong>.
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Your rating:</p>
        <p style="margin: 0; font-size: 32px;">${stars}</p>
        <p style="margin: 10px 0 0 0; color: #1a365d; font-size: 18px; font-weight: 600;">${rating}/5</p>
      </div>
      
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
        <p style="margin: 0; color: #166534; font-size: 15px; font-weight: 500;">
          Your opinion matters
        </p>
        <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
          We greatly appreciate the time you took to share your experience. Your feedback helps us continuously improve our services.
        </p>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Thank you for being part of the Career Pilot community!<br>
        <strong style="color: #1a365d;">The Career Pilot Team</strong>
      </p>
    `;

    // Email content for admin
    const adminContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">📊</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #1a365d; font-size: 24px; font-weight: 600; text-align: center;">New Client Feedback Received</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        A client has submitted new feedback on Career Pilot.
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #e2e8f0;">
        <div style="margin-bottom: 15px;">
          <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Client</p>
          <p style="margin: 0; color: #1a365d; font-size: 16px; font-weight: 600;">${clientFullName}</p>
          <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px;">${client.email}</p>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-bottom: 15px;">
          <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Rating</p>
          <p style="margin: 0; font-size: 24px;">${stars} <span style="color: #1a365d; font-size: 16px; font-weight: 600;">${rating}/5</span></p>
        </div>
        
        ${feedback?.comment ? `
        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px;">
          <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px; text-transform: uppercase;">Comment</p>
          <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6; font-style: italic;">"${feedback.comment}"</p>
        </div>
        ` : ''}
      </div>
      
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 15px; font-weight: 500;">
          Action Required
        </p>
        <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
          Please review this feedback and consider reaching out to the client if needed.
        </p>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        <strong style="color: #1a365d;">Career Pilot Admin System</strong>
      </p>
    `;

    // Send email to client
    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [client.email],
      subject: "Thank You for Your Feedback - Career Pilot",
      html: getEmailTemplate(clientContent),
    });

    console.log("Feedback confirmation email sent to client");

    // Send email to admin
    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `New Feedback from ${clientFullName} - ${rating}/5 Stars`,
      html: getEmailTemplate(adminContent),
    });

    console.log("Feedback notification email sent to admin");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending feedback confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
