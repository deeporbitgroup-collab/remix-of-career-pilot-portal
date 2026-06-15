import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetRequest {
  action: string;
  email: string;
  role: string;
}

interface CompleteResetRequest {
  action: string;
  token: string;
  newPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (action === "request") {
      // Request password reset
      const { email, role } = body as ResetRequest;

      console.log("Requesting password reset for:", { email, role });

      // Try all roles if role not specified or if role doesn't match
      const roles = ['ASSOCIATE', 'PARTNER', 'ADMIN'];
      let token = null;

      for (const tryRole of roles) {
        try {
          console.log(`Trying role: ${tryRole}`);
          const { data, error } = await supabaseAdmin.rpc(
            'request_auth_password_reset',
            { _email: email, _role: tryRole }
          );

          console.log(`RPC response for ${tryRole}:`, { data, error });

          if (!error && data && data !== 'REQUEST_SENT') {
            token = data;
            console.log(`Token generated for ${tryRole}:`, token);
            break;
          }
        } catch (e) {
          console.log(`Error trying role ${tryRole}:`, e);
        }
      }

      console.log(`Final token:`, token);

      // Only send email if token was actually generated
      if (token && token !== 'REQUEST_SENT') {
        const resetUrl = `https://careerpilot.it/reset-password?token=${token}`;

        const emailResponse = await resend.emails.send({
          from: "Career Pilot <noreply@careerpilot.it>",
          to: [email],
          subject: "Reset Your Password - Career Pilot",
          html: `
            <h2>Reset Your Password</h2>
            <p>You have requested to reset your password for your Career Pilot account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="${resetUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <br>
            <p>Career Pilot Team</p>
          `,
        });

        console.log("Email sent successfully:", emailResponse);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (action === "validate") {
      const { token } = body as { token: string };
      const { data: resetData, error: resetError } = await supabaseAdmin
        .from('auth_password_resets')
        .select('user_id, used, expires_at')
        .eq('token', token)
        .maybeSingle();

      const valid = !resetError && resetData && !resetData.used && new Date(resetData.expires_at) >= new Date();
      return new Response(JSON.stringify({ valid: !!valid }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (action === "complete") {
      // Complete password reset
      const { token, newPassword } = body as CompleteResetRequest;

      console.log("Completing password reset with token");

      // Validate token and get user_id
      const { data: resetData, error: resetError } = await supabaseAdmin
        .from('auth_password_resets')
        .select('user_id, used, expires_at')
        .eq('token', token)
        .single();

      if (resetError || !resetData || resetData.used || new Date(resetData.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid or expired token" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Update password in auth.users using admin client
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        resetData.user_id,
        { password: newPassword }
      );

      if (updateError) throw updateError;

      // Mark token as used
      await supabaseAdmin
        .from('auth_password_resets')
        .update({ used: true })
        .eq('token', token);

      console.log("Password reset completed successfully");

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    throw new Error("Invalid action parameter");

  } catch (error: any) {
    console.error("Error in auth-reset-password:", error);
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
