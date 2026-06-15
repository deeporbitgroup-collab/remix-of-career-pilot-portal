import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function sha256HexBase64(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // base64 encode the ASCII hex string
  const base64 = btoa(hex);
  return base64;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("pathways-complete-reset called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) {
      return new Response(JSON.stringify({ success: false, error: 'missing_params' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token
    const { data: resetData, error: resetErr } = await supabase
      .from('pathways_password_resets')
      .select('id, user_id, expires_at, used')
      .eq('token', token)
      .maybeSingle();

    if (resetErr || !resetData) {
      return new Response(JSON.stringify({ success: false, error: 'invalid_token' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (resetData.used || new Date(resetData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ success: false, error: resetData.used ? 'used' : 'expired' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Hash password like login logic (sha256 -> hex -> base64)
    const passwordHash = await sha256HexBase64(newPassword);

    // Update password
    const { error: updErr } = await supabase
      .from('pathways_users')
      .update({ password_hash: passwordHash })
      .eq('id', resetData.user_id);

    if (updErr) {
      console.error('Failed to update password:', updErr);
      return new Response(JSON.stringify({ success: false, error: 'update_failed' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Mark token as used
    await supabase
      .from('pathways_password_resets')
      .update({ used: true })
      .eq('id', resetData.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in pathways-complete-reset:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
