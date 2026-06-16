// Shared helpers for the CRM edge functions (Google OAuth, sync, invite, chat).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── Config (env-overridable, mirrors client_tracker/config.py) ───────────────
export const CFG = {
  ALWAYS_INVITE: csv(Deno.env.get("CRM_ALWAYS_INVITE"), [
    "aandreaa@mit.edu",
    "fassio.leone@gmail.com",
  ]),
  INTERNAL_EMAILS: csv(Deno.env.get("CRM_INTERNAL_EMAILS"), [
    "aandreaa@mit.edu",
    "fassio.leone@gmail.com",
    "elisabettafabris.work@gmail.com",
  ]),
  TIMEZONE: Deno.env.get("CRM_TIMEZONE") ?? "Europe/Rome",
  SYNC_MAX_THREADS: parseInt(Deno.env.get("CRM_SYNC_MAX_THREADS") ?? "800", 10),
  GEMINI_MODEL: Deno.env.get("CRM_GEMINI_MODEL") ?? "gemini-2.5-flash",
  SCOPES: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/calendar.events",
    "openid",
    "email",
  ],
};

function csv(v: string | undefined, fallback: string[]): string[] {
  if (!v) return fallback;
  return v.split(",").map((x) => x.trim()).filter(Boolean);
}

// ── Supabase clients ─────────────────────────────────────────────────────────
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

// Verify the caller is an approved ADMIN. Returns the user id or throws.
export async function requireAdmin(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new HttpError(401, "Missing Authorization header");

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: { user }, error } = await anon.auth.getUser(token);
  if (error || !user) throw new HttpError(401, "Invalid session");

  const svc = serviceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "ADMIN" || profile.status !== "approved") {
    throw new HttpError(403, "Admin access required");
  }
  return user.id;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ── Signed OAuth state (HMAC-SHA256: ties the callback to the admin) ──────────
function stateSecret(): string {
  return Deno.env.get("CRM_STATE_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(stateSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64url(new Uint8Array(sig));
}

export async function signState(userId: string): Promise<string> {
  const payload = b64url(new TextEncoder().encode(
    JSON.stringify({ uid: userId, exp: Date.now() + 10 * 60 * 1000 }),
  ));
  return `${payload}.${await hmac(payload)}`;
}

export async function verifyState(state: string): Promise<string> {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) throw new HttpError(400, "Bad state");
  if (await hmac(payload) !== sig) throw new HttpError(400, "State signature mismatch");
  const { uid, exp } = JSON.parse(new TextDecoder().decode(unb64url(payload)));
  if (Date.now() > exp) throw new HttpError(400, "State expired");
  return uid;
}

// ── Google token exchange / refresh ──────────────────────────────────────────
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

export function redirectUri(): string {
  return Deno.env.get("CRM_OAUTH_REDIRECT") ??
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-google-auth-callback`;
}

export async function exchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const body = new URLSearchParams({
    code,
    client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
    client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new HttpError(400, `Token exchange failed: ${await res.text()}`);
  return await res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!,
    client_secret: Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (res.status === 400 || res.status === 401) {
    throw new HttpError(401, "TOKEN_EXPIRED"); // refresh token revoked → reconnect
  }
  if (!res.ok) throw new HttpError(502, `Token refresh failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

// ── base64url ────────────────────────────────────────────────────────────────
export function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function unb64url(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
