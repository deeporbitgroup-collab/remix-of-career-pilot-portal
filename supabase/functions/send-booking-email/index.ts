import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const FALLBACK_FROM = "Career Pilot <noreply@careerpilot.it>";
const ADMIN_EMAIL = "careerpilot2025@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingEmailRequest {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  notes?: string;
}

const escapeHtml = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const isValidEmail = (value: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
const isValidFrom = (value: string) => isValidEmail(value) || /^.{1,100}\s<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/.test(value);
const getFromAddress = () => {
  const configuredFrom = (Deno.env.get("RESEND_FROM_EMAIL") || Deno.env.get("RESEND_FROM") || "").trim();
  return configuredFrom && isValidFrom(configuredFrom) ? configuredFrom : FALLBACK_FROM;
};

const GOOGLE_CALENDAR_GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

async function createMeetEvent(params: {
  summary: string;
  description: string;
  startISO: string;
  endISO: string;
  attendees: string[];
}): Promise<{ meetLink: string | null; eventLink: string | null; error?: string }> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const calendarKey = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
  if (!lovableKey || !calendarKey) {
    return { meetLink: null, eventLink: null, error: "google_calendar_not_configured" };
  }

  try {
    const requestId = `cp-checkin-${crypto.randomUUID()}`;
    const url = `${GOOGLE_CALENDAR_GATEWAY}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": calendarKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.startISO, timeZone: "Europe/Rome" },
        end: { dateTime: params.endISO, timeZone: "Europe/Rome" },
        attendees: params.attendees.map((email) => ({ email })),
        guestsCanSeeOtherGuests: true,
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: { useDefault: true },
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Google Calendar API error:", res.status, JSON.stringify(data));
      return { meetLink: null, eventLink: null, error: `calendar_api_${res.status}` };
    }

    const meetEntry = (data.conferenceData?.entryPoints || []).find(
      (e: any) => e.entryPointType === "video",
    );
    return {
      meetLink: meetEntry?.uri || data.hangoutLink || null,
      eventLink: data.htmlLink || null,
    };
  } catch (err: any) {
    console.error("createMeetEvent exception:", err?.message || err);
    return { meetLink: null, eventLink: null, error: err?.message || "calendar_exception" };
  }
}

const getEmailTemplate = (content: string) => `
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
  </div>
</body>
</html>`;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, service, date, time, notes }: BookingEmailRequest = await req.json();

    console.log("Received booking data:", { name, email, phone, service, date, time, notes });

    if (!name || !email || !phone || !service || !date || !time) {
      return new Response(JSON.stringify({ error: "Missing required booking fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Invalid recipient email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const from = getFromAddress();
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeDate = escapeHtml(date);
    const safeTime = escapeHtml(time);
    const safeNotes = escapeHtml(notes);

    // Map service values to readable names
    const serviceNames = {
      takeoff: "Takeoff - University Admissions",
      layover: "Layover - Transfer Support", 
      altitude: "Altitude - Internship & Career"
    };

    const serviceName = escapeHtml(serviceNames[service as keyof typeof serviceNames] || service);
    const serviceLabel = serviceNames[service as keyof typeof serviceNames] || service;

    // Build start/end ISO times in Europe/Rome (date "YYYY-MM-DD", time "HH:MM"), 30-minute call
    const hhmm = (time.length >= 5 ? time.slice(0, 5) : "10:00");
    const [hStr, mStr] = hhmm.split(":");
    const startMinutes = (parseInt(hStr, 10) || 0) * 60 + (parseInt(mStr, 10) || 0);
    const endTotal = startMinutes + 30;
    const endH = String(Math.floor(endTotal / 60) % 24).padStart(2, "0");
    const endM = String(endTotal % 60).padStart(2, "0");
    const startISO = `${date}T${hhmm}:00`;
    const endISO = `${date}T${endH}:${endM}:00`;

    // Create Google Meet event (best-effort: emails still go out if this fails)
    const meet = await createMeetEvent({
      summary: `Career Pilot Free Check-in — ${name}`,
      description: `Free Check-in with ${name}\nService: ${serviceLabel}\nPhone: ${phone}\nEmail: ${email}${notes ? `\nNotes: ${notes}` : ""}`,
      startISO,
      endISO,
      attendees: [email, ADMIN_EMAIL],
    });
    console.log("Meet event result:", meet);

    const meetBlockHtml = meet.meetLink
      ? `
        <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;padding:18px;margin:22px 0;text-align:center;">
          <p style="margin:0 0 12px;color:#1e3a5f;font-weight:600;">Google Meet link</p>
          <a href="${meet.meetLink}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">Join the call</a>
          <p style="margin:12px 0 0;font-size:13px;color:#475569;word-break:break-all;">${meet.meetLink}</p>
        </div>`
      : `<p style="font-size:14px;color:#92400e;background:#fef3c7;padding:12px 14px;border-radius:8px;">The Google Meet link could not be generated automatically. Our team will send it to you shortly.</p>`;

    const meetBlockText = meet.meetLink
      ? `\n\nGoogle Meet link: ${meet.meetLink}`
      : "\n\nThe Google Meet link will be sent to you shortly by our team.";

    // Send notification to admin
    const adminEmailResponse = await resend.emails.send({
      from,
      to: [ADMIN_EMAIL],
      reply_to: email,
      subject: `New Free Check-in Booking - ${name}`,
      html: getEmailTemplate(`
        <h2 style="margin:0 0 20px;color:#1e3a5f;font-size:22px;">New Free Check-in Booking</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Phone:</strong> ${safePhone}</p>
        <p><strong>Service:</strong> ${serviceName}</p>
        <p><strong>Date:</strong> ${safeDate}</p>
        <p><strong>Time:</strong> ${safeTime} (Europe/Rome)</p>
        ${notes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ''}
        ${meetBlockHtml}
        ${meet.eventLink ? `<p style="font-size:13px;color:#475569;">Calendar event: <a href="${meet.eventLink}">${meet.eventLink}</a></p>` : ''}
        <hr>
        <p><em>Automatic notification from the Career Pilot booking system</em></p>
      `),
      text: `New Free Check-in Booking\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nService: ${serviceLabel}\nDate: ${date}\nTime: ${time} (Europe/Rome)${notes ? `\nNotes: ${notes}` : ""}${meetBlockText}`,
    });

    console.log("Admin email sent:", adminEmailResponse);

    if (adminEmailResponse.error) {
      console.error("Admin email error:", adminEmailResponse.error);
      throw new Error(adminEmailResponse.error.message || "Admin booking email failed");
    }

    // Send confirmation to client
    const clientEmailResponse = await resend.emails.send({
      from,
      to: [email],
      reply_to: ADMIN_EMAIL,
      subject: "Your Free Check-in booking confirmation",
      html: getEmailTemplate(`
        <h2 style="margin:0 0 20px;color:#1e3a5f;font-size:22px;">Hi ${safeName}, your Free Check-in is booked.</h2>
        <p style="font-size:16px;line-height:1.6;">Thank you for booking your Free Check-in with Career Pilot. Here are your booking details:</p>
        <div style="background:#f1f5f9;border-radius:10px;padding:18px;margin:22px 0;line-height:1.8;">
          <p style="margin:0;"><strong>Service:</strong> ${serviceName}</p>
          <p style="margin:0;"><strong>Date:</strong> ${safeDate}</p>
          <p style="margin:0;"><strong>Time:</strong> ${safeTime} (Europe/Rome)</p>
        </div>
        ${meetBlockHtml}
        <p style="font-size:16px;line-height:1.6;">Our team will reach out at <strong>${safePhone}</strong> if any additional details are needed.</p>
        ${notes ? `<p style="font-size:16px;line-height:1.6;"><strong>Your notes:</strong> ${safeNotes}</p>` : ''}
        <p style="font-size:16px;line-height:1.6;">If you need to reschedule or have any questions, reply to this email.</p>
        <br>
        <p style="font-size:16px;line-height:1.6;">Best regards,<br><strong>The Career Pilot Team</strong></p>
      `),
      text: `Hi ${name}, your Free Check-in is booked.\n\nService: ${serviceLabel}\nDate: ${date}\nTime: ${time} (Europe/Rome)${meetBlockText}\n\nOur team will reach out at ${phone} if any additional details are needed.${notes ? `\n\nYour notes: ${notes}` : ""}\n\nBest regards,\nThe Career Pilot Team`,
    });

    console.log("Client email sent:", clientEmailResponse);

    if (clientEmailResponse.error) {
      console.error("Client email error:", clientEmailResponse.error);
      throw new Error(clientEmailResponse.error.message || "Client booking email failed");
    }

    const emailResponse = { admin: adminEmailResponse, client: clientEmailResponse };

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-booking-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);