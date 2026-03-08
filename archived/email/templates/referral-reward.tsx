export interface ReferralRewardParams {
  firstName?: string
  creditsAwarded: number
  referredUserName?: string
}

export function generateReferralRewardEmail(params: ReferralRewardParams): {
  html: string
  text: string
  subject: string
} {
  const { firstName, creditsAwarded, referredUserName } = params
  const displayName = firstName || "there"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const studioUrl = `${siteUrl}/studio`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You just earned ${creditsAwarded} bonus credits 🎉</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 40px 30px 20px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px; font-family: Georgia, serif; font-size: 28px; line-height: 32px; color: #1c1917; font-weight: 300;">
                You just earned ${creditsAwarded} bonus credits 🎉
              </h1>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #292524;">
                Hi ${displayName},
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px 40px 30px; text-align: center;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                ${referredUserName ? `Great news! ${referredUserName} just signed up using your referral link.` : "Great news! Someone just signed up using your referral link."}
              </p>
              <p style="margin: 0 0 24px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                As a thank you for sharing SSELFIE, we've added ${creditsAwarded} bonus credits to your account. Keep sharing to earn more!
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${studioUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Go to The Studio →
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

${referredUserName ? `Great news! ${referredUserName} just signed up using your referral link.` : "Great news! Someone just signed up using your referral link."}

As a thank you for sharing SSELFIE, we've added ${creditsAwarded} bonus credits to your account. Keep sharing to earn more!

Go to The Studio →: ${studioUrl}

You've got this,
— Maya + The SSELFIE Studio Team
  `

  return {
    html,
    text,
    subject: `You just earned ${creditsAwarded} bonus credits for sharing SSELFIE 🎉`,
  }
}
