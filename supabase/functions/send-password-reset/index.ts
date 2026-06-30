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

interface PasswordResetRequest {
  email: string;
  role: 'STUDENT' | 'COMPANY';
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { email, role }: PasswordResetRequest = await req.json();

    console.log("Processing password reset request:", { email, role });

    // Request password reset token. If the email exists under the other
    // Talent Pool role, still send a reset link to the email owner.
    const requestedRole = role;

    const { data: token, error: tokenError } = await supabase
      .rpc('talent_pool_request_password_reset', {
        _email: email,
        _role: requestedRole
      });

    if (tokenError) {
      console.error("Token generation error:", tokenError);
      throw tokenError;
    }

    const resolvedRole = requestedRole;

    // If token is 'REQUEST_SENT', user doesn't exist but we don't reveal this
    if (!token || token === 'REQUEST_SENT') {
      console.log("User not found, but returning success for security");
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email has been sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get origin from request headers
    const origin = req.headers.get('origin') || 'https://careerpilot.it';
    const resetUrl = `${origin}/talent-pool/reset-password?token=${token}&role=${resolvedRole.toLowerCase()}`;

    const roleLabel = resolvedRole === 'STUDENT' ? 'Student' : 'Company';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">CareerPilot Talent Pool</h1>
          <p style="color: #e0e7ff; margin-top: 10px;">Password Reset Request</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1e3a8a; margin-top: 0;">Reset Your Password</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">
            We received a request to reset your password for your ${roleLabel} account.
          </p>
          
          <p style="color: #4b5563; line-height: 1.6;">
            Click the button below to reset your password. This link will expire in 1 hour.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #3b82f6; font-size: 12px; word-break: break-all; margin: 10px 0 0 0;">
              ${resetUrl}
            </p>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">CareerPilot - Your Career Journey Starts Here</p>
        </div>
      </div>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "CareerPilot <noreply@careerpilot.it>",
      to: [email],
      subject: "Reset Your CareerPilot Password",
      html: emailHtml,
    });

    if (emailError) {
      console.error("Email sending error:", emailError);
      throw emailError;
    }

    console.log("Password reset email sent successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "If an account exists, a reset email has been sent"
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
