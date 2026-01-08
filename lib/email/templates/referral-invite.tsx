export interface ReferralInviteParams {
  recipientName?: string
  referrerName?: string
  referralLink: string
}

export function generateReferralInviteEmail(params: ReferralInviteParams): {
  html: string
  text: string
  subject: string
} {
  const { recipientName, referrerName, referralLink } = params
  const displayName = recipientName || "there"
  const referrerDisplay = referrerName || "a friend"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your friend thinks you'd love SSELFIE</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 40px 30px 20px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px; font-family: Georgia, serif; font-size: 28px; line-height: 32px; color: #1c1917; font-weight: 300;">
                ${referrerDisplay} thinks you'd love SSELFIE
              </h1>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #292524;">
                Hi ${displayName},
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px 40px 30px; text-align: center;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                ${referrerDisplay} sent you a special invitation to try SSELFIE Studio — and you're getting 25 free credits just for signing up.
              </p>
              <p style="margin: 0 0 24px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                SSELFIE helps you create professional photos that look like you, powered by AI. No photoshoots, no stress — just authentic content that feels like you.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${referralLink}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Claim Your 25 Free Credits →
                </a>
              </div>
              <p style="margin: 40px 0 0; font-size: 14px; line-height: 20px; color: #57534e;">
                You've got this,<br/>
                — Maya + The SSELFIE Studio Team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `
Hi ${displayName},

${referrerDisplay} sent you a special invitation to try SSELFIE Studio — and you're getting 25 free credits just for signing up.

SSELFIE helps you create professional photos that look like you, powered by AI. No photoshoots, no stress — just authentic content that feels like you.

Claim Your 25 Free Credits →: ${referralLink}

You've got this,
— Maya + The SSELFIE Studio Team
  `

  return {
    html,
    text,
    subject: `${referrerDisplay} thinks you'd love SSELFIE — here's 25 free credits!`,
  }
}
