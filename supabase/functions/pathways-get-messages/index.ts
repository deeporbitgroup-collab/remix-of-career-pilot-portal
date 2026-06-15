import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetMessagesRequest {
  viewerId: string; // the user requesting the conversation (ADMIN or STUDENT)
  otherId: string;  // the other party in the conversation
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { viewerId, otherId }: GetMessagesRequest = await req.json();

    if (!viewerId || !otherId) {
      return new Response(
        JSON.stringify({ error: "viewerId and otherId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase service credentials" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate viewer exists
    const { data: viewer, error: viewerError } = await supabase
      .from('pathways_users')
      .select('id, role')
      .eq('id', viewerId)
      .single();

    if (viewerError || !viewer) {
      return new Response(
        JSON.stringify({ error: "Viewer not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Determine if viewer is ADMIN or STUDENT
    let messagesQuery;
    if (viewer.role === 'ADMIN') {
      // Admin viewing conversation with a student - get all messages between ANY admin and this student
      messagesQuery = supabase
        .from('pathways_messages')
        .select('*')
        .or(`and(sender_role.eq.STUDENT,sender_id.eq.${otherId}),and(sender_role.eq.ADMIN,recipient_id.eq.${otherId})`)
        .order('created_at', { ascending: true });
    } else {
      // Student viewing conversation - get all messages between this student and ANY admin
      messagesQuery = supabase
        .from('pathways_messages')
        .select('*')
        .or(`and(sender_id.eq.${viewerId},sender_role.eq.STUDENT),and(recipient_id.eq.${viewerId},sender_role.eq.ADMIN)`)
        .order('created_at', { ascending: true });
    }

    const { data: messages, error: msgError } = await messagesQuery;

    if (msgError) {
      return new Response(
        JSON.stringify({ error: msgError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ messages: messages ?? [] }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error('pathways-get-messages error', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Unexpected error' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
