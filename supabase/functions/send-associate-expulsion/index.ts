import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExpulsionRequest {
  associateName: string;
  associateEmail: string;
  reason?: string;
}

function isValidFrom(from: string) {
  // Accept either:
  // - email@example.com
  // - Name <email@example.com>
  const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  const nameEmail = /^.{1,100}\s<[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>$/;
  return email.test(from) || nameEmail.test(from);
}

serve(async (req: Request): Promise<Response> => {
  console.log("send-associate-expulsion called", { method: req.method });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

    const resend = new Resend(apiKey);

    const body: ExpulsionRequest = await req.json();
    const { associateName, associateEmail, reason } = body;

    if (!associateName || !associateEmail) {
      return new Response(JSON.stringify({ error: "Missing associateName or associateEmail" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const envFrom = (Deno.env.get("RESEND_FROM_EMAIL") || "").trim();
    const fallbackFrom = "Career Pilot <onboarding@careerpilot.it>";
    const from = envFrom && isValidFrom(envFrom) ? envFrom : fallbackFrom;

    if (envFrom && from === fallbackFrom) {
      console.warn("Invalid RESEND_FROM_EMAIL format, falling back to onboarding@resend.dev", { envFrom });
    }

    const reasonSection = reason
      ? `<p><strong>Motivazione:</strong></p><p style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 10px 0;">${reason}</p>`
      : "";

    console.log("Sending expulsion email", { to: associateEmail, from });

    const emailResponse = await resend.emails.send({
      from,
      to: [associateEmail],
      subject: "Notifica di rimozione dalla piattaforma Career Pilot",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a1a2e;">Gentile ${associateName},</h2>
          <p>Ti informiamo che il tuo account è stato rimosso dalla piattaforma Career Pilot.</p>
          ${reasonSection}
          <p>A partire da questo momento non sarà più possibile accedere alla tua area personale.</p>
          <p>Se ritieni che questa decisione sia stata presa per errore o desideri maggiori informazioni, ti invitiamo a contattarci rispondendo a questa email.</p>
          <br>
          <p>Cordiali saluti,</p>
          <p><strong>Il Team Career Pilot</strong></p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">Questa è un'email automatica generata dal sistema Career Pilot.</p>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error("Resend error", emailResponse.error);
      return new Response(JSON.stringify({ error: emailResponse.error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Expulsion email sent successfully", emailResponse);
    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-associate-expulsion", { message: error?.message, stack: error?.stack });
    return new Response(JSON.stringify({ error: error?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
