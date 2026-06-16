// Returns a Google OAuth consent URL for the calling admin to connect Gmail.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  CFG, corsHeaders, HttpError, json, redirectUri, requireAdmin, signState,
} from "../_shared/crm.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await requireAdmin(req);
    const state = await signState(userId);

    const params = new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
      redirect_uri: redirectUri(),
      response_type: "code",
      scope: CFG.SCOPES.join(" "),
      access_type: "offline",        // ask for a refresh token
      prompt: "consent",             // force refresh-token issuance on reconnect
      include_granted_scopes: "true",
      state,
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    return json({ url });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: (e as Error).message }, status);
  }
});
