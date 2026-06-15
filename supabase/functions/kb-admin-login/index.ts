import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.190.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new TextDecoder().decode(encode(new Uint8Array(hash)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limiting: check recent failed attempts (max 5 in 15 minutes)
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: failedCount } = await supabaseAdmin
      .from("kb_login_attempts")
      .select("*", { count: "exact", head: true })
      .eq("username", username)
      .eq("success", false)
      .gte("created_at", fifteenMinAgo);

    if ((failedCount || 0) >= 5) {
      return new Response(JSON.stringify({ error: "Too many login attempts. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: admin, error } = await supabaseAdmin
      .from("kb_admins")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (error || !admin) {
      // Log failed attempt
      await supabaseAdmin.from("kb_login_attempts").insert({ username, success: false });
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inputHash = await hashPassword(password);
    if (inputHash !== admin.password_hash) {
      // Log failed attempt
      await supabaseAdmin.from("kb_login_attempts").insert({ username, success: false });
      return new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log successful login
    await supabaseAdmin.from("kb_login_attempts").insert({ username, success: true });

    // Audit log
    await supabaseAdmin.from("kb_admin_audit_logs").insert({
      admin_username: username,
      action: "LOGIN",
      details: "Admin logged in successfully",
    });

    return new Response(
      JSON.stringify({ success: true, admin: { id: admin.id, username: admin.username } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
