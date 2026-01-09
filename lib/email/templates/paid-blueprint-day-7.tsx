export interface PaidBlueprintDay7Params {
  firstName?: string
  email: string
  accessToken: string
}

export const PAID_BLUEPRINT_DAY7_SUBJECT = "Want unlimited content? Creator Studio is the shortcut"

export function generatePaidBlueprintDay7Email(params: PaidBlueprintDay7Params): {
  html: string
  text: string
} {
  const { firstName, email, accessToken } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  // Generate tracked links
  const paidBlueprintUrl = `${siteUrl}/blueprint/paid?access=${accessToken}&utm_source=email&utm_medium=email&utm_campaign=paid_blueprint&utm_content=day7`
  // Link to Studio membership checkout (confirmed route exists: /checkout/membership)
  const studioUrl = `${siteUrl}/checkout/membership?utm_source=email&utm_medium=email&utm_campaign=paid_blueprint&utm_content=day7&product=studio_membership`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Want Unlimited Content? Creator Studio is the Shortcut</title>
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
              <h2 style="margin: 0; color: #292524; font-size: 24px; font-weight: 300; line-height: 1.4; font-family: Georgia, serif;">
                Want Unlimited Content? Creator Studio is the Shortcut
              </h2>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Hey ${displayName},
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                You've had your 30 photos for a week now. How's it going? Are you posting consistently? Are you running out of photos already?
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                If you're loving the results but need MORE content, I want to introduce you to SSELFIE Studio. It's like your paid blueprint, but unlimited.
              </p>
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "I went from struggling to post once a week to having enough content for 3 months. Studio changed everything."
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  - Sarah, SSELFIE Studio Member
                </p>
              </div>
              
              <p style="margin: 24px 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Here's what Studio gives you:
              </p>
              
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.8;">
                <li style="margin-bottom: 12px;">Unlimited photoshoots (no limits, ever)</li>
                <li style="margin-bottom: 12px;">100+ images per month</li>
                <li style="margin-bottom: 12px;">Feed planning & strategy tools</li>
                <li style="margin-bottom: 12px;">New caption templates every month</li>
                <li style="margin-bottom: 12px;">Cancel anytime - no commitment</li>
              </ul>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                For $97/month, you get unlimited content that actually looks like you. No more running out of photos. No more scrambling for content. Just consistent, professional photos whenever you need them.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${studioUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Join SSELFIE Studio - $97/mo →
                </a>
              </div>
              
              <div style="background-color: #fafaf9; padding: 20px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 400; line-height: 1.7;">
                  Not ready for Studio? That's totally okay. Keep using your 30 photos - they're yours forever.
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6;">
                  <a href="${paidBlueprintUrl}" style="color: #292524; text-decoration: underline;">View your photos →</a>
                </p>
              </div>
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

Want Unlimited Content? Creator Studio is the Shortcut

Hey ${displayName},

You've had your 30 photos for a week now. How's it going? Are you posting consistently? Are you running out of photos already?

If you're loving the results but need MORE content, I want to introduce you to SSELFIE Studio. It's like your paid blueprint, but unlimited.

"I went from struggling to post once a week to having enough content for 3 months. Studio changed everything."
- Sarah, SSELFIE Studio Member

Here's what Studio gives you:

• Unlimited photoshoots (no limits, ever)
• 100+ images per month
• Feed planning & strategy tools
• New caption templates every month
• Cancel anytime - no commitment

For $97/month, you get unlimited content that actually looks like you. No more running out of photos. No more scrambling for content. Just consistent, professional photos whenever you need them.

Join SSELFIE Studio - $97/mo →: ${studioUrl}

Not ready for Studio? That's totally okay. Keep using your 30 photos - they're yours forever.

View your photos →: ${paidBlueprintUrl}

Questions? Just reply to this email - I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
