// AI chat aware of the CRM's client emails. Port of client_tracker/ai.py.
// Builds a CONTEXT block from the crm_* tables (client list + relevant full
// conversations) and asks Gemini. Key comes from the GEMINI_API_KEY secret.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { CFG, corsHeaders, HttpError, json, requireAdmin, serviceClient } from "../_shared/crm.ts";
import { stripQuoted } from "../_shared/gmail.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const SYSTEM =
  "You are an assistant embedded in a personal client-email tracker. You help " +
  "the user understand and act on their email correspondence with clients. A " +
  "snapshot of their contacts and conversations is provided below as CONTEXT. " +
  "Statuses mean: 'needs_reply' = the client wrote last and the user owes a " +
  "reply; 'waiting' = the user replied last and is waiting on the client; " +
  "'no_reply' = cold outreach the client never answered. Answer concisely and " +
  "practically. When asked to draft a reply, write it ready to send, matching " +
  "the language of the thread (often Italian). If something isn't in the " +
  "CONTEXT, say so rather than inventing it.";

interface Turn { role: "user" | "model"; text: string }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    await requireAdmin(req);
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) throw new HttpError(400, "GEMINI_API_KEY secret is not set");

    const { history } = await req.json() as { history: Turn[] };
    if (!history?.length) throw new HttpError(400, "history required");

    const svc = serviceClient();
    const lastUser = [...history].reverse().find((m) => m.role === "user")?.text ?? "";
    const context = await buildContext(svc, lastUser);

    const contents = history.filter((m) => m.text).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    const reply = await generate(key, SYSTEM + "\n\nCONTEXT:\n" + context, contents);

    // Persist chat history (parity with db.add_chat_message).
    const now = Math.floor(Date.now() / 1000);
    await svc.from("crm_chat_messages").insert([
      { role: "user", text: lastUser, created_at: now },
      { role: "model", text: reply, created_at: now + 1 },
    ]);

    return json({ reply });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: (e as Error).message }, status);
  }
});

// ── Context building (port of ai.build_context) ──────────────────────────────
// deno-lint-ignore no-explicit-any
function contactTokens(c: any): Set<string> {
  const toks = new Set<string>();
  const email = (c.email ?? "").toLowerCase();
  if (email) {
    toks.add(email);
    for (const w of email.split("@")[0].split(/[^a-z0-9]+/)) if (w.length >= 3) toks.add(w);
  }
  for (const w of (c.name ?? "").toLowerCase().split(/[^a-z0-9]+/)) if (w.length >= 3) toks.add(w);
  const company = (c.company ?? "").toLowerCase();
  if (company.length >= 3) toks.add(company);
  return toks;
}

async function conversationBlock(svc: SupabaseClient, email: string): Promise<string[]> {
  // thread-based: all threads the contact is a primary party in, or CC'd on.
  const { data: own } = await svc.from("crm_messages").select("thread_id").eq("contact_email", email);
  const { data: cc } = await svc.from("crm_message_contacts").select("message_id").eq("contact_email", email);
  const threadIds = new Set((own ?? []).map((r) => r.thread_id));
  if (cc?.length) {
    const ids = cc.map((r) => r.message_id);
    const { data: ccMsgs } = await svc.from("crm_messages").select("thread_id").in("id", ids);
    for (const m of ccMsgs ?? []) threadIds.add(m.thread_id);
  }
  if (!threadIds.size) return [];
  const { data: conv } = await svc.from("crm_messages")
    .select("direction, body_text, snippet, ts")
    .in("thread_id", [...threadIds]).order("ts", { ascending: true });

  const lines = ["", `=== FULL CONVERSATION WITH ${email} (${conv?.length ?? 0} messages) ===`];
  for (const m of conv ?? []) {
    const who = m.direction === "out" ? "You" : email;
    const bodyText = stripQuoted(m.body_text ?? "") || m.snippet || "";
    const when = m.ts ? new Date(m.ts * 1000).toISOString().slice(0, 16).replace("T", " ") : "";
    lines.push(`[${when}] ${who}: ${bodyText}`);
  }
  return lines;
}

async function buildContext(svc: SupabaseClient, userMsg: string, maxThreads = 5): Promise<string> {
  const { data: all } = await svc.from("crm_contacts_enriched")
    .select("email, name, company, status, due, last_message_at, stage, tags")
    .order("last_message_at", { ascending: false });
  const contacts = (all ?? []).filter((c) => c.status !== "archived");
  const due = contacts.filter((c) => c.due);

  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    `Today: ${today}`,
    `Active clients: ${contacts.length}`,
    "",
    "CLIENT LIST  — [status] last_activity | name <email> | company | stage | tags:",
  ];
  const msgLower = (userMsg ?? "").toLowerCase();
  const mentioned: string[] = [];
  for (const c of contacts) {
    const last = c.last_message_at ? new Date(c.last_message_at * 1000).toISOString().slice(0, 10) : "—";
    const extra = [c.stage ?? "", c.tags ?? ""].filter(Boolean).join(" | ");
    const flag = c.due ? " DUE-FOLLOW-UP" : "";
    lines.push(
      `- [${c.status}${flag}] ${last} | ${c.name ?? ""} <${c.email}> | ${c.company ?? ""}` +
      (extra ? ` | ${extra}` : ""),
    );
    if ([...contactTokens(c)].some((t) => msgLower.includes(t))) mentioned.push(c.email);
  }

  // Full-text-ish hits: question words found inside message bodies.
  if (mentioned.length < maxThreads) {
    const words = msgLower.split(/[^a-z0-9]+/).filter((w) => w.length >= 4).slice(0, 6);
    for (const w of words) {
      const { data: hits } = await svc.from("crm_messages")
        .select("contact_email").ilike("body_text", `%${w}%`).limit(5);
      for (const h of hits ?? []) {
        if (!mentioned.includes(h.contact_email)) mentioned.push(h.contact_email);
        if (mentioned.length >= maxThreads) break;
      }
      if (mentioned.length >= maxThreads) break;
    }
  }

  // Fallback: most urgent contacts so generic questions have substance.
  if (mentioned.length === 0) {
    const urgent = [...due.map((c) => c.email), ...contacts.filter((c) => c.status === "needs_reply").map((c) => c.email)];
    for (const em of urgent) {
      if (!mentioned.includes(em)) mentioned.push(em);
      if (mentioned.length >= 3) break;
    }
  }

  for (const email of mentioned.slice(0, maxThreads)) {
    lines.push(...await conversationBlock(svc, email));
  }
  return lines.join("\n");
}

// ── Gemini call (port of ai._generate) ───────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function generate(key: string, system: string, contents: any[], temperature = 0.4): Promise<string> {
  const model = CFG.GEMINI_MODEL;
  const res = await fetch(`${API_BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 429 && model.toLowerCase().includes("pro")) {
      throw new HttpError(429, `The ${model} model has no free-tier quota — switch to a Flash model.`);
    }
    throw new HttpError(502, `Gemini API error ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const candidates = data.candidates ?? [];
  if (!candidates.length) throw new HttpError(502, "No reply returned by Gemini");
  // deno-lint-ignore no-explicit-any
  const parts = candidates[0].content?.parts ?? [];
  // deno-lint-ignore no-explicit-any
  const text = parts.map((p: any) => p.text ?? "").join("").trim();
  return text || "(empty response)";
}
