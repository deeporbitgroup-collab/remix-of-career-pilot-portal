import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Email configuration
const envFrom = Deno.env.get("RESEND_FROM_EMAIL") || "";
const allowedTestRecipient = (Deno.env.get("RESEND_TEST_RECIPIENT") ?? "careerpilot2025@gmail.com").toLowerCase();
// Define test mode when no custom FROM is configured
const isTestMode = !envFrom;
const fromEmail = isTestMode ? "Career Pilot <noreply@careerpilot.it>" : envFrom;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AnnouncementEmailRequest {
  announcementId: string;
  title: string;
  content: string;
  recipientIds?: string[]; // If empty or not provided, send to all based on target_audience
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { announcementId, title, content, recipientIds }: AnnouncementEmailRequest = await req.json();

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get announcement attachments
    const { data: attachments, error: attachmentsError } = await supabase
      .from('announcement_attachments')
      .select('*')
      .eq('announcement_id', announcementId);

    if (attachmentsError) {
      console.warn('[send-announcement-email] Error fetching attachments:', attachmentsError);
    }

    // Download attachment files from storage
    const emailAttachments: Array<{ filename: string; content: string }> = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('announcements')
            .download(attachment.storage_path);

          if (downloadError) {
            console.error(`Failed to download attachment ${attachment.filename}:`, downloadError);
            continue;
          }

          // Convert blob to base64 in chunks to avoid stack overflow
          const arrayBuffer = await fileData.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          let binaryString = '';
          const chunkSize = 8192; // Process 8KB at a time

          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
            binaryString += String.fromCharCode(...Array.from(chunk));
          }

          const base64 = btoa(binaryString);
          
          emailAttachments.push({
            filename: attachment.filename,
            content: base64,
          });
          
          console.log(`[send-announcement-email] Successfully processed attachment: ${attachment.filename} (${uint8Array.length} bytes)`);
        } catch (error) {
          console.error(`Error processing attachment ${attachment.filename}:`, error);
        }
      }
    }

    console.log(`[send-announcement-email] Prepared ${emailAttachments.length} attachments for email`);

    // Only fetch announcement when broadcasting to all
    let announcementTarget: 'ASSOCIATE' | 'PARTNER' | 'BOTH' | null = null;
    if (!recipientIds || recipientIds.length === 0) {
      const { data: announcement, error: announcementError } = await supabase
        .from('announcements')
        .select('target_audience')
        .eq('id', announcementId)
        .single();

      if (announcementError) {
        console.warn('[send-announcement-email] announcement not found or not single, defaulting to BOTH', announcementError);
        announcementTarget = 'BOTH';
      } else {
        announcementTarget = announcement.target_audience as any;
      }
    }

    let recipients: { email: string; first_name: string; last_name: string }[] = [];

    if (recipientIds && recipientIds.length > 0) {
      // Send to specific recipients
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .in('id', recipientIds);

      if (profilesError) throw profilesError;
      recipients = profiles || [];
    } else {
      // Send to all based on target_audience
      let roleFilter: string[] = [];
      if (announcementTarget === 'ASSOCIATE') {
        roleFilter = ['ASSOCIATE'];
      } else if (announcementTarget === 'PARTNER') {
        roleFilter = ['PARTNER'];
      } else {
        roleFilter = ['ASSOCIATE', 'PARTNER'];
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .in('role', roleFilter)
        .eq('status', 'approved');

      if (profilesError) throw profilesError;
      recipients = profiles || [];
    }

    console.log(`Sending announcement to ${recipients.length} recipients`);

    // Handle Resend test mode: only allow sending to the verified test recipient
    let finalRecipients = recipients;
    let skippedCount = 0;
    if (isTestMode) {
      const filtered = recipients.filter(r => r.email?.toLowerCase() === allowedTestRecipient);
      skippedCount = recipients.length - filtered.length;
      finalRecipients = filtered.length > 0 ? filtered : [{ email: allowedTestRecipient, first_name: '', last_name: '' }];
    }

    console.log(`[send-announcement-email] isTestMode=${isTestMode} from=${fromEmail} requested=${recipients.length} sending=${finalRecipients.length} skipped=${skippedCount}`);

    // Send emails to all recipients
    const emailPromises = finalRecipients.map(async (recipient) => {
      try {
        const emailResponse = await resend.emails.send({
          from: `Career Pilot <${fromEmail}>`,
          to: [recipient.email],
          subject: `New Announcement: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Hi ${recipient.first_name || ''},</h1>
              <p style="color: #666;">The administrator has uploaded a new document for you.</p>

              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #333; margin-top: 0;">Subject: ${title}</h2>
                <p style="color: #666; white-space: pre-wrap;">${content}</p>
              </div>

              <p style="color: #666;">
                ${emailAttachments.length > 0
                  ? `The documents are attached to this email and you can download them directly.`
                  : `Log in to your private area to view the details.`}
              </p>

              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                This is an automated email, please do not reply.
              </p>
            </div>
          `,
          attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
        });

        if ((emailResponse as any)?.error) {
          console.error(`Resend error for ${recipient.email}:`, (emailResponse as any).error);
          return { success: false, email: recipient.email, error: (emailResponse as any).error };
        }
        console.log(`Email sent to ${recipient.email}:`, emailResponse);
        return { success: true, email: recipient.email };
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        return { success: false, email: recipient.email, error };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        testMode: isTestMode,
        fromEmail,
        allowedTestRecipient,
        requestedCount: recipients.length,
        sentCount: successCount,
        skippedCount,
        message: `Sent ${successCount} emails successfully, ${failureCount} failed${isTestMode ? ' (TEST MODE)' : ''}`,
        results
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-announcement-email function:", error);
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
