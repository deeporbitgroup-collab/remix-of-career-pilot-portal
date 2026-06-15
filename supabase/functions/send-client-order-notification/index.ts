import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Career Pilot</h1>
      <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Your Career Partner</p>
    </div>
    <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      ${content}
    </div>
    <div style="text-align: center; padding: 30px 20px;">
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        © 2024 Career Pilot. All rights reserved.<br>
        <a href="https://careerpilot.it" style="color: #1e3a5f; text-decoration: none;">careerpilot.it</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

interface OrderNotificationRequest {
  orderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { orderId }: OrderNotificationRequest = await req.json();

    if (!orderId) {
      throw new Error('orderId is required');
    }

    console.log('Processing order notification for orderId:', orderId);

    // Fetch order with client info
    const { data: order, error: orderError } = await supabase
      .from('client_orders')
      .select(`
        *,
        client:client_users(id, first_name, last_name, email, phone),
        outreach_cv_url,
        outreach_cover_letter_url,
        outreach_custom_email
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Failed to fetch order:', orderError);
      throw new Error('Order not found');
    }

    // Fetch projects with associate and service info
    const { data: projects, error: projectsError } = await supabase
      .from('client_projects')
      .select(`
        *,
        service:client_services(id, name, price, category),
        associate:profiles(id, first_name, last_name, email)
      `)
      .eq('order_id', orderId);

    if (projectsError) {
      console.error('Failed to fetch projects:', projectsError);
    }

    // Fetch meeting slots for each project
    const projectsWithSlots = await Promise.all((projects || []).map(async (project: any) => {
      const { data: slots } = await supabase
        .from('client_meeting_slots')
        .select('*')
        .eq('project_id', project.id)
        .order('proposed_time', { ascending: true });
      return { ...project, meetingSlots: slots || [] };
    }));

    const clientName = order.client ? `${order.client.first_name} ${order.client.last_name}` : 'Client';
    const clientEmail = order.client?.email || '';
    const clientPhone = order.client?.phone || 'N/A';
    const totalAmount = order.total_amount || 0;
    const discountPercentage = order.discount_percentage || 0;
    const finalAmount = totalAmount - (totalAmount * discountPercentage / 100);
    const hasReceipt = !!order.payment_receipt_url;
    const orderDate = new Date(order.created_at).toLocaleDateString('en-GB', { 
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    const orderRef = `CP-${orderId.slice(0, 8).toUpperCase()}`;

    // Build services list HTML
    const servicesHtml = projectsWithSlots.map((project: any) => {
      const slotsHtml = project.meetingSlots.length > 0 
        ? `<div style="margin-top: 10px; padding: 10px; background-color: #f1f5f9; border-radius: 8px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-weight: 600;">Proposed times by client:</p>
            ${project.meetingSlots.map((slot: any) => `<span style="display: inline-block; background-color: #e2e8f0; padding: 4px 10px; border-radius: 4px; font-size: 12px; margin: 2px 4px 2px 0;">${slot.proposed_time}</span>`).join('')}
           </div>`
        : '';

      const reasonHtml = project.additional_call_reason 
        ? `<div style="margin-top: 10px; padding: 10px; background-color: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #92400e; font-weight: 600;">📝 Reason for Additional Call:</p>
            <p style="margin: 0; font-size: 14px; color: #78350f; font-style: italic;">"${project.additional_call_reason}"</p>
           </div>`
        : '';

      const specificRequestHtml = project.specific_request 
        ? `<div style="margin-top: 10px; padding: 10px; background-color: #dbeafe; border-radius: 8px; border: 1px solid #93c5fd;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #1e40af; font-weight: 600;">🎯 ${project.service?.name === 'Associate Office Hours' ? 'Reason for Call:' : 'Session Focus / Specific Request:'}</p>
            <p style="margin: 0; font-size: 14px; color: #1e3a8a; font-style: italic;">"${project.specific_request}"</p>
           </div>`
        : '';
      
      return `
        <div style="border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
          <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">${project.service?.name}</p>
          <p style="margin: 0; font-size: 14px; color: #64748b;">Category: ${project.service?.category}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Price: €${project.service?.price}</p>
          ${project.associate ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #1e3a5f; font-weight: 500;">Associate: ${project.associate.first_name} ${project.associate.last_name}</p>` : ''}
          ${reasonHtml}
          ${specificRequestHtml}
          ${slotsHtml}
        </div>
      `;
    }).join('');

    // 1. Email to Admin
    const adminContent = `
      <h2 style="color: #1e3a5f; margin: 0 0 20px 0; font-size: 24px;">New Order Received</h2>
      
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>Order Reference:</strong> ${orderRef}<br>
          <strong>Date:</strong> ${orderDate}
        </p>
      </div>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e3a5f;">Client Details</h3>
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.8;">
          <strong>Name:</strong> ${clientName}<br>
          <strong>Email:</strong> ${clientEmail}<br>
          <strong>Phone:</strong> ${clientPhone}
        </p>
      </div>
      
      <div style="margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e3a5f;">Services Purchased</h3>
        ${servicesHtml}
      </div>
      
      ${order.outreach_cv_url || order.outreach_cover_letter_url ? `
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #fcd34d;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #92400e;">📦 Outreach Power Pack Documents</h3>
        <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.8;">
          ${order.outreach_cv_url ? `<strong>CV:</strong> ✅ Uploaded<br>` : ''}
          ${order.outreach_cover_letter_url ? `<strong>Cover Letter:</strong> ✅ Uploaded<br>` : ''}
          <strong>Custom Email:</strong> ${order.outreach_custom_email ? 'Yes - Client provided custom email' : 'No - Using Career Pilot default'}
        </p>
        ${order.outreach_custom_email ? `
        <div style="margin-top: 15px; padding: 15px; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fde68a;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #92400e; font-weight: 600;">📧 Client's Custom Email:</p>
          <p style="margin: 0; font-size: 14px; color: #78350f; white-space: pre-wrap;">${order.outreach_custom_email}</p>
        </div>
        ` : ''}
        <p style="margin: 15px 0 0 0; font-size: 12px; color: #b45309;">
          ⚠️ Service duration: 2-3 business days maximum
        </p>
      </div>
      ` : ''}
      
      <div style="background-color: #f0fdf4; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #166534;">Payment Summary</h3>
        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.8;">
          <strong>Subtotal:</strong> €${totalAmount.toFixed(2)}<br>
          ${discountPercentage > 0 ? `<strong>Discount (${discountPercentage}%):</strong> -€${(totalAmount * discountPercentage / 100).toFixed(2)}<br>` : ''}
          <strong>Total:</strong> €${finalAmount.toFixed(2)}<br>
          <strong>Receipt:</strong> ${hasReceipt ? '✅ Uploaded' : '⏳ Not yet uploaded'}
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://careerpilot.it/admin/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600;">
          Manage Order
        </a>
      </div>
    `;

    // 2. Email to Associate (for each unique associate)
    const uniqueAssociates = new Map<string, any>();
    projectsWithSlots.forEach((project: any) => {
      if (project.associate && !uniqueAssociates.has(project.associate.id)) {
        uniqueAssociates.set(project.associate.id, {
          associate: project.associate,
          projects: []
        });
      }
      if (project.associate) {
        uniqueAssociates.get(project.associate.id).projects.push(project);
      }
    });

    // Send admin email
    await resend.emails.send({
      from: "Career Pilot <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `New Order: ${clientName} - ${orderRef}`,
      html: getEmailTemplate(adminContent),
    });
    console.log('Admin email sent successfully');

    // Send email to each associate
    for (const [associateId, data] of uniqueAssociates) {
      const associateProjects = data.projects;
      const associateName = data.associate.first_name;
      
      const associateServicesHtml = associateProjects.map((project: any) => {
        const slotsHtml = project.meetingSlots.length > 0 
          ? `<div style="margin-top: 10px; padding: 10px; background-color: #f1f5f9; border-radius: 8px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-weight: 600;">Proposed times by client:</p>
              ${project.meetingSlots.map((slot: any) => `<span style="display: inline-block; background-color: #e2e8f0; padding: 4px 10px; border-radius: 4px; font-size: 12px; margin: 2px 4px 2px 0;">${slot.proposed_time}</span>`).join('')}
             </div>`
          : '';

        const reasonHtml = project.additional_call_reason 
          ? `<div style="margin-top: 10px; padding: 10px; background-color: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #92400e; font-weight: 600;">📝 Reason for Additional Call:</p>
              <p style="margin: 0; font-size: 14px; color: #78350f; font-style: italic;">"${project.additional_call_reason}"</p>
             </div>`
          : '';

        const specificRequestHtml = project.specific_request 
          ? `<div style="margin-top: 10px; padding: 10px; background-color: #dbeafe; border-radius: 8px; border: 1px solid #93c5fd;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #1e40af; font-weight: 600;">🎯 ${project.service?.name === 'Associate Office Hours' ? 'Reason for Call:' : 'Session Focus / Specific Request:'}</p>
              <p style="margin: 0; font-size: 14px; color: #1e3a8a; font-style: italic;">"${project.specific_request}"</p>
             </div>`
          : '';
        
        return `
          <div style="border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
            <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">${project.service?.name}</p>
            <p style="margin: 0; font-size: 14px; color: #64748b;">Category: ${project.service?.category}</p>
            ${reasonHtml}
            ${specificRequestHtml}
            ${slotsHtml}
          </div>
        `;
      }).join('');

      const associateContent = `
        <h2 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 24px;">Hi ${associateName},</h2>
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          You have received a new request from a client!
        </p>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e3a5f;">Client</h3>
          <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.8;">
            <strong>Name:</strong> ${clientName}
          </p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">
            Contact information will be visible in your personal area.
          </p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #1e3a5f;">Requested Services</h3>
          ${associateServicesHtml}
        </div>
        
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Action required:</strong> Access your personal area to confirm one of the proposed times.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://careerpilot.it/associate/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600;">
            Go to Dashboard
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 30px; text-align: center;">
          Thank you for your collaboration!<br>
          <strong>The Career Pilot Team</strong>
        </p>
      `;

      await resend.emails.send({
        from: "Career Pilot <noreply@careerpilot.it>",
        to: [data.associate.email],
        subject: `New request from ${clientName}`,
        html: getEmailTemplate(associateContent),
      });
      console.log(`Associate email sent to ${data.associate.email}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
