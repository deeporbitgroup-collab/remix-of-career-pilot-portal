// Pull Gmail + Calendar for each connected account into the crm_* tables, then
// recompute rollups. Port of client_tracker/sync.py.
//
// Invoked two ways:
//   • Manually from the dashboard (admin JWT, optional { accountId, forceFull }).
//   • By pg_cron every few minutes (header x-crm-cron-secret = CRM_CRON_SECRET).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  CFG, corsHeaders, HttpError, json, refreshAccessToken, requireAdmin, serviceClient,
} from "../_shared/crm.ts";
import { companyFromDomain, MsgRow, threadToRows } from "../_shared/gmail.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const AUTO_SYNC_QUERY = "newer_than:14d";
const CONCURRENCY = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const cronSecret = req.headers.get("x-crm-cron-secret");
    const isCron = cronSecret && cronSecret === Deno.env.get("CRM_CRON_SECRET");
    if (!isCron) await requireAdmin(req);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const forceFull = !!body.forceFull;
    const onlyAccount = body.accountId as string | undefined;

    const svc = serviceClient();
    let q = svc.from("crm_accounts").select("id, email, history_id");
    if (onlyAccount) q = q.eq("id", onlyAccount);
    const { data: accounts, error } = await q;
    if (error) throw new HttpError(500, error.message);
    if (!accounts?.length) return json({ ok: true, synced: [], note: "No connected accounts" });

    const results = [];
    for (const acct of accounts) {
      try {
        const r = await syncAccount(svc, acct, forceFull);
        results.push({ email: acct.email, ...r });
      } catch (e) {
        const needsReconnect = e instanceof HttpError && e.message === "TOKEN_EXPIRED";
        await svc.from("crm_accounts").update({
          last_error: needsReconnect ? "TOKEN_EXPIRED" : (e as Error).message,
        }).eq("id", acct.id);
        results.push({ email: acct.email, error: (e as Error).message, needsReconnect });
      }
    }
    return json({ ok: true, synced: results });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: (e as Error).message }, status);
  }
});

