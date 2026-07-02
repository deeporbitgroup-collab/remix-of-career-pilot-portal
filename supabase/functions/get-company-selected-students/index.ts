import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetSelectionsRequest {
  companyId: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { companyId }: GetSelectionsRequest = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: "companyId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch selections for the company
    const { data: selections, error: selError } = await supabase
      .from('company_selected_students')
      .select('id, company_id, student_id, selected_at, created_at, stage, stage_updated_at')
      .eq('company_id', companyId)
      .order('selected_at', { ascending: false });

    if (selError) {
      console.error('Selections fetch error:', selError);
      throw selError;
    }

    const results = await Promise.all((selections || []).map(async (s) => {
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', s.student_id)
        .single();

      // The student's phone number must NOT be exposed to companies.
      if (profile) delete (profile as Record<string, unknown>).phone;

      return { ...s, profile };
    }));

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error('get-company-selected-students error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});