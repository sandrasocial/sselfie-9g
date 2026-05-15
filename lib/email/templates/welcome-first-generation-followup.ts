const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
  .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
  .replace(/\/+$/, "")

export function generateWelcomeFirstGenerationFollowupEmail(input: {
  firstName?: string
  generatedImageUrl?: string | null
}) {
  const firstName = input.firstName?.trim() || "friend"

  const studioUrl = `${SITE_URL}/studio?utm_source=email&utm_medium=lifecycle&utm_campaign=free_welcome_day0`
  const upgradeUrl = `${SITE_URL}/checkout/membership?utm_source=email&utm_medium=lifecycle&utm_campaign=free_welcome_day0`

  const subject = "your 2 free photos are inside — try one now"

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:20px;">
        <table role="presentation" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">

          <tr>
            <td style="background:#0c0a09;padding:32px 24px;text-align:center;">
              <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:200;letter-spacing:0.3em;color:#fafaf9;text-transform:uppercase;">S S E L F I E</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#1c1917;">Hey ${firstName},</p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1c1917;">
                You signed up for SSELFIE — and you've got <strong>2 free photos waiting for you right now</strong>.
              </p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1c1917;">
                No photographer. No shoot. No setup. Just open Maya, describe what you want, and watch it generate a brand photo that actually looks like you.
              </p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#57534e;">
                It takes about 3 minutes. Most people can't believe the first result.
              </p>

              <div style="text-align:center;margin:32px 0;">
                <a href="${studioUrl}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:14px 36px;font-size:14px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;border-radius:8px;">
                  Generate my first photo &rarr;
                </a>
              </div>

              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#8a8780;text-align:center;">
                Your 2 free credits are already in your account.
              </p>

              <p style="margin:32px 0 0;font-size:15px;color:#1c1917;">XoXo Sandra</p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;background:#f5f5f5;border-top:1px solid #e7e5e4;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#8a8780;">SSELFIE Studio &mdash; sselfie.ai</p>
              <p style="margin:0;font-size:12px;color:#8a8780;">
                Want 200 photos/month? <a href="${upgradeUrl}" style="color:#57534e;">See Studio plans</a>
                &nbsp;&middot;&nbsp;
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#8a8780;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    `S S E L F I E`,
    ``,
    `Hey ${firstName},`,
    ``,
    `You signed up for SSELFIE — and you've got 2 free photos waiting for you right now.`,
    ``,
    `No photographer. No shoot. No setup. Just open Maya, describe what you want, and watch it generate a brand photo that actually looks like you.`,
    ``,
    `It takes about 3 minutes. Most people can't believe the first result.`,
    ``,
    `Generate my first photo: ${studioUrl}`,
    ``,
    `Your 2 free credits are already in your account.`,
    ``,
    `XoXo Sandra`,
    ``,
    `---`,
    `Want 200 photos/month? ${upgradeUrl}`,
    `Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`,
  ].join("\n")

  return { subject, html, text }
}
