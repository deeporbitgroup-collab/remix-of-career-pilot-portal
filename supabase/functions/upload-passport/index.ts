import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "talent-pool-passports";

interface UploadRequest {
  studentId: string;
  contentType: string;
  fileBase64: string; // base64 without data URI prefix
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

// The passport bucket is PRIVATE, so an anonymous client cannot INSERT into it
// via RLS. This service-role function performs the upload (and records the path
// on the profile) so the student can submit their passport while the document
// stays private — only reachable through signed URLs (get-passport-url).
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { studentId, contentType, fileBase64 }: UploadRequest = await req.json();

    if (!studentId || !contentType || !fileBase64) {
      return new Response(
        JSON.stringify({ error: "studentId, contentType and fileBase64 are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fixed object name so a re-upload replaces the previous scan.
    const path = `${studentId}/passport`;
    const bytes = base64ToUint8Array(fileBase64);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType, cacheControl: "3600", upsert: true });
    if (uploadError) {
      console.error("Passport upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record the storage path on the student profile (COALESCE leaves other fields).
    const { error: rpcError } = await supabase.rpc("talent_pool_update_student_bureaucracy", {
      _user_id: studentId,
      _passport_url: path,
    });
    if (rpcError) {
      console.error("Passport path save error:", rpcError);
      return new Response(
        JSON.stringify({ error: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, path }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("upload-passport error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
