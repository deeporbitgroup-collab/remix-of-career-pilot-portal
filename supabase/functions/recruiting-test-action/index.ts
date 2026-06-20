import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const ADMIN_EMAIL = "careerpilot2025@gmail.com";
const FROM = "Career Pilot Talent Pool <noreply@careerpilot.it>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveParties(supabase: any, companyId: string, studentId: string) {
  const { data: comp } = await supabase
    .from("company_profiles").select("company_name, reference_email").eq("user_id", companyId).maybeSingle();
  const { data: compUser } = await supabase
    .from("talent_pool_users").select("email").eq("id", companyId).maybeSingle();
  const { data: stu } = await supabase
    .from("student_profiles").select("first_name, last_name").eq("user_id", studentId).maybeSingle();
  const { data: stuUser } = await supabase
    .from("talent_pool_users").select("email").eq("id", studentId).maybeSingle();
  return {
    companyName: comp?.company_name || "The company",
    companyEmail: comp?.reference_email || compUser?.email || "",
    studentName: `${stu?.first_name ?? ""} ${stu?.last_name ?? ""}`.trim() || "the candidate",
    studentEmail: stuUser?.email || "",
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Format an ISO date / "YYYY-MM-DD" deadline into "20 Jun 2026". Falls back to raw.
function fmtDate(value?: string, timezone?: string): string {
  if (!value) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  let label = value;
  if (m) {
    const [, y, mo, d] = m;
    label = `${parseInt(d, 10)} ${MONTHS[parseInt(mo, 10) - 1]} ${y}`;
  }
  return timezone ? `${label} (${timezone})` : label;
}

async function sendAll(emails: Array<{ to: string; subject: string; html: string } | null>) {
  try {
    await Promise.allSettled(
      emails
        .filter((e): e is { to: string; subject: string; html: string } => !!e && !!e.to)
        .map((e) => resend.emails.send({ from: FROM, to: [e.to], subject: e.subject, html: e.html }))
    );
  } catch (err) {
    console.error("Email error (non-fatal):", err);
  }
}

async function loadTest(supabase: any, testId: string) {
  const { data, error } = await supabase
    .from("recruiting_tests").select("*").eq("id", testId).maybeSingle();
  if (error) throw error;
  return data;
}

// ---- Action: send (company assigns a test) ----
async function handleSend(supabase: any, body: any) {
  const { companyId, studentId, title, instructions, link, dueAt, timezone } = body;
  if (!companyId || !studentId || !link) {
    return json(400, { error: "companyId, studentId and link are required" });
  }
  const { data: test, error } = await supabase
    .from("recruiting_tests")
    .insert({
      company_id: companyId,
      student_id: studentId,
      title: title || null,
      instructions: instructions || null,
      link,
      due_at: dueAt || null,
      timezone: timezone || null,
      status: "SENT",
      created_by: "COMPANY",
    })
    .select()
    .single();
  if (error) throw error;

  const p = await resolveParties(supabase, companyId, studentId);
  const titlePart = title ? ` — <strong>${title}</strong>` : "";
  const subjTitle = title ? `: ${title}` : "";
  const due = dueAt ? `<p>Deadline: <strong>${fmtDate(dueAt, timezone)}</strong></p>` : "";
  const msg = instructions ? `<p>${instructions}</p>` : "";
  const linkHtml = `<p>Test link: <a href="${link}">${link}</a></p>`;

  await sendAll([
    {
      to: p.studentEmail,
      subject: `New test from ${p.companyName}${subjTitle}`,
      html: `<p><strong>${p.companyName}</strong> assigned you a test${titlePart}. Open your <strong>Tests</strong> tab to see the details and the link.</p>${due}${msg}${linkHtml}`,
    },
    {
      to: p.companyEmail,
      subject: `You assigned a test to ${p.studentName}${subjTitle}`,
      html: `<p>You assigned a test to <strong>${p.studentName}</strong>${titlePart}.</p>${due}${msg}${linkHtml}<p>You'll be notified when they complete it.</p>`,
    },
    {
      to: ADMIN_EMAIL,
      subject: `Test assigned: ${p.companyName} → ${p.studentName}`,
      html: `<p><strong>${p.companyName}</strong> assigned a test to <strong>${p.studentName}</strong>${titlePart}.</p>${due}${linkHtml}`,
    },
  ]);

  return json(200, { success: true, test });
}

// ---- Action: submit (student marks the test as done) ----
async function handleSubmit(supabase: any, body: any) {
  const { testId } = body;
  if (!testId) return json(400, { error: "testId is required" });
  const test = await loadTest(supabase, testId);
  if (!test) return json(404, { error: "Test not found" });
  if (test.status !== "SENT") {
    return json(409, { error: `Test is ${test.status}, cannot submit` });
  }

  const { data: updated, error } = await supabase
    .from("recruiting_tests")
    .update({ status: "SUBMITTED", updated_at: new Date().toISOString() })
    .eq("id", testId)
    .select()
    .single();
  if (error) throw error;

  const p = await resolveParties(supabase, test.company_id, test.student_id);
  const titlePart = test.title ? ` — <strong>${test.title}</strong>` : "";
  const subjTitle = test.title ? `: ${test.title}` : "";

  await sendAll([
    {
      to: p.companyEmail,
      subject: `${p.studentName} completed the test${subjTitle}`,
      html: `<p><strong>${p.studentName}</strong> marked the test${titlePart} as completed.</p><p>You can review it and set the outcome from your dashboard.</p>`,
    },
    {
      to: p.studentEmail,
      subject: `Test marked as completed${subjTitle}`,
      html: `<p>You marked the test${titlePart} with <strong>${p.companyName}</strong> as completed. They'll be in touch with the outcome.</p>`,
    },
    {
      to: ADMIN_EMAIL,
      subject: `Test completed: ${p.studentName} → ${p.companyName}`,
      html: `<p><strong>${p.studentName}</strong> completed the test${titlePart} from <strong>${p.companyName}</strong>.</p>`,
    },
  ]);

  return json(200, { success: true, test: updated });
}

// ---- Action: mark (company sets the outcome PASSED / FAILED) ----
async function handleMark(supabase: any, body: any) {
  const { testId, result, outcome } = body;
  if (!testId || !["PASSED", "FAILED"].includes(result)) {
    return json(400, { error: "testId and result (PASSED|FAILED) are required" });
  }
  const test = await loadTest(supabase, testId);
  if (!test) return json(404, { error: "Test not found" });

  const { data: updated, error } = await supabase
    .from("recruiting_tests")
    .update({ status: result, outcome: outcome || null, updated_at: new Date().toISOString() })
    .eq("id", testId)
    .select()
    .single();
  if (error) throw error;

  const p = await resolveParties(supabase, test.company_id, test.student_id);
  const titlePart = test.title ? ` — <strong>${test.title}</strong>` : "";
  const subjTitle = test.title ? `: ${test.title}` : "";
  const outcomePart = outcome ? `<p>${outcome}</p>` : "";
  const positive = result === "PASSED";

  await sendAll([
    {
      to: p.studentEmail,
      subject: `Test result from ${p.companyName}${subjTitle}`,
      html: `<p>${positive ? "Great news — you <strong>passed</strong>" : "The company has reviewed your test"} ${titlePart} with <strong>${p.companyName}</strong>.</p><p>Result: <strong>${positive ? "Passed" : "Not passed"}</strong>.</p>${outcomePart}`,
    },
    {
      to: p.companyEmail,
      subject: `Test marked ${positive ? "passed" : "failed"} — ${p.studentName}${subjTitle}`,
      html: `<p>You marked <strong>${p.studentName}</strong>'s test${titlePart} as <strong>${positive ? "passed" : "failed"}</strong>.</p>${outcomePart}`,
    },
    {
      to: ADMIN_EMAIL,
      subject: `Test ${positive ? "passed" : "failed"}: ${p.companyName} ↔ ${p.studentName}`,
      html: `<p><strong>${p.companyName}</strong> marked <strong>${p.studentName}</strong>'s test${titlePart} as <strong>${positive ? "passed" : "failed"}</strong>.</p>${outcomePart}`,
    },
  ]);

  return json(200, { success: true, test: updated });
}

// ---- Action: cancel (company withdraws the test) ----
async function handleCancel(supabase: any, body: any) {
  const { testId } = body;
  if (!testId) return json(400, { error: "testId is required" });
  const test = await loadTest(supabase, testId);
  if (!test) return json(404, { error: "Test not found" });

  const { data: updated, error } = await supabase
    .from("recruiting_tests")
    .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
    .eq("id", testId)
    .select()
    .single();
  if (error) throw error;

  const p = await resolveParties(supabase, test.company_id, test.student_id);
  const titlePart = test.title ? ` — <strong>${test.title}</strong>` : "";
  const subjTitle = test.title ? `: ${test.title}` : "";

  await sendAll([
    {
      to: p.studentEmail,
      subject: `Test cancelled${subjTitle}`,
      html: `<p>The test${titlePart} from <strong>${p.companyName}</strong> was cancelled. You don't need to complete it.</p>`,
    },
    {
      to: p.companyEmail,
      subject: `You cancelled a test${subjTitle}`,
      html: `<p>You cancelled the test${titlePart} for <strong>${p.studentName}</strong>.</p>`,
    },
    {
      to: ADMIN_EMAIL,
      subject: `Test cancelled: ${p.companyName} ✕ ${p.studentName}`,
      html: `<p><strong>${p.companyName}</strong> cancelled the test${titlePart} for <strong>${p.studentName}</strong>.</p>`,
    },
  ]);

  return json(200, { success: true, test: updated });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const action = body?.action;

    switch (action) {
      case "send":
        return await handleSend(supabase, body);
      case "submit":
        return await handleSubmit(supabase, body);
      case "mark":
        return await handleMark(supabase, body);
      case "cancel":
        return await handleCancel(supabase, body);
      default:
        return json(400, { error: `Unsupported action: ${action}` });
    }
  } catch (error: any) {
    console.error("recruiting-test-action error:", error);
    return json(500, { error: error.message || "Unexpected error" });
  }
});
