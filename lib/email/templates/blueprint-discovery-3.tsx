/**
 * Blueprint Discovery Email 3
 * "Meet Maya — your AI creative director."
 * 
 * Discovery Funnel - Introduce Maya
 * Only sent to users who generated grid
 * Encourages signup to try Maya chat
 */

export interface BlueprintDiscovery3Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateBlueprintDiscovery3Email(params: BlueprintDiscovery3Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  // Generate UTM-tracked studio link
  const studioLink = `${SITE_URL}/studio?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email3`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meet Maya — your AI creative director.</title>
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
                You've seen your blueprint. You've seen your grid.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Now, meet <strong>Maya</strong> — your AI creative director.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Maya is like having a personal stylist, content strategist, and brand photographer all in one. She helps you plan your feed, write captions, and create the content that builds your brand.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's the best part: <strong>You can chat with Maya for free</strong> — no credits needed for planning, strategy, or captions.
              </p>
              
              <div style="background-color: #fafaf9; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #1c1917;">
                <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #1c1917; font-weight: 500;">
                  Try Maya free:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #57534e; font-size: 15px; line-height: 1.8;">
                  <li style="margin-bottom: 8px;">Chat about your brand strategy</li>
                  <li style="margin-bottom: 8px;">Plan your Instagram feed</li>
                  <li style="margin-bottom: 8px;">Get caption ideas and templates</li>
                  <li style="margin-bottom: 0;">Create content strategies</li>
                </ul>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Think of Maya as your creative best friend — always ready to help, always on brand.
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Sign up (it's free) and start chatting with Maya today.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${studioLink}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Try Maya free →
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                No credit card needed. Just sign up and start chatting.
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

You've seen your blueprint. You've seen your grid.

Now, meet Maya — your AI creative director.

Maya is like having a personal stylist, content strategist, and brand photographer all in one. She helps you plan your feed, write captions, and create the content that builds your brand.

Here's the best part: You can chat with Maya for free — no credits needed for planning, strategy, or captions.

Try Maya free:
• Chat about your brand strategy
• Plan your Instagram feed
• Get caption ideas and templates
• Create content strategies

Think of Maya as your creative best friend — always ready to help, always on brand.

Sign up (it's free) and start chatting with Maya today.

Try Maya free →: ${studioLink}

No credit card needed. Just sign up and start chatting.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "Meet Maya — your AI creative director.",
  }
}
