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

interface LeaveRequest {
  userId: string;
  name: string;
  email: string;
  role: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, name, email, role }: LeaveRequest = await req.json();

    console.log("Processing Talent Pool leave:", { userId, name, role });

    // Update user status to 'left'
    const { error: updateError } = await supabase
      .from('talent_pool_users')
      .update({ status: 'left' as any })
      .eq('id', userId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    const timestamp = new Date().toLocaleString('en-GB', { 
      timeZone: 'Europe/Rome',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #555; }
          .value { margin-left: 10px; color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⚠️ ${role === 'STUDENT' ? 'Studente' : 'Azienda'} ha lasciato la Talent Pool</h2>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">Nome:</span>
              <span class="value">${name}</span>
            </div>
            <div class="field">
              <span class="label">Email:</span>
              <span class="value">${email}</span>
            </div>
            <div class="field">
              <span class="label">Ruolo:</span>
              <span class="value">${role === 'STUDENT' ? 'Studente' : 'Azienda'}</span>
            </div>
            <div class="field">
              <span class="label">Data:</span>
              <span class="value">${timestamp}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const { error: adminEmailError } = await resend.emails.send({
      from: "Talent Pool <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `${role === 'STUDENT' ? 'Studente' : 'Azienda'} ha lasciato la Talent Pool: ${name}`,
      html: adminEmailHtml,
    });

    if (adminEmailError) {
      console.error("Admin email error:", adminEmailError);
    }

    // Email to user
    const userEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">CareerPilot Talent Pool</h1>
          <p style="color: #e0e7ff; margin-top: 10px;">Departure Confirmed</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1e3a8a; margin-top: 0;">You have left the Talent Pool</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">
            Dear ${name},
          </p>
          
          <p style="color: #4b5563; line-height: 1.6;">
            We confirm that you have successfully left the CareerPilot Talent Pool as of <strong>${timestamp}</strong>.
          </p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 8px 0; color: #4b5563;">
              Your profile has been removed from our active database and companies will no longer have access to your information.
            </p>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">
            If you change your mind or this was done by mistake, please contact us at careerpilot2025@gmail.com.
          </p>
          
          <p style="color: #4b5563; line-height: 1.6; margin-top: 20px;">
            Thank you for being part of CareerPilot Talent Pool.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              CareerPilot - Building Careers Together
            </p>
          </div>
        </div>
      </div>
    `;

    const { error: userEmailError } = await resend.emails.send({
      from: "CareerPilot <noreply@careerpilot.it>",
      to: [email],
      subject: "You have left CareerPilot Talent Pool",
      html: userEmailHtml,
    });

    if (userEmailError) {
      console.error("User email error:", userEmailError);
    }

    // Create admin notification
    const { error: notificationError } = await supabase
      .from('talent_pool_notifications')
      .insert({
        user_id: null, // Admin notification
        type: 'USER_LEFT',
        title: `${role} Left Talent Pool`,
        message: `${name} has left the Talent Pool`,
        data: {
          userId,
          name,
          role,
          email,
          timestamp
        }
      });

    if (notificationError) {
      console.error("Notification error:", notificationError);
    }

    console.log("Leave request processed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Successfully left Talent Pool",
        emailsSent: !adminEmailError && !userEmailError 
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
