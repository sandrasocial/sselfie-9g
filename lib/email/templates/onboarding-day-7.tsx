// Onboarding Email Sequence (Accurate Copy)
export interface OnboardingDay7Params {
  firstName?: string
}

export function generateOnboardingDay7Email(params: OnboardingDay7Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName } = params
  const displayName = firstName || "there"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const photoshootUrl = `${siteUrl}/studio/photoshoot`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Keep Your Visibility Momentum</title>
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
                It's been a week since you joined The Studio — and this is your reminder that visibility is a practice, not perfection.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Here's your quick check-in:
              </p>
              
              <table role="presentation" style="width: 100%; margin: 16px 0 24px;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                      ✅ Have you done your first photoshoot?
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                      ✅ Shared one new post or story?
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                      ✅ Looked at your feed and thought, "That's really me"?
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                If not, now's the time.<br>
                You can create a new shoot anytime — it only takes a few minutes.
              </p>
              
              <p style="margin: 0 0 24px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Keep going — you're becoming the face of your brand, one post at a time.
              </p>
              
              <p style="margin: 0; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                — Maya + The Studio Team
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="${photoshootUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 400; letter-spacing: 0.1em; text-transform: uppercase;">
                Create a new shoot
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6;">
                Questions? Just reply to this email — I read every message.
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

It's been a week since you joined The Studio — and this is your reminder that visibility is a practice, not perfection.

Here's your quick check-in:
✅ Have you done your first photoshoot?
✅ Shared one new post or story?
✅ Looked at your feed and thought, "That's really me"?

If not, now's the time.
You can create a new shoot anytime — it only takes a few minutes.

Keep going — you're becoming the face of your brand, one post at a time.

— Maya + The Studio Team

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Just reply to this email — I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { 
    html, 
    text, 
    subject: "You're building your brand beautifully — keep showing up"
  }
}
