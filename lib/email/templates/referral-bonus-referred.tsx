type ReferralBonusReferredParams = {
  recipientName?: string
  credits?: number
}

export function generateReferralBonusReferredEmail(params: ReferralBonusReferredParams): {
  html: string
  text: string
  subject: string
} {
  const { recipientName, credits = 25 } = params
  const displayName = recipientName || "there"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const studioUrl = `${siteUrl}/studio`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your bonus credits are in</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 40px 30px 20px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 28px; line-height: 32px; color: #1c1917; font-weight: 300;">
                Your bonus credits are in
              </h1>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #292524;">
                Hi ${displayName},
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px 40px 30px; text-align: center;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I just added your referral bonus credits to your account.
              </p>
              <p style="margin: 0 0 24px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                You now have <strong>${credits} extra credits</strong> waiting for you in SSELFIE.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${studioUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Open SSELFIE
                </a>
              </div>
              <p style="margin: 0; color: #57534e; font-size: 14px; line-height: 22px;">
                If anything looks off on your side, reply here and I'll fix it for you.
              </p>
              <p style="margin: 32px 0 0; font-size: 14px; line-height: 20px; color: #57534e;">
                Sandra
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

  const text = `Hi ${displayName},

I just added your referral bonus credits to your account.

You now have ${credits} extra credits waiting for you in SSELFIE.

Open SSELFIE: ${studioUrl}

If anything looks off on your side, reply here and I'll fix it for you.

Sandra`

  return {
    html,
    text,
    subject: "Your bonus credits are in",
  }
}
