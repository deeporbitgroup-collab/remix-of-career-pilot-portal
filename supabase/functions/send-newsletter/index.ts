import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Same FROM / test-mode convention as the other senders: with no verified
// RESEND_FROM_EMAIL we run in test mode and only deliver to the test recipient.
const envFrom = Deno.env.get("RESEND_FROM_EMAIL") || "";
const allowedTestRecipient = (Deno.env.get("RESEND_TEST_RECIPIENT") ?? "careerpilot2025@gmail.com").toLowerCase();
const isTestMode = !envFrom;
const fromEmail = isTestMode ? "Career Pilot <noreply@careerpilot.it>" : envFrom;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

interface NewsletterPayload {
  subject: string;
  body: string;
  // any of: clients | associates | partners | tp_companies | tp_students | subscribers
  audiences: string[];
  attachments?: { filename: string; content: string }[]; // base64
}

type Recipient = { email: string; first_name?: string | null };

const emailTemplate = (subject: string, body: string, hasAttachments: boolean) => `
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;padding:20px;">
    <tr><td>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#1a365d 0%,#2d4a7c 100%);border-radius:16px 16px 0 0;">
        <tr><td style="padding:36px 30px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">Career Pilot</h1>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Your Flight Plan to Success</p>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <tr><td style="padding:36px 30px;">
          <h2 style="margin:0 0 16px;color:#1a365d;font-size:20px;">${subject}</h2>
          <div style="color:#475569;font-size:15px;line-height:1.6;white-space:pre-wrap;">${body}</div>
          ${hasAttachments ? `<p style="margin-top:20px;color:#64748b;font-size:13px;">📎 You'll find the attached document(s) in this email.</p>` : ""}
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;">
        <tr><td style="padding:20px 30px;text-align:center;color:#94a3b8;font-size:12px;">
          You're receiving this because you're part of the Career Pilot community.<br/>This is an automated email, please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { subject, body, audiences, attachments }: NewsletterPayload = await req.json();
    if (!subject?.trim() || !body?.trim()) return json({ error: "Subject and body are required" }, 400);
    if (!Array.isArray(audiences) || audiences.length === 0) return json({ error: "Pick at least one audience" }, 400);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const want = new Set(audiences);

    // Collect recipients per requested audience, tolerating per-source errors.
    const collected: Recipient[] = [];
    const pull = async (label: string, fn: () => Promise<Recipient[]>) => {
      try {
        collected.push(...(await fn()));
      } catch (e) {
        console.error(`[send-newsletter] failed to load ${label}:`, e);
      }
    };

    if (want.has("clients")) {
      await pull("clients", async () => {
        const { data, error } = await supabase.from("client_users").select("email, first_name");
        if (error) throw error;
        return data || [];
      });
    }
    if (want.has("associates") || want.has("partners")) {
      const roles: string[] = [];
      if (want.has("associates")) roles.push("ASSOCIATE");
      if (want.has("partners")) roles.push("PARTNER");
      await pull("profiles", async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("email, first_name")
          .in("role", roles)
          .eq("status", "approved");
        if (error) throw error;
        return data || [];
      });
    }
    if (want.has("tp_companies") || want.has("tp_students")) {
      const roles: string[] = [];
      if (want.has("tp_companies")) roles.push("COMPANY");
      if (want.has("tp_students")) roles.push("STUDENT");
      await pull("talent_pool_users", async () => {
        const { data, error } = await supabase
          .from("talent_pool_users")
          .select("email, first_name")
          .in("role", roles);
        if (error) throw error;
        return data || [];
      });
    }
    if (want.has("subscribers")) {
      await pull("subscribers", async () => {
        const { data, error } = await supabase.from("newsletter_subscribers").select("email");
        if (error) throw error;
        return data || [];
      });
    }

    // Dedupe by lowercased email.
    const byEmail = new Map<string, Recipient>();
    for (const r of collected) {
      const e = (r.email || "").trim().toLowerCase();
      if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) continue;
      if (!byEmail.has(e)) byEmail.set(e, { email: e, first_name: r.first_name });
    }
    let recipients = Array.from(byEmail.values());
    const requestedCount = recipients.length;

    let skippedCount = 0;
    if (isTestMode) {
      const filtered = recipients.filter((r) => r.email === allowedTestRecipient);
      skippedCount = recipients.length - filtered.length;
      recipients = filtered.length > 0 ? filtered : [{ email: allowedTestRecipient }];
    }

    const html = emailTemplate(subject, body, !!(attachments && attachments.length));
    const emailAttachments = (attachments || []).map((a) => ({ filename: a.filename, content: a.content }));

    console.log(`[send-newsletter] isTestMode=${isTestMode} requested=${requestedCount} sending=${recipients.length}`);

    const results = await Promise.all(
      recipients.map(async (r) => {
        try {
          const resp = await resend.emails.send({
            from: `Career Pilot <${fromEmail}>`,
            to: [r.email],
            subject,
            html,
            attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
          });
          if ((resp as any)?.error) {
            console.error(`Resend error for ${r.email}:`, (resp as any).error);
            return false;
          }
          return true;
        } catch (e) {
          console.error(`Failed to send to ${r.email}:`, e);
          return false;
        }
      })
    );
    const sentCount = results.filter(Boolean).length;

    // Log it (service role bypasses RLS).
    try {
      await supabase.from("newsletters").insert({
        subject,
        body,
        audiences,
        requested_count: requestedCount,
        sent_count: sentCount,
        sent_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[send-newsletter] failed to log newsletter:", e);
    }

    return json({
      success: true,
      testMode: isTestMode,
      requestedCount,
      sentCount,
      skippedCount,
      message: `Sent ${sentCount}/${requestedCount} emails${isTestMode ? " (TEST MODE)" : ""}`,
    });
  } catch (e: any) {
    console.error("send-newsletter error:", e);
    return json({ error: e.message || "Failed to send newsletter" }, 500);
  }
};

serve(handler);
