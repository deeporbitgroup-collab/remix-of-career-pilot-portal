import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const envFrom = Deno.env.get("RESEND_FROM_EMAIL") || "";
const allowedTestRecipient = (Deno.env.get("RESEND_TEST_RECIPIENT") ?? "careerpilot2025@gmail.com").toLowerCase();
const isTestMode = !envFrom;
const fromEmail = isTestMode ? "Career Pilot <noreply@careerpilot.it>" : envFrom;

// Career Pilot team — always kept in the loop (BCC) for task oversight.
const TEAM = [
  "fassio.leone@gmail.com",
  "andreaa@mit.edu",
  "elisabettafabris.work@gmail.com",
].map((e) => e.toLowerCase());

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });

interface Payload {
  email?: string | null; // assignee email (optional)
  name?: string | null; // assignee display name
  taskTitle: string;
  dueDate?: string | null;
  notes?: string | null;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isEmail = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);

const template = (assigneeName: string, taskTitle: string, dueDate: string | null, notes: string | null) => {
  const who = assigneeName ? esc(assigneeName) : "the team";
  return `
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;padding:24px;">
    <tr><td style="background:linear-gradient(135deg,#1a365d,#2d4a7c);border-radius:16px 16px 0 0;padding:28px 30px;text-align:center;">
      <p style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">&#9992;&#65039; Career Pilot</p>
      <p style="margin:6px 0 0;color:#9db8e0;font-size:12px;letter-spacing:1px;">CREW PORTAL · TASK BOARD</p>
    </td></tr>
    <tr><td style="background:#fff;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:30px;">
      <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">A task has been assigned to <strong style="color:#0f172a;">${who}</strong>:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
        <tr><td style="padding:18px 20px;">
          <p style="margin:0 0 6px;color:#1a365d;font-size:17px;font-weight:700;">${esc(taskTitle)}</p>
          <p style="margin:6px 0 0;color:#64748b;font-size:13px;">&#128100; Assignee: ${who}</p>
          ${dueDate ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px;">&#128197; Due ${esc(dueDate)}</p>` : ""}
          ${notes ? `<p style="margin:10px 0 0;color:#475569;font-size:14px;line-height:1.5;white-space:pre-wrap;">${esc(notes)}</p>` : ""}
        </td></tr>
      </table>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:13px;">Open the crew portal task board to manage it.</p>
    </td></tr>
    <tr><td style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:0 0 16px 16px;padding:18px 30px;text-align:center;color:#94a3b8;font-size:12px;">
      Automated task notification · please do not reply.
    </td></tr>
  </table>
</body></html>`;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { email, name, taskTitle, dueDate, notes }: Payload = await req.json();
    if (!taskTitle?.trim()) return json({ error: "Missing task title" }, 400);

    const assignee = String(email || "").trim().toLowerCase();
    const assigneeValid = !!assignee && isEmail(assignee);

    // Recipients: assignee in TO (the person who must act), team in BCC (oversight,
    // hidden from the assignee). With no assignee, the team is the direct TO.
    let to: string[];
    let bcc: string[] | undefined;
    if (isTestMode) {
      to = [allowedTestRecipient];
      bcc = undefined;
    } else if (assigneeValid) {
      to = [assignee];
      bcc = TEAM.filter((t) => t !== assignee);
    } else {
      to = [...TEAM];
      bcc = undefined;
    }

    const resp = await resend.emails.send({
      from: `Career Pilot <${fromEmail}>`,
      to,
      bcc: bcc && bcc.length ? bcc : undefined,
      subject: `New task: ${taskTitle}`,
      html: template(name || "", taskTitle, dueDate || null, notes || null),
    });
    if ((resp as any)?.error) {
      console.error("notify-task-assignee resend error:", (resp as any).error);
      return json({ error: "Send failed" }, 500);
    }
    return json({ success: true, notifiedTeam: !isTestMode });
  } catch (e: any) {
    console.error("notify-task-assignee error:", e);
    return json({ error: e.message || "Failed" }, 500);
  }
});