async function syncAccount(
  svc: SupabaseClient,
  acct: { id: string; email: string; history_id: string | null },
  forceFull: boolean,
) {
  // 1. Access token from the stored refresh token.
  const { data: sec } = await svc
    .from("crm_account_secrets").select("refresh_token").eq("account_id", acct.id).single();
  if (!sec?.refresh_token) throw new HttpError(401, "TOKEN_EXPIRED");
  const accessToken = await refreshAccessToken(sec.refresh_token);

  const profile = await gApi(accessToken, "https://gmail.googleapis.com/gmail/v1/users/me/profile");
  const myAddr = (profile.emailAddress as string).toLowerCase();

  // 2. Incremental (History API) or full fetch.
  let rows: MsgRow[] = [];
  let newHistoryId: string | null = null;
  let incremental = !!acct.history_id && !forceFull;

  if (incremental) {
    const changed = await fetchChanges(accessToken, acct.history_id!);
    if (changed.expired) {
      incremental = false;
    } else {
      newHistoryId = changed.historyId;
      rows = await fetchThreadRows(accessToken, changed.threadIds, myAddr);
    }
  }
  if (!incremental) {
    const ids = await listThreadIds(accessToken, CFG.SYNC_MAX_THREADS, forceFull ? undefined : AUTO_SYNC_QUERY);
    rows = await fetchThreadRows(accessToken, ids, myAddr);
    newHistoryId = String(profile.historyId);
  }

  // 3. Apply merge aliases, then upsert messages + contacts.
  const { data: aliasRows } = await svc.from("crm_contact_aliases").select("alias_email, primary_email");
  const aliases = new Map((aliasRows ?? []).map((a) => [a.alias_email, a.primary_email]));
  const resolve = (e: string) => aliases.get(e) ?? e;

  const seenContacts = new Set<string>();
  if (rows.length) {
    const messages = rows.map((r) => ({
      id: r.id, thread_id: r.thread_id, contact_email: resolve(r.contact_email),
      from_email: r.from_email, to_emails: r.to_emails, subject: r.subject,
      snippet: r.snippet, body_text: r.body_text, direction: r.direction, ts: r.ts,
      attachments: r.attachments, is_bulk: r.is_bulk,
    }));
    await batchUpsert(svc, "crm_messages", messages, "id");

    // Upsert contacts WITHOUT clobbering user-owned fields (matches upsert_contact).
    const contacts = dedupeContacts(rows.map((r) => ({
      email: resolve(r.contact_email), name: r.contact_name,
      company: r.contact_company, domain: r.contact_domain,
    })));
    for (const c of contacts) seenContacts.add(c.email);
    await upsertContacts(svc, contacts);

    const links: Array<{ message_id: string; contact_email: string }> = [];
    for (const r of rows) {
      for (const [, extra] of r.extra_contacts) {
        links.push({ message_id: r.id, contact_email: resolve(extra) });
      }
    }
    if (links.length) {
      await svc.from("crm_message_contacts").upsert(links, { onConflict: "message_id,contact_email", ignoreDuplicates: true });
    }
  }

  // 4. Recompute derived state (ported SQL functions).
  await svc.rpc("crm_recompute_rollups");
  await svc.rpc("crm_resurface_archived");
  await svc.rpc("crm_auto_archive_bounces");

  // 5. Calendar calls → ensure contacts exist, then apply_calls.
  try {
    const calls = await fetchCalendarCalls(accessToken, [myAddr, ...CFG.INTERNAL_EMAILS]);
    const callContacts = Object.entries(calls).map(([email, slot]) => {
      const e = resolve(email);
      const domain = e.includes("@") ? e.split("@").pop()! : "";
      return { email: e, name: (slot.name ?? ""), company: companyFromDomain(domain), domain };
    });
    if (callContacts.length) await upsertContacts(svc, callContacts);
    const callMap: Record<string, { next: number | null; last: number | null }> = {};
    for (const [email, slot] of Object.entries(calls)) {
      callMap[resolve(email)] = { next: slot.next, last: slot.last };
    }
    await svc.rpc("crm_apply_calls", { _calls: callMap });
  } catch (e) {
    console.error("Calendar fetch failed (non-critical):", (e as Error).message);
  }

  // 6. Bookmark + status.
  await svc.from("crm_accounts").update({
    history_id: newHistoryId, last_sync_at: Math.floor(Date.now() / 1000), last_error: null,
  }).eq("id", acct.id);

  return { rows: rows.length, contacts: seenContacts.size, incremental };
}

// ── Gmail / Calendar REST helpers ────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function gApi(token: string, url: string): Promise<any> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new HttpError(401, "TOKEN_EXPIRED");
  if (!res.ok) throw new HttpError(502, `Google API ${res.status}: ${await res.text()}`);
  return await res.json();
}

async function listThreadIds(token: string, maxThreads: number, query?: string): Promise<string[]> {
  const ids: string[] = [];
  let page: string | undefined;
  while (ids.length < maxThreads) {
    const u = new URL("https://gmail.googleapis.com/gmail/v1/users/me/threads");
    u.searchParams.set("maxResults", String(Math.min(maxThreads, 500)));
    if (query) u.searchParams.set("q", query);
    if (page) u.searchParams.set("pageToken", page);
    const resp = await gApi(token, u.toString());
    for (const t of resp.threads ?? []) ids.push(t.id);
    page = resp.nextPageToken;
    if (!page) break;
  }
  return ids.slice(0, maxThreads);
}

async function fetchChanges(token: string, startHistoryId: string): Promise<
  { threadIds: string[]; historyId: string; expired: boolean }
> {
  const threadIds = new Set<string>();
  let historyId = startHistoryId;
  let page: string | undefined;
  while (true) {
    const u = new URL("https://gmail.googleapis.com/gmail/v1/users/me/history");
    u.searchParams.set("startHistoryId", startHistoryId);
    u.searchParams.set("historyTypes", "messageAdded");
    if (page) u.searchParams.set("pageToken", page);
    const res = await fetch(u.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) return { threadIds: [], historyId: startHistoryId, expired: true };
    if (res.status === 401) throw new HttpError(401, "TOKEN_EXPIRED");
    if (!res.ok) throw new HttpError(502, `history ${res.status}: ${await res.text()}`);
    const resp = await res.json();
    for (const h of resp.history ?? []) {
      for (const ma of h.messagesAdded ?? []) {
        const tid = ma.message?.threadId;
        if (tid) threadIds.add(tid);
      }
    }
    historyId = resp.historyId ?? historyId;
    page = resp.nextPageToken;
    if (!page) break;
  }
  return { threadIds: [...threadIds], historyId, expired: false };
}

