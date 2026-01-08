/**
 * Blueprint Discovery Email 1
 * "Remember the selfie guide? Here's what's next."
 * 
 * Discovery Funnel - Entry Point
 * Introduces Brand Blueprint as free way to test the system
 */

export interface BlueprintDiscovery1Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateBlueprintDiscovery1Email(params: BlueprintDiscovery1Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  // Generate UTM-tracked blueprint link
  const blueprintLink = `${SITE_URL}/blueprint?utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email1`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remember the selfie guide? Here's what's next.</title>
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
                Remember when you downloaded my selfie guide?
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                I've been building something that makes those selfie skills even easier.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                It's called <strong>Brand Blueprint</strong> — a free tool that creates your personalized content strategy in minutes.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Answer a few quick questions, and you'll get:
              </p>
              
              <ul style="margin: 0 0 16px 20px; padding: 0; color: #1c1917; font-size: 16px; line-height: 1.8;">
                <li style="margin-bottom: 12px;">Your personalized 30-day content calendar</li>
                <li style="margin-bottom: 12px;">A free Instagram grid preview (9 photos)</li>
                <li style="margin-bottom: 12px;">30 caption templates tailored to your brand</li>
                <li style="margin-bottom: 12px;">Your visibility score and improvement plan</li>
              </ul>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                No credit card. No commitment. Just a free way to see what's possible.
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Think of it as your personal brand roadmap — created just for you.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${blueprintLink}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Get your free blueprint →
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                Takes about 10 minutes. You'll love what you see.
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

Remember when you downloaded my selfie guide?

I've been building something that makes those selfie skills even easier.

It's called Brand Blueprint — a free tool that creates your personalized content strategy in minutes.

Answer a few quick questions, and you'll get:
• Your personalized 30-day content calendar
• A free Instagram grid preview (9 photos)
• 30 caption templates tailored to your brand
• Your visibility score and improvement plan

No credit card. No commitment. Just a free way to see what's possible.

Think of it as your personal brand roadmap — created just for you.

Get your free blueprint →: ${blueprintLink}

Takes about 10 minutes. You'll love what you see.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "Remember the selfie guide? Here's what's next.",
  }
}
