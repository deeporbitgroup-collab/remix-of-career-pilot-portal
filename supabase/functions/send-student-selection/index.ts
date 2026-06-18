import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Career Pilot URLs - NEVER use Lovable URLs
const STUDENT_DASHBOARD = "https://careerpilot.it/talent-pool/student/dashboard";
const TALENT_POOL_ADMIN = "https://careerpilot.it/talent-pool/admin";
const ADMIN_EMAIL = "careerpilot2025@gmail.com";

interface SelectionRequest {
  companyId: string;
  studentId: string;
  companyName: string;
  companyEmail: string;
  studentName: string;
  studentEmail: string;
}

const getEmailTemplate = (content: string, gradient: string = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)") => `
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
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Have questions? Contact us:</p>
              <p style="margin: 0; color: #1e3a8a; font-size: 14px; font-weight: 600;">careerpilot2025@gmail.com</p>
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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { companyId, studentId, companyName, companyEmail, studentName, studentEmail }: SelectionRequest = await req.json();

    // Resolve company and student details from DB
    const { data: companyProf } = await supabase
      .from('company_profiles')
      .select('company_name, reference_email')
      .eq('user_id', companyId)
      .single();

    const { data: companyUser } = await supabase
      .from('talent_pool_users')
      .select('email')
      .eq('id', companyId)
      .single();

    const resolvedCompanyName = companyProf?.company_name || companyName;
    const resolvedCompanyEmail = companyProf?.reference_email || companyEmail || companyUser?.email || '';

    const { data: studentProf } = await supabase
      .from('student_profiles')
      .select('first_name, last_name')
      .eq('user_id', studentId)
      .single();

    const { data: studentUser } = await supabase
      .from('talent_pool_users')
      .select('email')
      .eq('id', studentId)
      .single();

    const resolvedStudentName = studentProf ? `${studentProf.first_name} ${studentProf.last_name}` : (studentName || '');
    const resolvedStudentEmail = studentEmail || studentUser?.email || '';

    const timestamp = new Date().toLocaleString('en-GB', { 
      timeZone: 'Europe/Rome',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    // Check for duplicate selection
    const { data: existingSelection } = await supabase
      .from('company_selected_students')
      .select('id')
      .eq('company_id', companyId)
      .eq('student_id', studentId)
      .single();

    if (existingSelection) {
      return new Response(
        JSON.stringify({ error: "Student already selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert selection record
    const { error: insertError } = await supabase
      .from('company_selected_students')
      .insert({
        company_id: companyId,
        student_id: studentId,
        selected_at: new Date().toISOString()
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    // CELEBRATORY Email to student (EN) 🎉
    const studentContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #fef3c7; border-radius: 50%; padding: 20px;">
          <span style="font-size: 64px;">🎉</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #d97706; font-size: 28px; font-weight: 700; text-align: center;">Good News!</h2>
      <h3 style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 20px; font-weight: 600; text-align: center;">A company is interested in you!</h3>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Dear <strong>${resolvedStudentName}</strong>,
      </p>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        This is a major milestone in your career journey! <strong>${resolvedCompanyName}</strong> has selected you from the Talent Pool, expressing interest in your profile.
      </p>
      
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
        <p style="margin: 0; color: #92400e; font-size: 18px; font-weight: 600;">
          🌟 You're One Step Closer to Your Dream Opportunity!
        </p>
      </div>
      
      <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 12px 12px 0;">
        <p style="margin: 0; color: #1e40af; font-size: 15px; font-weight: 500;">
          📋 What happens next?
        </p>
        <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; line-height: 1.6;">
          The Career Pilot team and the company will define the next steps together. This could lead to an interview, assessment, or even a direct hiring opportunity!
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${STUDENT_DASHBOARD}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
          View Your Talent Pool Status
        </a>
      </div>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Congratulations again!<br>
        <strong style="color: #1e3a8a;">The Career Pilot Team</strong>
      </p>
    `;

    const { error: studentEmailError } = await resend.emails.send({
      from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
      to: [resolvedStudentEmail],
      bcc: [ADMIN_EMAIL], // admin monitors every selection message (private copy)
      subject: `Good news! A company is interested in you 🎉`,
      html: getEmailTemplate(studentContent, "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"),
    });

    if (studentEmailError) {
      console.error("Student email error:", studentEmailError);
    }

    // Email to company (confirmation)
    const companyContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dcfce7; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">✅</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #16a34a; font-size: 24px; font-weight: 600; text-align: center;">Selection Confirmed!</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        You have successfully expressed interest in <strong>${resolvedStudentName}</strong>.
      </p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Selected Student:</strong> ${resolvedStudentName}</p>
        <p style="margin: 8px 0;"><strong>Selection Time:</strong> ${timestamp}</p>
      </div>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Our team will contact you shortly to discuss the next steps in your recruiting process.
      </p>
      
      <p style="margin: 30px 0 0 0; color: #334155; font-size: 16px; line-height: 1.6;">
        Best regards,<br>
        <strong style="color: #16a34a;">The Career Pilot Team</strong>
      </p>
    `;

    const { error: companyEmailError } = await resend.emails.send({
      from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
      to: [resolvedCompanyEmail],
      bcc: [ADMIN_EMAIL], // admin monitors every selection message (private copy)
      subject: `Selection confirmed: ${resolvedStudentName}`,
      html: getEmailTemplate(companyContent, "linear-gradient(135deg, #16a34a 0%, #15803d 100%)"),
    });

    if (companyEmailError) {
      console.error("Company email error:", companyEmailError);
    }

    // Email to admin
    const adminContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; background-color: #dbeafe; border-radius: 50%; padding: 20px;">
          <span style="font-size: 48px;">📩</span>
        </div>
      </div>
      
      <h2 style="margin: 0 0 20px 0; color: #1e3a8a; font-size: 24px; font-weight: 600; text-align: center;">New Student Selected</h2>
      
      <p style="margin: 0 0 20px 0; color: #334155; font-size: 16px; line-height: 1.6;">
        A company has expressed interest in a student from the Talent Pool.
      </p>
      
      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>Company:</strong> ${resolvedCompanyName}</p>
        <p style="margin: 8px 0;"><strong>Student:</strong> ${resolvedStudentName}</p>
        <p style="margin: 8px 0;"><strong>Selection Time:</strong> ${timestamp}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${TALENT_POOL_ADMIN}" style="display: inline-block; background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-size: 16px; font-weight: 600;">
          Review Selection
        </a>
      </div>
    `;

    const { error: adminEmailError } = await resend.emails.send({
      from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
      to: ["careerpilot2025@gmail.com"],
      subject: `New Student Selection - ${resolvedCompanyName} → ${resolvedStudentName}`,
      html: getEmailTemplate(adminContent),
    });

    if (adminEmailError) {
      console.error("Admin email error:", adminEmailError);
    }

    // Create notifications
    await supabase.from('talent_pool_notifications').insert([
      {
        user_id: null,
        type: 'STUDENT_SELECTED',
        title: 'New Student Selection',
        message: `${resolvedCompanyName} selected ${resolvedStudentName}`,
        data: { companyId, studentId, companyName: resolvedCompanyName, studentName: resolvedStudentName, timestamp }
      },
      {
        user_id: studentId,
        type: 'COMPANY_INTEREST',
        title: 'Company Interest',
        message: `${resolvedCompanyName} has selected you from the Talent Pool`,
        data: { companyId, companyName: resolvedCompanyName, timestamp }
      }
    ]);

    console.log("Selection processed successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Student selected successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
