// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { senderId, senderRole, recipientId, subject, message } = await req.json();

    if (!senderId || !senderRole || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Determine recipient
    let toRecipientId = recipientId as string | null;

    if (!toRecipientId) {
      if (String(senderRole).toUpperCase() === "STUDENT") {
        // Pick any admin user as recipient
        const { data: adminUser, error: adminErr } = await supabase
          .from("pathways_users")
          .select("id")
          .eq("role", "ADMIN")
          .limit(1)
          .maybeSingle();
        if (adminErr) {
          console.error("admin lookup error", adminErr);
        }
        if (!adminUser?.id) {
          return new Response(
            JSON.stringify({ error: "No admin user found" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        toRecipientId = adminUser.id;
      } else {
        return new Response(
          JSON.stringify({ error: "recipientId required for ADMIN senderRole" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const insertPayload = {
      sender_id: senderId,
      sender_role: String(senderRole).toUpperCase(),
      recipient_id: toRecipientId,
      subject: subject || (String(senderRole).toUpperCase() === "STUDENT" ? "Student Message" : "Admin Message"),
      message,
      is_read: false,
    };

    const { data, error } = await supabase
      .from("pathways_messages")
      .insert(insertPayload)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("insert error", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("unexpected error", e);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
