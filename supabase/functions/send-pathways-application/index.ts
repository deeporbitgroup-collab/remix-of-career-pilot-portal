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
      <h2>Nuova Candidatura Pathways</h2>
      <p><strong>Studente:</strong> ${studentName} (${studentEmail})</p>
      <p><strong>Provider:</strong> ${providerName}</p>
      <p><strong>Categoria:</strong> ${category}</p>
      <p><strong>Sottocategoria:</strong> ${subcategory}</p>
      <p><strong>Scuola:</strong> ${school}</p>
      <p><strong>Telefono:</strong> ${phone}</p>
      <p><strong>Periodo:</strong> ${periodFrom} - ${periodTo}</p>
      <h3>Motivazione:</h3>
      <p>${motivation}</p>
      <p><small>Timestamp: ${new Date().toISOString()}</small></p>
    `;

    // Send email to student
    const studentEmailHtml = `
      <h2>Conferma Candidatura - Pathways</h2>
      <p>Gentile ${studentName},</p>
      <p>Abbiamo ricevuto la tua candidatura per <strong>${providerName}</strong>.</p>
      <p><strong>Dettagli:</strong></p>
      <ul>
        <li>Categoria: ${category}</li>
        <li>Sottocategoria: ${subcategory}</li>
        <li>Periodo: ${periodFrom} - ${periodTo}</li>
      </ul>
      <p>Ti contatteremo presto con aggiornamenti.</p>
      <p>Cordiali saluti,<br>Team Pathways</p>
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
        subject: `Nuova candidatura – ${category} – ${studentName} – ${providerName}`,
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
        subject: 'Conferma candidatura - Pathways',
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
