import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeselectRequest {
  companyId: string;
  studentId: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { companyId, studentId }: DeselectRequest = await req.json();

    console.log("Deselecting student:", { companyId, studentId });

    if (!companyId || !studentId) {
      return new Response(
        JSON.stringify({ error: "companyId and studentId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) Delete the selection record (unchanged core behaviour).
    const { error: deleteError } = await supabase
      .from('company_selected_students')
      .delete()
      .eq('company_id', companyId)
      .eq('student_id', studentId);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      throw deleteError;
    }

    // 2) Clean up the stale selection notifications for THIS company-student pair,
    //    so the student's "Interested Companies" never lingers and the admin feed is
    //    tidy. Non-fatal: a cleanup failure must not block the deselection.
    try {
      // COMPANY_INTEREST notification shown to the student (user_id = studentId)
      await supabase
        .from('talent_pool_notifications')
        .delete()
        .eq('user_id', studentId)
        .eq('type', 'COMPANY_INTEREST')
        .eq('data->>companyId', companyId);

      // Admin-wide STUDENT_SELECTED notification (user_id IS NULL)
      await supabase
        .from('talent_pool_notifications')
        .delete()
        .is('user_id', null)
        .eq('type', 'STUDENT_SELECTED')
        .eq('data->>companyId', companyId)
        .eq('data->>studentId', studentId);
    } catch (cleanupErr) {
      console.error("Notification cleanup error (non-fatal):", cleanupErr);
    }

    // 3) Resolve names for the admin email (non-fatal — fall back to generics).
    let companyName = "A company";
    let studentName = "a student";
    try {
      const { data: comp } = await supabase
        .from('company_profiles')
        .select('company_name')
        .eq('user_id', companyId)
        .maybeSingle();
      if (comp?.company_name) companyName = comp.company_name;

      const { data: stu } = await supabase
        .from('student_profiles')
        .select('first_name, last_name')
        .eq('user_id', studentId)
        .maybeSingle();
      if (stu) {
        const full = `${stu.first_name ?? ''} ${stu.last_name ?? ''}`.trim();
        if (full) studentName = full;
      }
    } catch (lookupErr) {
      console.error("Name lookup error (non-fatal):", lookupErr);
    }

    // 4) Notify the ADMIN only. By design we DO NOT email the student about a
    //    withdrawn interest (no discouraging message). Non-fatal on failure.
    try {
      await resend.emails.send({
        from: "Career Pilot Talent Pool <noreply@careerpilot.it>",
        to: ["careerpilot2025@gmail.com"],
        subject: `Selection withdrawn: ${companyName} → ${studentName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #334155;">
            <h2 style="color: #1e3a8a;">Selection withdrawn</h2>
            <p><strong>${companyName}</strong> has withdrawn its interest in <strong>${studentName}</strong>.</p>
            <p style="font-size: 14px; color: #64748b;">The student has been removed from the company's selected list. No email was sent to the student.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Admin email error (non-fatal):", emailErr);
    }

    console.log("Student deselected successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Student deselected successfully"
      }),
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
