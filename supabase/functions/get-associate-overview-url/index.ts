import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractDocumentsObjectPath(overviewUrl: string): string {
  // If DB already stores a raw path like "{userId}/overview_123.pdf"
  if (!overviewUrl.startsWith("http")) return overviewUrl;

  try {
    const u = new URL(overviewUrl);
    const path = u.pathname;

    const publicPrefix = "/storage/v1/object/public/documents/";
    if (path.includes(publicPrefix)) {
      return path.split(publicPrefix).pop() || "";
    }

    const docsMarker = "/documents/";
    if (path.includes(docsMarker)) {
      return path.split(docsMarker).pop() || "";
    }
  } catch {
    // fall through
  }

  // Fallback: last two segments (userId/filename)
  const parts = overviewUrl.split("/").filter(Boolean);
  return parts.slice(-2).join("/");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { associateId, type } = await req.json();
    const documentType = type || "overview"; // "overview" or "cv"

    if (!associateId || typeof associateId !== "string") {
      return new Response(JSON.stringify({ error: "associateId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing server configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, overview_url, role, status")
      .eq("id", associateId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Associate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.role !== "ASSOCIATE" || profile.status !== "approved") {
      return new Response(JSON.stringify({ error: "Associate not available" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle CV download request
    if (documentType === "cv") {
      const { data: cvDoc, error: cvError } = await supabase
        .from("documents")
        .select("storage_path, filename")
        .eq("user_id", associateId)
        .eq("type", "CV")
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (cvError || !cvDoc?.storage_path) {
        return new Response(JSON.stringify({ error: "No CV found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: signed, error: signedError } = await supabase.storage
        .from("documents")
        .createSignedUrl(cvDoc.storage_path, 300);

      if (signedError || !signed?.signedUrl) {
        return new Response(JSON.stringify({ error: signedError?.message ?? "Failed to sign" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ url: signed.signedUrl, filename: cvDoc.filename }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle overview download request
    const overviewUrl = profile.overview_url as string | null;
    if (!overviewUrl) {
      return new Response(JSON.stringify({ error: "No overview" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // New public bucket: return as-is
    if (overviewUrl.includes("/associate-overviews/")) {
      return new Response(JSON.stringify({ url: overviewUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Legacy: private 'documents' bucket
    const objectPath = extractDocumentsObjectPath(overviewUrl);

    // Safety: only allow the overview file for this associate
    if (!objectPath.startsWith(`${associateId}/overview_`) || objectPath.includes("..")) {
      return new Response(JSON.stringify({ error: "Invalid overview path" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from("documents")
      .createSignedUrl(objectPath, 300);

    if (signedError || !signed?.signedUrl) {
      return new Response(JSON.stringify({ error: signedError?.message ?? "Failed to sign" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: signed.signedUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
