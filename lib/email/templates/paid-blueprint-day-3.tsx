export interface PaidBlueprintDay3Params {
  firstName?: string
  email: string
  accessToken: string
}

export const PAID_BLUEPRINT_DAY3_SUBJECT = "Quick check-in: did you post your first one yet?"

export function generatePaidBlueprintDay3Email(params: PaidBlueprintDay3Params): {
  html: string
  text: string
} {
  const { firstName, email, accessToken } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  // Generate tracked link to paid blueprint page
  const paidBlueprintUrl = `${siteUrl}/blueprint/paid?access=${accessToken}&utm_source=email&utm_medium=email&utm_campaign=paid_blueprint&utm_content=day3`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quick Check-In: How Did It Go?</title>
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
                Quick Check-In: How Did It Go?
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
                It's been a few days since you got your photos. Quick question: did you post your first one yet?
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                If yes - amazing! Keep going. Post another one this week. Consistency is what builds your brand.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                If not - no judgment at all. But here's the thing: your photos are ready RIGHT NOW. You don't need to wait for the perfect moment, the perfect caption, or the perfect day. Just pick one and post it.
              </p>
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "Done is better than perfect. Your first post doesn't have to be your best post - it just has to be your first."
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  - Sandra
                </p>
              </div>
              
              <p style="margin: 24px 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                You have 30 photos ready to use. That's 30 opportunities to show up and build your brand. Don't let them go to waste.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${paidBlueprintUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  View My Photos →
                </a>
              </div>
              
              <p style="margin: 24px 0 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                <strong>P.S.</strong> If you already posted - reply and tell me how it went! I love hearing from you.
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

Quick Check-In: How Did It Go?

Hey ${displayName},

It's been a few days since you got your photos. Quick question: did you post your first one yet?

If yes - amazing! Keep going. Post another one this week. Consistency is what builds your brand.

If not - no judgment at all. But here's the thing: your photos are ready RIGHT NOW. You don't need to wait for the perfect moment, the perfect caption, or the perfect day. Just pick one and post it.

"Done is better than perfect. Your first post doesn't have to be your best post - it just has to be your first."
- Sandra

You have 30 photos ready to use. That's 30 opportunities to show up and build your brand. Don't let them go to waste.

View My Photos →: ${paidBlueprintUrl}

P.S. If you already posted - reply and tell me how it went! I love hearing from you.

Questions? Just reply to this email - I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
