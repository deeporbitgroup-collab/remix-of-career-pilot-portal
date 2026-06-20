import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  companyId?: string;
  studentId?: string;
  all?: boolean; // admin mode
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { companyId, studentId, all }: RequestBody = await req.json();

    if (!companyId && !studentId && !all) {
      return new Response(
        JSON.stringify({ error: "companyId, studentId or all is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let query = supabase.from("recruiting_tests").select("*");
    if (!all) {
      if (companyId) query = query.eq("company_id", companyId);
      if (studentId) query = query.eq("student_id", studentId);
    }

    const { data: tests, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    const companyIds = Array.from(new Set((tests || []).map((m: any) => m.company_id)));
    const studentIds = Array.from(new Set((tests || []).map((m: any) => m.student_id)));

    const { data: comps } = companyIds.length
      ? await supabase.from("company_profiles").select("user_id, company_name, logo_url").in("user_id", companyIds)
      : { data: [] as any[] };
    const { data: stus } = studentIds.length
      ? await supabase.from("student_profiles").select("user_id, first_name, last_name, photo_url").in("user_id", studentIds)
      : { data: [] as any[] };

    const compMap: Record<string, any> = Object.fromEntries((comps || []).map((c: any) => [c.user_id, c]));
    const stuMap: Record<string, any> = Object.fromEntries((stus || []).map((s: any) => [s.user_id, s]));

    const results = (tests || []).map((m: any) => ({
      ...m,
      company: compMap[m.company_id] || null,
      student: stuMap[m.student_id] || null,
    }));

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("get-recruiting-tests error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
