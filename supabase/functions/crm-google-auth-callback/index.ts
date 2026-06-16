// Google redirects here after consent. Exchanges the code for a refresh token
// and stores it (service-role only) against the connecting admin.
//
// Public function (verify_jwt = false) — Google calls it directly. Security
// comes from the signed `state` param, which is tied to the admin who started.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders, exchangeCode, serviceClient, verifyState,
} from "../_shared/crm.ts";

// Where to send the browser back to once connected.
function appRedirect(ok: boolean, msg = ""): string {
  const base = Deno.env.get("CRM_APP_REDIRECT") ?? "http://localhost:8080/app/admin";
  const q = ok ? "crm=connected" : `crm=error&msg=${encodeURIComponent(msg)}`;
  return `${base}${base.includes("?") ? "&" : "?"}${q}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthErr = url.searchParams.get("error");

  try {
    if (oauthErr) throw new Error(`Google denied access: ${oauthErr}`);
    if (!code || !state) throw new Error("Missing code or state");

    const userId = await verifyState(state);
    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      throw new Error(
        "Google did not return a refresh token. Remove the app's access at " +
        "myaccount.google.com/permissions and reconnect.",
      );
    }

    // Identify the connected mailbox via the Gmail profile.
    const profileRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    if (!profileRes.ok) throw new Error("Could not read Gmail profile");
    const { emailAddress, historyId } = await profileRes.json();

    const svc = serviceClient();
    const { data: acct, error: acctErr } = await svc
      .from("crm_accounts")
      .upsert(
        { owner_id: userId, email: emailAddress.toLowerCase(), history_id: String(historyId), last_error: null },
        { onConflict: "email" },
      )
      .select("id")
      .single();
    if (acctErr || !acct) throw new Error(`Failed to save account: ${acctErr?.message}`);

    const { error: secErr } = await svc
      .from("crm_account_secrets")
      .upsert(
        { account_id: acct.id, refresh_token: tokens.refresh_token, updated_at: Math.floor(Date.now() / 1000) },
        { onConflict: "account_id" },
      );
    if (secErr) throw new Error(`Failed to save token: ${secErr.message}`);

    return Response.redirect(appRedirect(true), 302);
  } catch (e) {
    return Response.redirect(appRedirect(false, (e as Error).message), 302);
  }
});
