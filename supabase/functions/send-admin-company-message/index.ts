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

interface MessageRequest {
  companyId: string;
  senderRole: 'ADMIN' | 'COMPANY';
  subject: string;
  message: string;
  parentMessageId?: string;
  companyEmail: string;
  companyName: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { 
      companyId, 
      senderRole, 
      subject, 
      message, 
      parentMessageId,
      companyEmail: bodyCompanyEmail,
      companyName: bodyCompanyName
    }: MessageRequest = await req.json();

    // Fetch company data to ensure correct email/name
    const { data: companyRow, error: companyLookupError } = await supabase
      .from('talent_pool_users')
      .select('email, company_profiles(company_name, reference_email)')
      .eq('id', companyId)
      .single();

    if (companyLookupError) {
      console.error('Company lookup error:', companyLookupError);
    }

    // company_profiles is returned as an array by Supabase when using select with relationship
    const companyProfile = Array.isArray(companyRow?.company_profiles) 
      ? companyRow.company_profiles[0] 
      : companyRow?.company_profiles;

    const resolvedCompanyName = bodyCompanyName || companyProfile?.company_name || 'Company';
    const resolvedRecipientEmail = bodyCompanyEmail || companyProfile?.reference_email || companyRow?.email || '';

    console.log("Processing message:", { 
      companyId, 
      senderRole, 
      subject, 
      resolvedCompanyName,
      resolvedRecipientEmail,
      bodyCompanyEmail,
      bodyCompanyName
    });

    // Insert message into database
    const { data: messageData, error: insertError } = await supabase
      .from('admin_company_messages')
      .insert({
        company_id: companyId,
        sender_role: senderRole,
        subject: subject,
        message: message,
        parent_message_id: parentMessageId || null
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    const timestamp = new Date().toLocaleString('en-GB', { 
      timeZone: 'Europe/Rome',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // Send email based on sender role
    if (senderRole === 'ADMIN') {
      // Admin sent message to company
      console.log("Sending email to company:", resolvedRecipientEmail);
      
      if (!resolvedRecipientEmail) {
        console.error("No email address found for company; skipping email send");
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">CareerPilot</h1>
            <p style="color: #e0e7ff; margin-top: 10px;">New message from CareerPilot Admin</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 10px 0 20px 0;">
              <p style="margin: 4px 0;"><strong>Subject:</strong> ${subject}</p>
              <p style="margin: 4px 0;"><strong>Message:</strong></p>
              <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap; margin-top: 8px;">${message}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">
              <strong>Sent:</strong> ${timestamp}
            </p>
            <p style="color: #4b5563; line-height: 1.6; margin-top: 20px;">
              Log in to your CareerPilot dashboard to reply.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                CareerPilot - Building Careers Together
              </p>
            </div>
          </div>
        </div>
      `;

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "CareerPilot <noreply@careerpilot.it>",
        to: [resolvedRecipientEmail],
        subject: "New message from CareerPilot Admin",
        html: emailHtml,
      });

      if (emailError) {
        console.error("Email error:", emailError);
      } else {
        console.log("Email sent successfully:", emailData);
      }
    } else {
      // Company replied to admin
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">CareerPilot</h1>
            <p style="color: #e0e7ff; margin-top: 10px;">Company Reply</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1e3a8a; margin-top: 0;">Reply from ${resolvedCompanyName}</h2>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Subject:</strong> ${subject}</p>
              <p style="margin: 4px 0;"><strong>Company:</strong> ${resolvedCompanyName}</p>
              <p style="margin: 4px 0;"><strong>Email:</strong> ${resolvedRecipientEmail}</p>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
              <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Sent:</strong> ${timestamp}
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                CareerPilot Admin
              </p>
            </div>
          </div>
        </div>
      `;

      const { error: emailError } = await resend.emails.send({
        from: "CareerPilot <noreply@careerpilot.it>",
        to: ["careerpilot2025@gmail.com"],
        subject: `Reply from ${resolvedCompanyName}: ${subject}`,
        html: emailHtml,
        reply_to: resolvedRecipientEmail
      });

      if (emailError) {
        console.error("Email error:", emailError);
      }
    }

    console.log("Message sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Message sent successfully",
        messageId: messageData.id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
