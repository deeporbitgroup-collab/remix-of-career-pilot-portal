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

interface PasswordResetRequest {
  email: string;
}

// Generate random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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
    const { email }: PasswordResetRequest = await req.json();
    
    console.log("Processing password reset request for:", email);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if client exists
    const { data: client, error: clientError } = await supabase
      .from('client_users')
      .select('id, email, first_name, last_name')
      .eq('email', email.toLowerCase())
      .single();

    // Always return success for security (don't reveal if email exists)
    if (clientError || !client) {
      console.log("Client not found, returning success anyway for security");
      return new Response(
        JSON.stringify({ success: true, message: "If the email exists, you will receive a password reset link." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate reset token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token in database
    const { error: insertError } = await supabase
      .from('client_password_resets')
      .insert({
        client_id: client.id,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (insertError) {
      console.error("Error inserting reset token:", insertError);
      throw insertError;
    }

    // Get origin from request headers
    const origin = req.headers.get('origin') || 'https://careerpilot.it';
    const resetUrl = `${origin}/client-portal/reset-password?token=${token}`;

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">🔐</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #1a365d; font-size: 24px; font-weight: 600; text-align: center;">Reset Your Password</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Hi ${client.first_name} ${client.last_name},
      </p>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        We received a request to reset the password for your Career Pilot account.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(26, 54, 93, 0.4);">
          Reset Password
        </a>
      </div>
      
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
        <p style="margin: 0; color: #92400e; font-size: 15px; font-weight: 500;">
          Link valid for 1 hour
        </p>
        <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
          This link will expire in 1 hour for security reasons. If you didn't request this reset, you can safely ignore this email.
        </p>
      </div>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 25px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="margin: 0; color: #3b82f6; font-size: 12px; word-break: break-all;">${resetUrl}</p>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #1a365d;">The Career Pilot Team</strong>
      </p>
    `;

    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [client.email],
      subject: "Reset Your Password - Career Pilot",
      html: getEmailTemplate(content),
    });

    console.log("Password reset email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "If the email exists, you will receive a password reset link." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending password reset:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
