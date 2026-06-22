import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const FALLBACK_FROM = "Career Pilot <noreply@careerpilot.it>";
const ADMIN_EMAIL = "careerpilot2025@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const isValidEmail = (value: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
const isValidFrom = (value: string) =>
  isValidEmail(value) || /^.{1,100}\s<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/.test(value);
const getFromAddress = () => {
  const configuredFrom = (Deno.env.get("RESEND_FROM_EMAIL") || Deno.env.get("RESEND_FROM") || "").trim();
  return configuredFrom && isValidFrom(configuredFrom) ? configuredFrom : FALLBACK_FROM;
};

const emailShell = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:620px;margin:0 auto;padding:28px 16px;">
    <div style="background:#1e3a5f;padding:28px 24px;text-align:center;border-radius:14px 14px 0 0;">
      <h1 style="margin:0;color:#ffffff;font-size:26px;line-height:1.2;">Career Pilot</h1>
      <p style="margin:8px 0 0;color:#dbeafe;font-size:14px;">Your Career Partner</p>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:0;padding:32px 24px;border-radius:0 0 14px 14px;">
      ${content}
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin:18px 0 0;">
      You are receiving this email because you subscribed to the Career Pilot newsletter.
    </p>
  </div>
</body>
</html>`;

// The five topics the newsletter covers — rendered as a styled list in the
// welcome email and mirrored on the site footer.
const TOPICS: Array<{ emoji: string; title: string; desc: string }> = [
  { emoji: "🎓", title: "University ranking updates", desc: "Fresh rankings and insights to guide your university and master's choices." },
  { emoji: "✍️", title: "Articles from professionals & students", desc: "First-hand stories and advice from people already where you want to be." },
  { emoji: "🏷️", title: "Discount codes on our services", desc: "Exclusive promo codes on mentoring and career services, just for subscribers." },
  { emoji: "🛂", title: "Visa & bureaucracy updates", desc: "Plain-English updates on visas, permits and the paperwork that matters." },
  { emoji: "💼", title: "Job market insights", desc: "Trends, openings and deadlines across Italy, the UK and beyond." },
];

const topicsHtml = () =>
  TOPICS.map((t) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eef2f7;vertical-align:top;width:34px;font-size:20px;">${t.emoji}</td>
      <td style="padding:10px 0 10px 6px;border-bottom:1px solid #eef2f7;">
        <p style="margin:0;font-weight:700;color:#1e3a5f;font-size:15px;">${t.title}</p>
        <p style="margin:3px 0 0;color:#475569;font-size:13px;line-height:1.5;">${t.desc}</p>
      </td>
    </tr>`).join("");

const topicsText = () => TOPICS.map((t) => `• ${t.title} — ${t.desc}`).join("\n");

// Public footer signup. Runs with the service role so the table can stay locked
// down (no anon policies); duplicates are silently ignored. After storing the
// subscriber we send a welcome email to them and a notification to admin.
serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    const clean = String(email || "").trim().toLowerCase();
    if (!clean || !isValidEmail(clean)) {
      return json({ error: "Invalid email" }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert({ email: clean }, { onConflict: "email", ignoreDuplicates: true });

    if (error) throw error;

    const from = getFromAddress();
    const safeEmail = escapeHtml(clean);
    let emailed = false;

    // Best-effort emails: the subscription is already saved, so a mail failure
    // must not turn into a user-facing error.
    try {
      // 1) Beautiful welcome email to the new subscriber
      const welcome = await resend.emails.send({
        from,
        to: [clean],
        reply_to: ADMIN_EMAIL,
        subject: "Welcome aboard ✈️ — you're on the Career Pilot newsletter",
        html: emailShell(`
          <h2 style="margin:0 0 16px;color:#1e3a5f;font-size:23px;">Welcome aboard! 🎉</h2>
          <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">
            Thank you for subscribing to the <strong>Career Pilot</strong> newsletter — we're thrilled to have you on board.
          </p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 20px;">
            This newsletter is built to help you take off in your studies and career. Here's what will land in your inbox:
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 24px;">
            ${topicsHtml()}
          </table>
          <div style="text-align:center;margin:8px 0 4px;">
            <a href="https://careerpilot.it" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:8px;font-weight:600;font-size:15px;">
              Explore Career Pilot
            </a>
          </div>
          <p style="font-size:15px;line-height:1.6;margin:24px 0 0;">
            Fasten your seatbelt — great opportunities are on the way.
          </p>
          <p style="font-size:15px;line-height:1.6;margin:8px 0 0;">
            Warm regards,<br><strong>The Career Pilot Team</strong>
          </p>
        `),
        text:
          `Welcome aboard!\n\n` +
          `Thank you for subscribing to the Career Pilot newsletter — we're thrilled to have you on board.\n\n` +
          `Here's what will land in your inbox:\n${topicsText()}\n\n` +
          `Explore Career Pilot: https://careerpilot.it\n\n` +
          `Fasten your seatbelt — great opportunities are on the way.\n\n` +
          `Warm regards,\nThe Career Pilot Team`,
      });
      if (welcome.error) throw new Error(welcome.error.message || "welcome email failed");

      // 2) Notify admin of the new subscriber
      const adminNotice = await resend.emails.send({
        from,
        to: [ADMIN_EMAIL],
        reply_to: clean,
        subject: `New newsletter subscriber — ${clean}`,
        html: emailShell(`
          <h2 style="margin:0 0 16px;color:#1e3a5f;font-size:22px;">New newsletter subscriber 🎉</h2>
          <p style="font-size:16px;line-height:1.6;margin:0 0 8px;">A new student just subscribed to the newsletter:</p>
          <div style="background:#f1f5f9;border-radius:10px;padding:16px 18px;margin:16px 0;">
            <p style="margin:0;font-size:16px;"><strong>Email:</strong> ${safeEmail}</p>
          </div>
          <p style="font-size:13px;color:#475569;margin:8px 0 0;"><em>Automatic notification from the Career Pilot newsletter system.</em></p>
        `),
        text: `New newsletter subscriber\n\nEmail: ${clean}\n\nAutomatic notification from the Career Pilot newsletter system.`,
      });
      if (adminNotice.error) throw new Error(adminNotice.error.message || "admin email failed");

      emailed = true;
    } catch (mailErr) {
      console.error("newsletter-subscribe email error:", mailErr);
    }

    return json({ success: true, emailed });
  } catch (e: any) {
    console.error("newsletter-subscribe error:", e);
    return json({ error: e.message || "Failed to subscribe" }, 500);
  }
});
