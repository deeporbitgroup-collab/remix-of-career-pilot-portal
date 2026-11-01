import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTpUserLanguage, pick, resolveLang, type TpLang } from "../_shared/tpLanguage.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Career Pilot URLs - NEVER use Lovable URLs
const TALENT_POOL_HOME = "https://careerpilot.it/talent-pool";
const TALENT_POOL_ADMIN = "https://careerpilot.it/talent-pool/admin";

interface ReceiptUploadRequest {
  studentEmail: string;
  studentName: string;
  fileName: string;
  receiptUrl?: string;
  amount: number;
  language?: string; // 'it' | 'en' — site language of the uploading student (fallback only)
}

const getEmailTemplate = (
  content: string,
  gradient: string = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
  lang: TpLang = "en"
) => `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: ${gradient}; border-radius: 16px 16px 0 0;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Career Pilot</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Talent Pool</p>
            </td>
          </tr>
        </table>
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
        </table>
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">${pick(lang, "Have questions? Contact us:", "Hai domande? Contattaci:")}</p>
              <p style="margin: 0; color: #1e3a8a; font-size: 14px; font-weight: 600;">careerpilot2025@gmail.com</p>
              <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Career Pilot. ${pick(lang, "All rights reserved.", "Tutti i diritti riservati.")}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  console.log("send-talent-pool-receipt-upload function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentEmail, studentName, fileName, receiptUrl, amount, language }: ReceiptUploadRequest = await req.json();

    console.log("Processing receipt upload notification:", { studentEmail, studentName, fileName, amount });

    const timestamp = new Date().toLocaleString('en-GB', { 
      timeZone: 'Europe/Rome',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // Recipient = the uploading student (= requester): stored preference, then body.language, else Italian.
    const supabase = createClient(supabaseUrl, supabaseKey);
    const lang: TpLang = resolveLang(await getTpUserLanguage(supabase, { email: studentEmail }), language);
    const timestampIt = new Date().toLocaleString('it-IT', {
      timeZone: 'Europe/Rome',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // Email to student (IT)
    const studentContentIt = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">✅</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #16a34a; font-size: 24px; font-weight: 600; text-align: center;">Ricevuta di pagamento ricevuta!</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Ciao ${studentName},
      </p>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Abbiamo ricevuto correttamente la tua ricevuta di pagamento per il <strong>Career Pilot Talent Pool</strong>.
      </p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>File:</strong> ${fileName}</p>
        <p style="margin: 5px 0;"><strong>Importo:</strong> €${amount}</p>
        <p style="margin: 5px 0;"><strong>Data di caricamento:</strong> ${timestampIt}</p>
      </div>
      
      <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 15px; font-weight: 500;">
          ⏳ Cosa succede ora?
        </p>
        <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
          Verificheremo il tuo pagamento e confermeremo a breve il tuo accesso. Riceverai un'altra email non appena il pagamento sarà verificato.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${TALENT_POOL_HOME}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);">
          Vai al Talent Pool
        </a>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Grazie per aver scelto Career Pilot!<br>
        <strong style="color: #16a34a;">Il team di Career Pilot</strong>
      </p>
    `;

    // Email to student (EN)
    const studentContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">✅</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #16a34a; font-size: 24px; font-weight: 600; text-align: center;">Payment Receipt Received!</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Dear ${studentName},
      </p>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        We have successfully received your payment receipt for the <strong>Career Pilot Talent Pool</strong>.
      </p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>File:</strong> ${fileName}</p>
        <p style="margin: 5px 0;"><strong>Amount:</strong> €${amount}</p>
        <p style="margin: 5px 0;"><strong>Upload time:</strong> ${timestamp}</p>
      </div>
      
      <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 15px; font-weight: 500;">
          ⏳ What happens next?
        </p>
        <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
          We will verify your payment and confirm your access shortly. You'll receive another email once your payment is verified.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${TALENT_POOL_HOME}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);">
          Go to Talent Pool
        </a>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Thank you for choosing Career Pilot!<br>
        <strong style="color: #16a34a;">The Career Pilot Team</strong>
      </p>
    `;

    const { error: studentEmailError } = await resend.emails.send({
      from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
      to: [studentEmail],
      subject: pick(lang, "Payment Receipt Received - Career Pilot Talent Pool", "Ricevuta di pagamento ricevuta - Career Pilot Talent Pool"),
      html: lang === "it"
        ? getEmailTemplate(studentContentIt, "linear-gradient(135deg, #16a34a 0%, #15803d 100%)", "it")
        : getEmailTemplate(studentContent, "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"),
    });

    if (studentEmailError) {
      console.error("Student email error:", studentEmailError);
    }

    // Email to admin (EN)
    const adminContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">💳</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 24px; font-weight: 600; text-align: center;">New Payment Receipt Uploaded</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        A student has uploaded a payment receipt for the Talent Pool.
      </p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Student:</strong> ${studentName}</p>
        <p style="margin: 8px 0;"><strong>Email:</strong> ${studentEmail}</p>
        <p style="margin: 8px 0;"><strong>File:</strong> ${fileName}</p>
        <p style="margin: 8px 0;"><strong>Amount:</strong> €${amount}</p>
        <p style="margin: 8px 0;"><strong>Date:</strong> ${timestamp}</p>
      </div>
      
      ${receiptUrl ? `
      <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <a href="${receiptUrl}" style="color: #3b82f6; font-weight: 600; text-decoration: none;">
          📎 View/Download Receipt
        </a>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${TALENT_POOL_ADMIN}" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(30, 58, 138, 0.4);">
          Review Payment
        </a>
      </div>
    `;

    const { error: adminEmailError } = await resend.emails.send({
      from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `New Payment Receipt - ${studentName} (€${amount})`,
      html: getEmailTemplate(adminContent),
    });

    if (adminEmailError) {
      console.error("Admin email error:", adminEmailError);
    }

    console.log("Receipt upload notification emails sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-talent-pool-receipt-upload function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
