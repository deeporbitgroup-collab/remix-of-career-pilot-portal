// Per-contact AI actions — port of client_tracker/ai.py (summarize_contact,
// draft_reply) plus Gmail draft creation (gmail_client.create_draft).
//   action: "summarize" -> { summary }   (also cached on crm_contacts.ai_summary)
//   action: "draft"     -> { draft }     (ready-to-send body, thread language)
//   action: "gmail_draft" { body }       -> saves a Gmail draft in the thread
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  CFG, corsHeaders, HttpError, json, refreshAccessToken, requireAdmin, serviceClient,
} from "../_shared/crm.ts";
import { stripQuoted } from "../_shared/gmail.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const { action, email, body } = await req.json();
    if (!action || !email) throw new HttpError(400, "action and email required");
    const svc = serviceClient();

    if (action === "gmail_draft") {
      const link = await createGmailDraft(svc, email, body ?? "");
      return json({ ok: true, ...link });
    }

    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new HttpError(400, "GEMINI_API_KEY secret is not set");

    const { data: c } = await svc.from("crm_contacts_enriched")
      .select("name, company, status").eq("email", email).single();
    const convo = await conversationBlock(svc, email);
    const today = new Date().toISOString().slice(0, 10);

    if (action === "summarize") {
      const ctx = [
        `Today: ${today}`,
        `Contact: ${c?.name ?? ""} <${email}> | company: ${c?.company ?? "—"} | status: ${c?.status ?? ""}`,
        ...convo,
      ].join("\n");
      const system =
        "You summarize one client relationship from email history. Reply in " +
        "the language most used in the thread. Output exactly:\n" +
        "1. Two sentences: who this is and where things stand.\n" +
        "2. 'Action items:' — bullet list of open commitments WITH dates if " +
        "mentioned (who owes what). If none, write 'Action items: none'.\n" +
        "Be concrete; never invent facts not in the conversation.";
      const summary = await generate(key, system, ctx, 0.2);
      await svc.from("crm_contacts").update({
        ai_summary: summary, ai_summary_at: Math.floor(Date.now() / 1000),
      }).eq("email", email);
      return json({ summary });
    }

    if (action === "draft") {
      const ctx = [`Today: ${today}`, `Contact: ${c?.name ?? ""} <${email}>`, ...convo].join("\n");
      const system =
        "Draft a reply email from the user to this contact, continuing the " +
        "conversation naturally. Match the thread's language and tone. Output " +
        "ONLY the email body — no subject line, no commentary, no placeholders " +
        "like [Name] (use the real names from the thread).";
      const draft = await generate(key, system, ctx, 0.5);
      return json({ draft });
    }

    throw new HttpError(400, `Unknown action: ${action}`);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: (e as Error).message }, status);
  }
});

// Most recent thread for the contact → its body lines (quote-stripped).
async function conversationBlock(svc: SupabaseClient, email: string): Promise<string[]> {
  const { data: own } = await svc.from("crm_messages").select("thread_id").eq("contact_email", email);
  const threadIds = new Set((own ?? []).map((r) => r.thread_id));
  const { data: cc } = await svc.from("crm_message_contacts").select("message_id").eq("contact_email", email);
  if (cc?.length) {
    const { data: ccMsgs } = await svc.from("crm_messages").select("thread_id").in("id", cc.map((r) => r.message_id));
    for (const m of ccMsgs ?? []) threadIds.add(m.thread_id);
  }
  if (!threadIds.size) return ["(no prior emails)"];
  const { data: conv } = await svc.from("crm_messages")
    .select("direction, body_text, snippet, ts").in("thread_id", [...threadIds]).order("ts", { ascending: true });
  const lines = [`=== CONVERSATION WITH ${email} ===`];
  for (const m of conv ?? []) {
    const who = m.direction === "out" ? "You" : email;
    const txt = stripQuoted(m.body_text ?? "") || m.snippet || "";
    const when = m.ts ? new Date(m.ts * 1000).toISOString().slice(0, 16).replace("T", " ") : "";
    lines.push(`[${when}] ${who}: ${txt}`);
  }
  return lines;
}

async function generate(key: string, system: string, userText: string, temperature: number): Promise<string> {
  const model = CFG.GEMINI_MODEL;
  const res = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { temperature },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new HttpError(502, `Gemini error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  // deno-lint-ignore no-explicit-any
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  // deno-lint-ignore no-explicit-any
  const text = parts.map((p: any) => p.text ?? "").join("").trim();
  if (!text) throw new HttpError(502, "Empty response from Gemini");
  return text;
}

// Save a reply as a Gmail draft in the contact's latest thread (gmail.compose).
async function createGmailDraft(svc: SupabaseClient, email: string, bodyText: string) {
  if (!bodyText.trim()) throw new HttpError(400, "Draft body is empty");

  const { data: acct } = await svc.from("crm_accounts").select("id").order("created_at").limit(1).single();
  if (!acct) throw new HttpError(400, "No connected Google account");
  const { data: sec } = await svc.from("crm_account_secrets").select("refresh_token").eq("account_id", acct.id).single();
  if (!sec?.refresh_token) throw new HttpError(401, "TOKEN_EXPIRED");
  const token = await refreshAccessToken(sec.refresh_token);

  // latest message in the contact's most recent thread → Re: subject + threadId
  const { data: last } = await svc.from("crm_messages")
    .select("thread_id, subject").eq("contact_email", email).order("ts", { ascending: false }).limit(1).single();
  const subjectRaw = last?.subject ?? "";
  const subject = subjectRaw && !/^re:/i.test(subjectRaw) ? `Re: ${subjectRaw}` : (subjectRaw || "(no subject)");
  const threadId = last?.thread_id;

  const mime =
    `To: ${email}\r\n` +
    `Subject: ${encodeHeader(subject)}\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n` +
    `MIME-Version: 1.0\r\n\r\n` +
    bodyText;
  const raw = b64urlUtf8(mime);

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: threadId ? { raw, threadId } : { raw } }),
  });
  if (res.status === 401 || res.status === 403) {
    throw new HttpError(401, "Gmail compose permission missing — reconnect Gmail once to grant it.");
  }
  if (!res.ok) throw new HttpError(502, `Gmail draft error: ${await res.text()}`);
  const draft = await res.json();
  return { draftId: draft.id };
}

// RFC 2047 encode a header value if it has non-ASCII chars.
function encodeHeader(s: string): string {
  // deno-lint-ignore no-control-regex
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(s)))}?=`;
}
function b64urlUtf8(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
