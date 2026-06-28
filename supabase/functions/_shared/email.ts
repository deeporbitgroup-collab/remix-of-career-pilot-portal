// Shared, branded email building blocks for Career Pilot transactional emails.
// Keeps every new email visually consistent (same header/footer as the existing
// payment-confirmation email) and gives us one place for the CTA button style.

export const FROM = "Career Pilot <noreply@careerpilot.it>";
export const ADMIN_EMAIL = "careerpilot2025@gmail.com";

export const siteUrl = (): string =>
  (typeof Deno !== "undefined" && Deno.env.get("PUBLIC_SITE_URL")) || "https://careerpilot.it";

export const orderRef = (orderId: string): string => `CP-${orderId.slice(0, 8).toUpperCase()}`;

/** Full HTML document wrapper (navy header + light card + footer). */
export const emailLayout = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <tr><td>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); border-radius: 16px 16px 0 0;">
        <tr><td style="padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Career Pilot</h1>
          <p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 14px;">Your Flight Plan to Success</p>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
        <tr><td style="padding: 40px 30px;">${content}</td></tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
        <tr><td style="padding: 30px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Have questions? Contact us:</p>
          <p style="margin: 0; color: #1a365d; font-size: 14px; font-weight: 600;">${ADMIN_EMAIL}</p>
          <p style="margin: 20px 0 0 0; color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} Career Pilot. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

/** Centered call-to-action button. */
export const emailButton = (href: string, label: string): string => `
  <div style="text-align: center; margin: 32px 0;">
    <a href="${href}" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: #ffffff; text-decoration: none; padding: 16px 44px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(26, 54, 93, 0.4);">
      ${label}
    </a>
  </div>
`;

/** Colored highlight box (e.g. a "payment required" callout). */
export const emailCallout = (
  text: string,
  variant: "info" | "warning" | "success" = "info"
): string => {
  const colors = {
    info: { bg: "#f0f9ff", border: "#3b82f6", title: "#1e40af" },
    warning: { bg: "#fffbeb", border: "#f59e0b", title: "#b45309" },
    success: { bg: "#f0fdf4", border: "#22c55e", title: "#166534" },
  }[variant];
  return `
  <div style="background-color: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 20px; margin: 24px 0; border-radius: 0 12px 12px 0;">
    <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.6;">${text}</p>
  </div>`;
};
