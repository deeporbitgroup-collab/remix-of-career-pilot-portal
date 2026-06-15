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
  studentId: string;
  senderRole: 'ADMIN' | 'STUDENT';
  subject: string;
  message: string;
  parentMessageId?: string;
  studentEmail: string;
  studentName: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { 
      studentId, 
      senderRole, 
      subject, 
      message, 
      parentMessageId,
      studentEmail: bodyStudentEmail,
      studentName: bodyStudentName
    }: MessageRequest = await req.json();

    // Fetch student data to ensure correct email/name
    const { data: studentRow, error: studentLookupError } = await supabase
      .from('talent_pool_users')
      .select('email, student_profiles(first_name, last_name)')
      .eq('id', studentId)
      .single();

    if (studentLookupError) {
      console.error('Student lookup error:', studentLookupError);
    }

    const studentEmail = bodyStudentEmail || studentRow?.email || '';
    const studentName = bodyStudentName || `${studentRow?.student_profiles?.[0]?.first_name || ''} ${studentRow?.student_profiles?.[0]?.last_name || ''}`.trim();

    console.log("Processing message:", { studentId, senderRole, subject });

    // Insert message into database
    const { data: messageData, error: insertError } = await supabase
      .from('admin_student_messages')
      .insert({
        student_id: studentId,
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
      // Admin sent message to student
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">CareerPilot</h1>
            <p style="color: #e0e7ff; margin-top: 10px;">Nuovo Messaggio dall'Admin</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1e3a8a; margin-top: 0;">${subject}</h2>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Inviato:</strong> ${timestamp}
            </p>
            
            <p style="color: #4b5563; line-height: 1.6; margin-top: 20px;">
              Puoi rispondere a questo messaggio dalla tua dashboard.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                CareerPilot - Costruiamo Carriere Insieme
              </p>
            </div>
          </div>
        </div>
      `;

      const { error: emailError } = await resend.emails.send({
        from: "CareerPilot <noreply@careerpilot.it>",
        to: [studentEmail],
        subject: "Nuovo messaggio da CareerPilot Admin",
        html: emailHtml,
      });

      if (emailError) {
        console.error("Email error:", emailError);
      }
    } else {
      // Student replied to admin
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">CareerPilot</h1>
            <p style="color: #e0e7ff; margin-top: 10px;">Risposta Studente</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1e3a8a; margin-top: 0;">Risposta da ${studentName}</h2>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Oggetto:</strong> ${subject}</p>
              <p style="margin: 4px 0;"><strong>Studente:</strong> ${studentName}</p>
              <p style="margin: 4px 0;"><strong>Email:</strong> ${studentEmail}</p>
            </div>
            
            <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 20px 0;">
              <p style="color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              <strong>Inviato:</strong> ${timestamp}
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
        subject: `Risposta da ${studentName}: ${subject}`,
        html: emailHtml,
        reply_to: studentEmail
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
