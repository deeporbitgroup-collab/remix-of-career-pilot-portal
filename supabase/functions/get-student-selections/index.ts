import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  studentId: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { studentId }: RequestBody = await req.json();

    // Get base selections
    const { data: selectionsBase, error: selError } = await supabase
      .from('company_selected_students')
      .select('id, company_id, selected_at, stage, stage_updated_at')
      .eq('student_id', studentId)
      .order('selected_at', { ascending: false });

    if (selError) throw selError;

    const companyIds = Array.from(new Set((selectionsBase || []).map((s: any) => s.company_id)));

    let profilesMap: Record<string, any> = {};
    if (companyIds.length) {
      const { data: profilesData, error: profErr } = await supabase
        .from('company_profiles')
        .select('user_id, company_name, sector, size, logo_url, description')
        .in('user_id', companyIds);
      if (profErr) throw profErr;
      profilesMap = Object.fromEntries((profilesData || []).map((p: any) => [p.user_id, p]));
    }

    const result = (selectionsBase || []).map((s: any) => ({
      id: s.id,
      company_id: s.company_id,
      selected_at: s.selected_at,
      stage: s.stage || 'IN_PROGRESS',
      stage_updated_at: s.stage_updated_at,
      company_profile: profilesMap[s.company_id] || null,
    }));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error('get-student-selections error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});