// Fetch full thread payloads with a bounded concurrency pool, flatten to rows.
async function fetchThreadRows(token: string, ids: string[], myAddr: string): Promise<MsgRow[]> {
  const rows: MsgRow[] = [];
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const chunk = ids.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map((id) =>
      gApi(token, `https://gmail.googleapis.com/gmail/v1/users/me/threads/${id}?format=full`)
    ));
    settled.forEach((s, j) => {
      if (s.status === "fulfilled") rows.push(...threadToRows(s.value, chunk[j], myAddr, CFG.INTERNAL_EMAILS));
    });
  }
  return rows;
}

function eventStartTs(event: Record<string, unknown>): number | null {
  const start = (event.start ?? {}) as Record<string, string>;
  const raw = start.dateTime ?? start.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : Math.floor(d.getTime() / 1000);
}

async function fetchCalendarCalls(token: string, exclude: string[]): Promise<
  Record<string, { next: number | null; last: number | null; name: string }>
> {
  const ex = new Set(exclude.map((e) => e.toLowerCase()));
  const now = Date.now();
  const nowTs = Math.floor(now / 1000);
  const tmin = new Date(now - 120 * 86400000).toISOString();
  const tmax = new Date(now + 400 * 86400000).toISOString();
  const out: Record<string, { next: number | null; last: number | null; name: string }> = {};
  let page: string | undefined;
  while (true) {
    const u = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    u.searchParams.set("timeMin", tmin);
    u.searchParams.set("timeMax", tmax);
    u.searchParams.set("singleEvents", "true");
    u.searchParams.set("orderBy", "startTime");
    u.searchParams.set("maxResults", "250");
    if (page) u.searchParams.set("pageToken", page);
    const resp = await gApi(token, u.toString());
    for (const e of resp.items ?? []) {
      const ts = eventStartTs(e);
      if (ts === null) continue;
      for (const a of e.attendees ?? []) {
        const em = (a.email ?? "").toLowerCase();
        if (!em || ex.has(em)) continue;
        const slot = out[em] ??= { next: null, last: null, name: "" };
        if (a.displayName && !slot.name) slot.name = a.displayName;
        if (ts >= nowTs) { if (slot.next === null || ts < slot.next) slot.next = ts; }
        else { if (slot.last === null || ts > slot.last) slot.last = ts; }
      }
    }
    page = resp.nextPageToken;
    if (!page) break;
  }
  return out;
}

// ── Supabase write helpers ───────────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function batchUpsert(svc: SupabaseClient, table: string, rows: any[], onConflict: string) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await svc.from(table).upsert(rows.slice(i, i + 500), { onConflict });
    if (error) throw new HttpError(500, `${table} upsert: ${error.message}`);
  }
}

function dedupeContacts(list: Array<{ email: string; name: string; company: string; domain: string }>) {
  const m = new Map<string, { email: string; name: string; company: string; domain: string }>();
  for (const c of list) {
    if (!c.email) continue;
    const prev = m.get(c.email);
    // keep the richest name/company seen
    m.set(c.email, {
      email: c.email,
      name: c.name || prev?.name || "",
      company: c.company || prev?.company || "",
      domain: c.domain || prev?.domain || "",
    });
  }
  return [...m.values()];
}

// Upsert contacts preserving user-owned fields (notes/archived/status/etc.) and
// not overwriting hand-edited name/company — mirrors db.upsert_contact via the
// crm_upsert_contact RPC (defined in the schema migration's companion).
async function upsertContacts(
  svc: SupabaseClient,
  contacts: Array<{ email: string; name: string; company: string; domain: string }>,
) {
  const { error } = await svc.rpc("crm_upsert_contacts", { _rows: contacts });
  if (error) throw new HttpError(500, `crm_upsert_contacts: ${error.message}`);
}
