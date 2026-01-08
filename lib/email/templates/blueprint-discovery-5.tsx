/**
 * Blueprint Discovery Email 5
 * "Your free grid is ready — want to generate more?"
 * 
 * Discovery Funnel - Conversion
 * Only sent to users who engaged with Maya
 * Soft pitch for membership
 */

export interface BlueprintDiscovery5Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateBlueprintDiscovery5Email(params: BlueprintDiscovery5Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  // Generate UTM-tracked membership link
  const membershipLink = `${SITE_URL}/checkout/membership?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email5`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your free grid is ready — want to generate more?</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0c0a09; padding: 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Times New Roman', serif; font-size: 32px; font-weight: 200; letter-spacing: 0.3em; color: #fafaf9; text-transform: uppercase;">
                S S E L F I E
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Hey ${displayName},
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                You've tested the blueprint. You've met Maya. You've seen your free grid.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Now, imagine having this system working for you every single month.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                With <strong>SSELFIE Studio Membership</strong>, you get:
              </p>
              
              <ul style="margin: 0 0 16px 20px; padding: 0; color: #1c1917; font-size: 16px; line-height: 1.8;">
                <li style="margin-bottom: 12px;">Fresh brand photos every month (100+ images)</li>
                <li style="margin-bottom: 12px;">Unlimited Maya chat and planning</li>
                <li style="margin-bottom: 12px;">Feed planner access</li>
                <li style="margin-bottom: 12px;">Caption generation and strategy docs</li>
                <li style="margin-bottom: 0;">Everything you need to stay visible, consistently</li>
              </ul>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                No more wondering what to post. No more feeling invisible. Just you, your style, and a system that works.
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Ready to make this your reality?
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${membershipLink}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  See Studio membership →
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                You've already seen what's possible. Now make it permanent.
              </p>

              <p style="margin: 24px 0 0; font-size: 16px; color: #1c1917;">
                XoXo Sandra 💋
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f5f5f4; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                SSELFIE Studio - Where Visibility Meets Financial Freedom
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #78716c; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `S S E L F I E

Hey ${displayName},

You've tested the blueprint. You've met Maya. You've seen your free grid.

Now, imagine having this system working for you every single month.

With SSELFIE Studio Membership, you get:
• Fresh brand photos every month (100+ images)
• Unlimited Maya chat and planning
• Feed planner access
• Caption generation and strategy docs
• Everything you need to stay visible, consistently

No more wondering what to post. No more feeling invisible. Just you, your style, and a system that works.

Ready to make this your reality?

See Studio membership →: ${membershipLink}

You've already seen what's possible. Now make it permanent.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "Your free grid is ready — want to generate more?",
  }
}
