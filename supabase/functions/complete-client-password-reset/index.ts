import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompleteResetRequest {
  token: string;
  newPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, newPassword }: CompleteResetRequest = await req.json();

    console.log("Processing password reset completion");

    if (!token || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Token e password sono obbligatori" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "La password deve essere almeno 6 caratteri" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate token
    const { data: resetData, error: resetError } = await supabase
      .from('client_password_resets')
      .select('client_id, expires_at, used')
      .eq('token', token)
      .single();

    if (resetError || !resetData) {
      console.log("Token not found");
      return new Response(
        JSON.stringify({ success: false, error: "Link non valido o scaduto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is used
    if (resetData.used) {
      console.log("Token already used");
      return new Response(
        JSON.stringify({ success: false, error: "Questo link è già stato utilizzato" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired
    if (new Date(resetData.expires_at) < new Date()) {
      console.log("Token expired");
      return new Response(
        JSON.stringify({ success: false, error: "Il link è scaduto. Richiedi un nuovo reset." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword);

    // Update client's password
    const { error: updateError } = await supabase
      .from('client_users')
      .update({ password_hash: passwordHash })
      .eq('id', resetData.client_id);

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw updateError;
    }

    // Mark token as used
    await supabase
      .from('client_password_resets')
      .update({ used: true })
      .eq('token', token);

    console.log("Password reset completed successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Password reimpostata con successo!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error completing password reset:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
