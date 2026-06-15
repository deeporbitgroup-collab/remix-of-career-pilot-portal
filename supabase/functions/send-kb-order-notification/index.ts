import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientName, clientEmail, clientPhone, products, totalAmount, orderId } = await req.json();

    const productsList = products
      .map((p: any) => `<li>${p.title} — €${p.price}</li>`)
      .join("");

    const disclaimer = `<p style="color: #dc2626; font-weight: bold; margin-top: 20px;">⚠️ It is strictly forbidden to share these materials with third parties or publish them externally. All content is personal and confidential.</p>`;

    // Email to client
    const clientHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Knowledge Base Order Confirmation</h2>
        <p>Dear ${clientName},</p>
        <p>Thank you for your purchase! Here's your order summary:</p>
        <ul>${productsList}</ul>
        <p><strong>Total: €${totalAmount}</strong></p>
        <p>Your materials will be available in your dashboard once payment is verified.</p>
        ${disclaimer}
        <p>Best regards,<br/>Career Pilot Team</p>
      </div>
    `;

    // Email to admin
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a365d;">New Knowledge Base Order</h2>
        <p><strong>Client:</strong> ${clientName}</p>
        <p><strong>Email:</strong> ${clientEmail}</p>
        <p><strong>Phone:</strong> ${clientPhone}</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <h3>Products:</h3>
        <ul>${productsList}</ul>
        <p><strong>Total: €${totalAmount}</strong></p>
      </div>
    `;

    if (RESEND_API_KEY) {
      // Send to client
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Career Pilot <onboarding@careerpilot.it>",
          to: [clientEmail],
          subject: "Knowledge Base Order Confirmation",
          html: clientHtml,
        }),
      });

      // Send to admin
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from: "Career Pilot <onboarding@careerpilot.it>",
          to: ["info@careerpilot.it"],
          subject: `New KB Order from ${clientName}`,
          html: adminHtml,
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
