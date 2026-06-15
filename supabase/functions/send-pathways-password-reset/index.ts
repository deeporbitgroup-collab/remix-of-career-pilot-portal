import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-pathways-password-reset function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: PasswordResetRequest = await req.json();
    
    console.log("Processing password reset request for:", email);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find user by email (case-insensitive)
    const { data: user, error: userError } = await supabase
      .from('pathways_users')
      .select('id, first_name, last_name, email')
      .ilike('email', email)
      .eq('role', 'STUDENT')
      .maybeSingle();

    if (userError || !user) {
      console.log("User not found, but returning success for security");
      // Return success even if user not found (security best practice)
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate reset token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour

    // Delete any existing unused tokens for this user
    await supabase
      .from('pathways_password_resets')
      .delete()
      .eq('user_id', user.id)
      .eq('used', false);

    // Insert new reset token
    const { error: insertError } = await supabase
      .from('pathways_password_resets')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error inserting reset token:", insertError);
      throw new Error("Failed to create reset token");
    }

    // Create reset link using caller origin (fallback to production)
    const origin = req.headers.get('origin') || Deno.env.get('SUPABASE_URL') || 'https://careerpilot.it';
    const baseUrl = origin.includes('http') ? origin.replace(/\/$/, '') : `https://${origin}`;
    const resetLink = `${baseUrl}/platforms/pathways/reset-password?token=${token}`;
    const studentName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Student';

    // Send email to actual user email (not the input case)
    const emailResponse = await resend.emails.send({
      from: "Career Pilot Pathways <noreply@careerpilot.it>",
      to: [user.email], // Use email from database
      subject: 'Password Reset Request – Career Pilot Pathways',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Password Reset Request</h1>
          <p>Dear ${studentName},</p>
          <p>We received a request to reset your password for your Career Pilot Pathways account.</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>

          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666; font-size: 14px;">${resetLink}</p>

          <p><strong>This link will expire in 1 hour.</strong></p>

          <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

          <br>
          <p>Best regards,<br><strong>The Career Pilot Team</strong></p>
        </div>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-pathways-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
