import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "talent-pool-passports";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Mint a short-lived signed URL for a student's passport scan. The bucket is
// private, so this service-role function is the only way student / company /
// admin can view the document. Body: { studentId }.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { studentId } = await req.json();
    if (!studentId) return json(400, { error: "studentId is required" });

    const { data: profile, error: profErr } = await supabase
      .from("student_profiles")
      .select("passport_url")
      .eq("user_id", studentId)
      .maybeSingle();
    if (profErr) throw profErr;

    const path = profile?.passport_url;
    if (!path) return json(404, { error: "No passport uploaded" });

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 10); // 10 minutes
    if (error) throw error;

    return json(200, { url: data.signedUrl });
  } catch (error: any) {
    console.error("get-passport-url error:", error);
    return json(500, { error: error.message || "Unexpected error" });
  }
});
