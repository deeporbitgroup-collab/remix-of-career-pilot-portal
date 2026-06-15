import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  companyName: string;
  companyEmail: string;
  approved: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, companyEmail, approved }: ApprovalEmailRequest = await req.json();

    console.log("Sending company approval email:", { companyName, companyEmail, approved });

    if (!companyName || !companyEmail) {
      return new Response(
        JSON.stringify({ error: "Company name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailHtml = "";
    let subject = "";

    if (approved) {
      subject = "Registrazione Approvata - Talent Pool";
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Registrazione Approvata!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Gentile <strong>${companyName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Siamo lieti di informarvi che la vostra registrazione alla <strong>Talent Pool di CareerPilot</strong> è stata approvata!
            </p>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Ora potete accedere alla piattaforma e iniziare a visualizzare i profili degli studenti disponibili.
            </p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #16a34a; margin-top: 0;">🎯 Prossimi Passi:</h3>
              <ul style="color: #4b5563; line-height: 1.8;">
                <li>Accedete alla piattaforma con le vostre credenziali</li>
                <li>Esplorate i profili degli studenti</li>
                <li>Selezionate i candidati di vostro interesse</li>
                <li>Riceverete notifiche via email per ogni selezione</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://careerpilot.it/talent-pool/company" 
                 style="display: inline-block; background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Accedi alla Talent Pool
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              Benvenuti in CareerPilot!<br>
              Per qualsiasi domanda o assistenza, non esitate a contattarci.
            </p>
          </div>
        </div>
      `;
    } else {
      subject = "Registrazione Non Approvata - Talent Pool";
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">❌ Registrazione Non Approvata</h1>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Gentile <strong>${companyName}</strong>,
            </p>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Ci dispiace informarvi che la vostra registrazione alla <strong>Talent Pool di CareerPilot</strong> non è stata approvata in questo momento.
            </p>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Per ulteriori informazioni o per discutere della vostra richiesta, vi invitiamo a contattarci direttamente.
            </p>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="color: #991b1b; margin: 0; line-height: 1.6;">
                <strong>📧 Contatto:</strong> careerpilot2025@gmail.com
              </p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; line-height: 1.6; border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              Grazie per l'interesse in CareerPilot.
            </p>
          </div>
        </div>
      `;
    }

    const { error: emailError } = await resend.emails.send({
      from: "CareerPilot <noreply@careerpilot.it>",
      to: [companyEmail],
      subject: subject,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Email error:", emailError);
      throw emailError;
    }

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-company-approval-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
