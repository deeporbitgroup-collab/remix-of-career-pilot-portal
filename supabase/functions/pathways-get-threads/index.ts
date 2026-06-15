import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetThreadsRequest {
  adminId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminId }: GetThreadsRequest = await req.json();

    if (!adminId) {
      return new Response(
        JSON.stringify({ error: "adminId is required" }),
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

    // Validate admin
    const { data: admin, error: adminError } = await supabase
      .from('pathways_users')
      .select('id, role')
      .eq('id', adminId)
      .single();

    if (adminError || !admin || admin.role !== 'ADMIN') {
      return new Response(
        JSON.stringify({ error: "Admin not found or invalid" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Load ALL messages between students and ANY admin
    const { data: msgs, error: msgsError } = await supabase
      .from('pathways_messages')
      .select('*')
      .or(`sender_role.eq.STUDENT,sender_role.eq.ADMIN`)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (msgsError) {
      return new Response(
        JSON.stringify({ error: msgsError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const threadsMap = new Map<string, {
      student_id: string;
      last_message: string;
      last_message_at: string;
      unread_count: number;
    }>();

    for (const m of (msgs ?? [])) {
      // Get student ID regardless of who sent the message
      const studentId = m.sender_role === 'STUDENT' ? m.sender_id : m.recipient_id;
      if (!studentId) continue;

      if (!threadsMap.has(studentId)) {
        threadsMap.set(studentId, {
          student_id: studentId,
          last_message: m.message,
          last_message_at: m.created_at,
          unread_count: 0,
        });
      }

      // Count unread messages from student to ANY admin
      if (m.sender_role === 'STUDENT' && m.is_read === false) {
        const t = threadsMap.get(studentId)!;
        t.unread_count += 1;
      }
    }

    const studentIds = Array.from(threadsMap.keys());

    // Fetch student info
    let studentsById: Record<string, any> = {};
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('pathways_users')
        .select('id, first_name, last_name, email')
        .in('id', studentIds);

      for (const s of (students ?? [])) {
        studentsById[s.id] = s;
      }
    }

    const threads = Array.from(threadsMap.values())
      .map(t => ({
        student_id: t.student_id,
        student_name: studentsById[t.student_id] ? `${studentsById[t.student_id].first_name} ${studentsById[t.student_id].last_name}` : t.student_id,
        student_email: studentsById[t.student_id]?.email ?? '',
        last_message: t.last_message,
        last_message_at: t.last_message_at,
        unread_count: t.unread_count,
      }))
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    return new Response(
      JSON.stringify({ threads }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error('pathways-get-threads error', e);
    return new Response(
      JSON.stringify({ error: e.message ?? 'Unexpected error' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
