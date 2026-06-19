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
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
</head>
<body style="margin:0;padding:0;background-color:#e8eef6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${subject}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#e8eef6;padding:28px 14px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 48px rgba(15,23,42,0.16);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0b2545 0%,#1a365d 45%,#2d6cdf 100%);padding:0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:40px 36px 34px;text-align:center;">
              <div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:16px;background:rgba(255,255,255,0.14);color:#ffffff;font-size:26px;margin-bottom:14px;">&#9992;&#65039;</div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.4px;">Career Pilot</h1>
              <p style="margin:7px 0 0;color:#a9c6f5;font-size:12px;letter-spacing:2px;text-transform:uppercase;">Your Flight Plan to Success</p>
            </td></tr>
          </table>
        </td></tr>
        <!-- Accent bar -->
        <tr><td style="height:5px;background:linear-gradient(90deg,#2d6cdf,#38bdf8,#34d399);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Body -->
        <tr><td style="padding:40px 40px 8px;">
          <h2 style="margin:0 0 18px;color:#0b2545;font-size:23px;line-height:1.25;font-weight:800;letter-spacing:-0.3px;">${subject}</h2>
          <div style="color:#475569;font-size:16px;line-height:1.72;white-space:pre-wrap;">${body}</div>
        </td></tr>

        ${hasAttachments ? `
        <tr><td style="padding:18px 40px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">
            <tr><td style="padding:14px 18px;color:#1d4ed8;font-size:14px;font-weight:600;">&#128206;&nbsp; Your document(s) are attached to this email.</td></tr>
          </table>
        </td></tr>` : ""}

        <!-- Divider -->
        <tr><td style="padding:30px 40px 0;"><div style="height:1px;background:#e8edf4;font-size:0;line-height:0;">&nbsp;</div></td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 40px 36px;text-align:center;">
          <p style="margin:0 0 12px;color:#64748b;font-size:13px;">Stay in touch with the Career Pilot crew</p>
          <table role="presentation" align="center" cellspacing="0" cellpadding="0"><tr>
            <td style="padding:0 7px;"><a href="https://instagram.com/careerpilot_official" style="color:#2d6cdf;text-decoration:none;font-size:13px;font-weight:600;">Instagram</a></td>
            <td style="color:#cbd5e1;">&bull;</td>
            <td style="padding:0 7px;"><a href="https://linkedin.com/company/career-pilot" style="color:#2d6cdf;text-decoration:none;font-size:13px;font-weight:600;">LinkedIn</a></td>
            <td style="color:#cbd5e1;">&bull;</td>
            <td style="padding:0 7px;"><a href="mailto:CareerPilot.team@gmail.com" style="color:#2d6cdf;text-decoration:none;font-size:13px;font-weight:600;">Email</a></td>
          </tr></table>
          <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;line-height:1.6;">
            You're receiving this because you're part of the Career Pilot community.<br/>
            This is an automated email — please do not reply.
          </p>
        </td></tr>

      </table>
      <p style="margin:18px 0 0;color:#9aa7bd;font-size:11px;">&copy; Career Pilot · Made by students, for students.</p>
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
