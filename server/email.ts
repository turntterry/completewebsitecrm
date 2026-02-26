/**
 * Email utility using Resend API.
 * All email sending for the app goes through this module.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Using Resend's built-in verified domain. To send from exteriorexperts.co,
// verify that domain in the Resend dashboard and update this line.
const FROM_EMAIL = "Exterior Experts <onboarding@resend.dev>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("[email] RESEND_API_KEY is not set");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend API error:", res.status, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Failed to send email:", err);
    return false;
  }
}

/** Build the magic-link email HTML */
export function buildMagicLinkEmail(opts: {
  customerName: string;
  magicLinkUrl: string;
  companyName: string;
  context?: "quote" | "invoice" | "general";
}): { html: string; text: string } {
  const { customerName, magicLinkUrl, companyName, context = "general" } = opts;

  const contextLine =
    context === "quote"
      ? "You have a new quote ready for your review."
      : context === "invoice"
        ? "You have an invoice ready for your review."
        : "You can view your quotes, invoices, and job history in your client portal.";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Client Portal Link</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                ${companyName}
              </h1>
              <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">Client Portal</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;color:#64748b;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Hello, ${customerName}</p>
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:24px;font-weight:700;">Your portal link is ready</h2>
              <p style="margin:0 0 32px;color:#475569;font-size:16px;line-height:1.6;">${contextLine}</p>
              <a href="${magicLinkUrl}"
                 style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:-0.2px;">
                Open Client Portal →
              </a>
              <p style="margin:32px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">
                This link expires in <strong>48 hours</strong> and can only be used once.<br/>
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                Sent by ${companyName} · Powered by Exterior Experts CRM
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Hello ${customerName},

${contextLine}

Click the link below to access your client portal:
${magicLinkUrl}

This link expires in 48 hours and can only be used once.

— ${companyName}
  `.trim();

  return { html, text };
}
