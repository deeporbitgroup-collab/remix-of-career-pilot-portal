import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReceiptUploadRequest {
  studentEmail: string;
  studentName: string;
  fileName: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-pathways-receipt-upload function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentEmail, studentName, fileName, notes }: ReceiptUploadRequest = await req.json();

    console.log("Processing receipt upload notification:", { studentEmail, studentName, fileName });

    // Email to admin
    const adminEmailResponse = await resend.emails.send({
      from: "Career Pilot Pathways <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `New Payment Receipt Uploaded – ${studentName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Payment Receipt Uploaded</h2>
          <p>A student has uploaded a payment receipt on Career Pilot Pathways:</p>
          <ul style="list-style: none; padding: 0;">
            <li><strong>Student:</strong> ${studentName}</li>
            <li><strong>Email:</strong> ${studentEmail}</li>
            <li><strong>File:</strong> ${fileName}</li>
            ${notes ? `<li><strong>Notes:</strong> ${notes}</li>` : ''}
            <li><strong>Date:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</li>
          </ul>
          <br>
          <p>Please review and activate the student's account from the admin dashboard.</p>
          <br>
          <p style="color: #666;">This is an automated notification from Career Pilot Pathways.</p>
        </div>
      `,
    });

    console.log("Admin email sent successfully:", adminEmailResponse);

    // Email to student
    const studentEmailResponse = await resend.emails.send({
      from: "Career Pilot Pathways <noreply@careerpilot.it>",
      to: [studentEmail],
      subject: 'Payment Receipt Received – Career Pilot Pathways',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #10b981;">Receipt Uploaded Successfully! ✓</h1>
          <p>Dear ${studentName},</p>
          <p>We have successfully received your payment receipt for <strong>Career Pilot Pathways</strong>.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>File:</strong> ${fileName}</p>
            ${notes ? `<p style="margin: 5px 0;"><strong>Your notes:</strong> ${notes}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Upload time:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          </div>
          <p>Our team will review your payment receipt and activate your account within 24-48 hours.</p>
          <p>Once approved, you will receive a confirmation email and gain full access to all Career Pilot Pathways features and opportunities.</p>
          <br>
          <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
          <br>
          <p>Best regards,<br><strong>The Career Pilot Team</strong></p>
        </div>
      `,
    });

    console.log("Student email sent successfully:", studentEmailResponse);

    return new Response(JSON.stringify({ success: true, adminEmailResponse, studentEmailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-pathways-receipt-upload function:", error);
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
