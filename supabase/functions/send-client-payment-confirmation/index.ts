import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentConfirmationRequest {
  orderId: string;
  clientId: string;
}

const getEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); border-radius: 16px 16px 0 0;">
          <tr>
            <td style="padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Career Pilot</h1>
              <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 14px;">Your Flight Plan to Success</p>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Have questions? Contact us:</p>
              <p style="margin: 0; color: #1a365d; font-size: 14px; font-weight: 600;">careerpilot2025@gmail.com</p>
              <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Career Pilot. All rights reserved.</p>
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, clientId }: PaymentConfirmationRequest = await req.json();
    
    console.log("Processing payment confirmation:", { orderId, clientId });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from('client_users')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Fetch order details with items
    const { data: order, error: orderError } = await supabase
      .from('client_orders')
      .select(`
        *,
        client_order_items (
          *,
          client_services (name, category, price)
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Format order items
    const orderItems = order.client_order_items.map((item: any) => ({
      name: item.client_services?.name || 'Unknown Service',
      category: item.client_services?.category || '',
      price: item.price
    }));

    const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.price, 0);
    const discountPercentage = order.discount_percentage || 0;
    const discountAmount = (subtotal * discountPercentage) / 100;
    const total = subtotal - discountAmount;

    // Format date
    const orderDate = new Date(order.created_at);
    const formattedDate = orderDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Generate order reference
    const orderRef = `CP-${orderId.slice(0, 8).toUpperCase()}`;

    // Build items HTML
    const itemsHtml = orderItems.map((item: any) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px;">
          ${item.name}
          <br><span style="color: #64748b; font-size: 12px;">${item.category}</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #1e293b; font-size: 14px; font-weight: 600;">
          €${item.price.toFixed(2)}
        </td>
      </tr>
    `).join('');

    const content = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">💳</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #166534; font-size: 24px; font-weight: 600; text-align: center;">Payment Confirmed!</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Hi ${client.first_name} ${client.last_name},
      </p>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Thank you for your purchase on Career Pilot! Your payment has been <strong style="color: #166534;">successfully confirmed</strong>.
      </p>
      
      <!-- Order Details Box -->
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div>
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Order Reference</p>
            <p style="margin: 5px 0 0 0; color: #1a365d; font-size: 18px; font-weight: 700;">${orderRef}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
            <p style="margin: 5px 0 0 0; color: #1e293b; font-size: 14px; font-weight: 500;">${formattedDate}</p>
          </div>
        </div>
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #e2e8f0;">
          <thead>
            <tr>
              <th style="padding: 15px 0 10px 0; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Service</th>
              <th style="padding: 15px 0 10px 0; text-align: right; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <!-- Totals -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 15px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Subtotal</td>
            <td style="padding: 8px 0; text-align: right; color: #334155; font-size: 14px;">€${subtotal.toFixed(2)}</td>
          </tr>
          ${discountPercentage > 0 ? `
          <tr>
            <td style="padding: 8px 0; color: #16a34a; font-size: 14px;">Discount (${discountPercentage}%)</td>
            <td style="padding: 8px 0; text-align: right; color: #16a34a; font-size: 14px;">-€${discountAmount.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr style="border-top: 2px solid #1a365d;">
            <td style="padding: 15px 0; color: #1a365d; font-size: 18px; font-weight: 700;">Total Paid</td>
            <td style="padding: 15px 0; text-align: right; color: #1a365d; font-size: 18px; font-weight: 700;">€${total.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 15px; font-weight: 500;">
          Next steps
        </p>
        <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
          Your assigned Associate will contact you shortly to schedule your first meeting. In the meantime, you can access your personal area to view the status of your projects.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://careerpilot.it/client-portal/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(26, 54, 93, 0.4);">
          Go to Dashboard
        </a>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Thank you for choosing Career Pilot!<br>
        <strong style="color: #1a365d;">The Career Pilot Team</strong>
      </p>
    `;

    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: [client.email],
      subject: `Payment Confirmed - Order ${orderRef}`,
      html: getEmailTemplate(content),
    });

    console.log("Payment confirmation email sent successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending payment confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
