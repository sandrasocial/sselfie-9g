const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const APP_URL = `${SITE_URL}/app`

export interface MonthlyUsageRecapParams {
  firstName?: string
  creditsUsed?: number
  creditsRemaining?: number
  photosGenerated?: number
}

export function generateMonthlyUsageRecapEmail(params: MonthlyUsageRecapParams = {}) {
  const firstName = params.firstName && params.firstName !== "friend" ? params.firstName : "friend"
  const creditsUsed = Number(params.creditsUsed || 0)
  const creditsRemaining = Number(params.creditsRemaining || 0)
  const photosGenerated = Number(params.photosGenerated || 0)

  const subject = "Your month in SSELFIE"

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;font-family:Inter,Arial,sans-serif;background:#fafaf9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#fff;border:1px solid #e7e5e4;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:32px 24px;background:#0c0a09;color:#fafaf9;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;">SSELFIE</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px;">
              <p style="margin:0 0 14px;font-size:16px;color:#1c1917;line-height:1.5;">Hey ${firstName},</p>
              <p style="margin:0 0 10px;font-size:16px;color:#1c1917;line-height:1.5;"><strong>This works.</strong></p>
              <p style="margin:0 0 18px;font-size:16px;color:#1c1917;line-height:1.5;">Here is your month in the SUITE.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;">
                <tr>
                  <td style="padding:12px;border:1px solid #e7e5e4;">
                    <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8780;">Photos generated</div>
                    <div style="font-size:28px;color:#1c1917;line-height:1.2;">${photosGenerated}</div>
                  </td>
                  <td style="padding:12px;border:1px solid #e7e5e4;">
                    <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8780;">Credits used</div>
                    <div style="font-size:28px;color:#1c1917;line-height:1.2;">${creditsUsed}</div>
                  </td>
                  <td style="padding:12px;border:1px solid #e7e5e4;">
                    <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#8a8780;">Credits left</div>
                    <div style="font-size:28px;color:#1c1917;line-height:1.2;">${creditsRemaining}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 10px;font-size:16px;color:#1c1917;line-height:1.5;"><strong>Here&apos;s what I&apos;d do next:</strong></p>
              <ul style="margin:0 0 18px;padding-left:20px;color:#1c1917;font-size:16px;line-height:1.6;">
                <li>Generate 3 fresh looks this week.</li>
                <li>Pick 1 and post it today.</li>
                <li>Keep it simple and stay visible.</li>
              </ul>

              <p style="margin:0 0 18px;font-size:16px;color:#1c1917;line-height:1.5;">No pressure. You&apos;ve got this.</p>

              <div style="margin:0 0 6px;">
                <a href="${APP_URL}" style="display:inline-block;padding:12px 20px;background:#1c1917;color:#fafaf9;text-decoration:none;border-radius:8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;">Open the SUITE</a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px;border-top:1px solid #e7e5e4;background:#f5f5f5;">
              <p style="margin:0;font-size:12px;color:#8a8780;">SSELFIE</p>
              <p style="margin:8px 0 0;font-size:12px;color:#8a8780;"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#8a8780;text-decoration:underline;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Hey ${firstName},

This works.
Here is your month in the SUITE.

Photos generated: ${photosGenerated}
Credits used: ${creditsUsed}
Credits left: ${creditsRemaining}

Here's what I'd do next:
- Generate 3 fresh looks this week.
- Pick 1 and post it today.
- Keep it simple and stay visible.

No pressure. You've got this.

Open the SUITE: ${APP_URL}
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    subject,
    html,
    text,
  }
}
