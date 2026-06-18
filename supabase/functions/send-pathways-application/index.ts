import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const envFrom = Deno.env.get('RESEND_FROM_EMAIL') || '';
const allowedTestRecipient = (Deno.env.get('RESEND_TEST_RECIPIENT') ?? 'careerpilot2025@gmail.com').toLowerCase();
const isTestMode = !envFrom;
const fromEmail = isTestMode ? 'Career Pilot <noreply@careerpilot.it>' : envFrom;
const ADMIN_EMAIL = (Deno.env.get('ADMIN_NOTIFICATIONS_EMAIL') ?? 'careerpilot2025@gmail.com').toLowerCase();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      studentName,
      studentEmail,
      providerName,
      category,
      subcategory,
      school,
      phone,
      motivation,
      periodFrom,
      periodTo,
    } = await req.json();

    // Send email to admin
    const adminEmailHtml = `
      <h2>New Pathways Application</h2>
      <p><strong>Student:</strong> ${studentName} (${studentEmail})</p>
      <p><strong>Provider:</strong> ${providerName}</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Subcategory:</strong> ${subcategory}</p>
      <p><strong>School:</strong> ${school}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Period:</strong> ${periodFrom} - ${periodTo}</p>
      <h3>Motivation:</h3>
      <p>${motivation}</p>
      <p><small>Timestamp: ${new Date().toISOString()}</small></p>
    `;

    // Send email to student
    const studentEmailHtml = `
      <h2>Application Confirmation - Pathways</h2>
      <p>Dear ${studentName},</p>
      <p>We have received your application for <strong>${providerName}</strong>.</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li>Category: ${category}</li>
        <li>Subcategory: ${subcategory}</li>
        <li>Period: ${periodFrom} - ${periodTo}</li>
      </ul>
      <p>We will be in touch soon with updates.</p>
      <p>Best regards,<br>The Pathways Team</p>
    `;

    // Send to admin
    const adminRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Pathways <${fromEmail}>`,
        to: isTestMode ? [allowedTestRecipient] : [ADMIN_EMAIL],
        subject: `New application – ${category} – ${studentName} – ${providerName}`,
        html: adminEmailHtml,
      }),
    });
    if (!adminRes.ok) {
      const errText = await adminRes.text();
      throw new Error(`Resend admin send failed: ${errText}`);
    }

    // Send to student
    const studentRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Pathways <${fromEmail}>`,
        to: isTestMode ? [allowedTestRecipient] : [studentEmail],
        subject: 'Application Confirmation - Pathways',
        html: studentEmailHtml,
      }),
    });
    if (!studentRes.ok) {
      const errText = await studentRes.text();
      throw new Error(`Resend student send failed: ${errText}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
