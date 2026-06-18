import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  senderRole: 'ADMIN' | 'ASSOCIATE';
  senderName: string;
  groupChatName: string;
  memberEmails?: string[]; // For admin messages
  memberNames?: string[]; // For admin messages
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { senderRole, senderName, groupChatName, memberEmails, memberNames }: NotificationRequest = await req.json();

    console.log("Sending group message notification:", { senderRole, senderName, groupChatName });

    if (senderRole === 'ASSOCIATE') {
      // Associate sent a message - notify admin AND all other members
      const emailPromises = [];
      
      // 1. Notify admin
      emailPromises.push(
        resend.emails.send({
          from: "Career Pilot <noreply@careerpilot.it>",
          to: ["careerpilot2025@gmail.com"],
          subject: `New message from ${senderName} in group ${groupChatName}`,
          html: `
            <h2>New message in group chat</h2>
            <p><strong>Chat:</strong> ${groupChatName}</p>
            <p><strong>From:</strong> ${senderName}</p>
            <p>You have received a new message in the group chat.</p>
            <p>Log in to your admin area to view it and reply.</p>
            <br>
            <p>Career Pilot Team</p>
          `,
        })
      );

      // 2. Notify all other members (if provided)
      if (memberEmails && memberEmails.length > 0) {
        memberEmails.forEach((email, index) => {
          const name = memberNames?.[index] || email;
          emailPromises.push(
            resend.emails.send({
              from: "Career Pilot <noreply@careerpilot.it>",
              to: [email],
              subject: `New message from ${senderName} in group ${groupChatName}`,
              html: `
                <h2>New message in group chat</h2>
                <p>Hi ${name},</p>
                <p><strong>Chat:</strong> ${groupChatName}</p>
                <p><strong>From:</strong> ${senderName}</p>
                <p>You have received a new message in the group chat.</p>
                <p>Log in to your personal area to view it and reply.</p>
                <br>
                <p>Career Pilot Team</p>
              `,
            })
          );
        });
      }

      const emailResponses = await Promise.allSettled(emailPromises);
      console.log("Emails sent:", emailResponses);
      
      return new Response(JSON.stringify({ 
        success: true, 
        results: emailResponses 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    } else {
      // Admin sent a message - notify all members
      if (!memberEmails || memberEmails.length === 0) {
        console.log("No members to notify");
        return new Response(JSON.stringify({ message: "No members to notify" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const emailPromises = memberEmails.map((email, index) => {
        const name = memberNames?.[index] || email;
        return resend.emails.send({
          from: "Career Pilot <noreply@careerpilot.it>",
          to: [email],
          subject: `New message from Career Pilot in group ${groupChatName}`,
          html: `
            <h2>New message from Career Pilot</h2>
            <p>Hi ${name},</p>
            <p><strong>Chat:</strong> ${groupChatName}</p>
            <p>You have received a new message in the group chat from the Career Pilot team.</p>
            <p>Log in to your personal area to view it and reply.</p>
            <br>
            <p>Career Pilot Team</p>
          `,
        });
      });

      const emailResponses = await Promise.allSettled(emailPromises);
      
      console.log("Emails sent to members:", emailResponses);

      return new Response(JSON.stringify({ 
        success: true, 
        results: emailResponses 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  } catch (error: any) {
    console.error("Error sending notification:", error);
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
