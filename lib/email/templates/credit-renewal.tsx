export interface CreditRenewalParams {
  firstName?: string
  creditsGranted: number
}

export function generateCreditRenewalEmail(params: CreditRenewalParams): {
  html: string
  text: string
  subject: string
} {
  const { firstName, creditsGranted } = params
  const displayName = firstName || "there"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const studioUrl = `${siteUrl}/studio`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your monthly SSELFIE credits are here 🎉</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 28px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif;">
                S S E L F I E
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Hi ${displayName},
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Your monthly SSELFIE credits have just been added to your account.
              </p>
              
              <!-- Credit Box -->
              <div style="background-color: #1c1917; border-radius: 12px; padding: 32px; margin: 24px 0; text-align: center;">
                <p style="margin: 0 0 12px; color: #fafaf9; font-size: 13px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase;">
                  CREDITS ADDED
                </p>
                <h2 style="margin: 0 0 16px; color: #fafaf9; font-size: 36px; font-weight: 300; line-height: 1.2;">
                  ${creditsGranted} Credits
                </h2>
                <p style="margin: 0; color: #d6d3d1; font-size: 15px; font-weight: 300; line-height: 1.6;">
                  Ready for your next photoshoot
                </p>
              </div>
              
              <p style="margin: 24px 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                That means it's the perfect time for a new photoshoot or content drop. Your credits are waiting in The Studio.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${studioUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Go to The Studio →
                </a>
              </div>
              
              <p style="margin: 24px 0 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                P.S. These credits don't roll over, so use them while you have them. Time to create something beautiful.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6;">
                Questions? Just reply to this email - I read every message.
              </p>
              <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                XoXo Sandra 💋
              </p>
              <p style="margin: 16px 0 0; color: #a8a29e; font-size: 11px; font-weight: 300;">
                © ${new Date().getFullYear()} SSELFIE. All rights reserved.
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
S S E L F I E

Hi ${displayName},

Your monthly SSELFIE credits have just been added to your account.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREDITS ADDED

${creditsGranted} Credits
Ready for your next photoshoot
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

That means it's the perfect time for a new photoshoot or content drop. Your credits are waiting in The Studio.

Go to The Studio →: ${studioUrl}

P.S. These credits don't roll over, so use them while you have them. Time to create something beautiful.

Questions? Just reply to this email - I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return {
    html,
    text,
    subject: "Your monthly SSELFIE credits are here 🎉",
  }
}
