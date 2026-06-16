// Create a Google Calendar event with a Meet link and email invites to the
// contact + standing teammates (ALWAYS_INVITE). Port of create_event().
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  CFG, corsHeaders, HttpError, json, refreshAccessToken, requireAdmin, serviceClient,
} from "../_shared/crm.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const userId = await requireAdmin(req);
    const { contactEmail, title, startIso, durationMin, description } = await req.json();
    if (!contactEmail || !title || !startIso || !durationMin) {
      throw new HttpError(400, "contactEmail, title, startIso, durationMin required");
    }

    const svc = serviceClient();
    // Prefer the calling admin's own connected mailbox; else the first account.
    const { data: accounts } = await svc
      .from("crm_accounts").select("id, owner_id").order("created_at", { ascending: true });
    const acct = accounts?.find((a) => a.owner_id === userId) ?? accounts?.[0];
    if (!acct) throw new HttpError(400, "No connected Google account");

    const { data: sec } = await svc
      .from("crm_account_secrets").select("refresh_token").eq("account_id", acct.id).single();
    if (!sec?.refresh_token) throw new HttpError(401, "TOKEN_EXPIRED");
    const token = await refreshAccessToken(sec.refresh_token);

    const start = new Date(startIso);
    const end = new Date(start.getTime() + durationMin * 60000);

    // Attendees: client first, then teammates, de-duplicated (case-insensitive).
    const attendees: Array<{ email: string }> = [];
    const seen = new Set<string>();
    for (const addr of [contactEmail, ...CFG.ALWAYS_INVITE]) {
      const key = addr.toLowerCase();
      if (key && !seen.has(key)) { attendees.push({ email: addr }); seen.add(key); }
    }

    const body = {
      summary: title,
      description: description ?? "",
      start: { dateTime: start.toISOString(), timeZone: CFG.TIMEZONE },
      end: { dateTime: end.toISOString(), timeZone: CFG.TIMEZONE },
      attendees,
      reminders: { useDefault: true },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all&conferenceDataVersion=1",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (res.status === 401) throw new HttpError(401, "TOKEN_EXPIRED");
    if (!res.ok) throw new HttpError(502, `Calendar error: ${await res.text()}`);
    const event = await res.json();

    return json({
      link: event.htmlLink ?? "",
      meet: event.hangoutLink ?? "",
      attendee: contactEmail,
      start: start.toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: CFG.TIMEZONE,
      }),
    });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return json({ error: (e as Error).message }, status);
  }
});
