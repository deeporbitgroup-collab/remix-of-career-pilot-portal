import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const COMPANY_DASHBOARD_URL = "https://careerpilot.it/talent-pool/company/dashboard";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  studentName: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { studentName }: NotifyRequest = await req.json();

    const name = (studentName || "").trim() || "A new candidate";

    // 1) All APPROVED company accounts (only valid/active companies — not pending/rejected).
    const { data: companyUsers, error: usersErr } = await supabase
      .from("talent_pool_users")
      .select("id, email")
      .eq("role", "COMPANY")
      .eq("registration_status", "APPROVED");

    if (usersErr) throw usersErr;

    if (!companyUsers || companyUsers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No approved companies to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Prefer each company's notification address (reference_email), fallback to the login email.
    const ids = companyUsers.map((c: any) => c.id);
    const { data: profiles } = await supabase
      .from("company_profiles")
      .select("user_id, reference_email")
      .in("user_id", ids);

    const refMap: Record<string, string> = Object.fromEntries(
      (profiles || []).map((p: any) => [p.user_id, p.reference_email])
    );

    const recipients = Array.from(
      new Set(
        companyUsers
          .map((c: any) => (refMap[c.id] || c.email || "").trim())
          .filter((e: string) => e.length > 0)
      )
    );

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No company emails resolved" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #334155;">
        <h2 style="color: #1e3a8a; text-align: center;">A new candidate joined the Talent Pool</h2>
        <p style="font-size: 16px; line-height: 1.6;">
          A new candidate has just joined the <strong>Career Pilot Talent Pool</strong>:
          <strong>${name}</strong>.
        </p>
        <p style="font-size: 16px; line-height: 1.6;">Go check out their profile in your dashboard.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${COMPANY_DASHBOARD_URL}" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 10px; font-size: 16px; font-weight: 600;">
            View Talent Pool
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b;">The Career Pilot Team</p>
      </div>
    `;

    // 3) One email per company (so addresses stay private). Failures are logged, never fatal.
    const results = await Promise.allSettled(
      recipients.map((email: string) =>
        resend.emails.send({
          from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
          to: [email],
          subject: `New candidate in the Talent Pool: ${name}`,
          html,
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`Email to ${recipients[i]} failed:`, r.reason);
      }
    });

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("notify-companies-new-student error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
