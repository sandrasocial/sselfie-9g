/**
 * Reactivation Day 7 Email Template
 * "Real photos. Real you. No filters."
 * 
 * Phase 2: DISCOVER - Show real value, dissolve skepticism
 * Addresses AI photo skepticism with authenticity focus.
 */

export interface ReactivationDay7Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateReactivationDay7Email(params: ReactivationDay7Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  // Generate UTM-tracked link
  const seeLink = `${SITE_URL}/showcase?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day7`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Real photos. Real you. No filters.</title>
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
                Hi ${displayName},
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Most "AI photo" tools look fake — we know.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                That's why SSELFIE was built differently.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                It creates realistic photos that actually look like <em>you</em> — no filters, no retouching, no weird hands.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Just natural, confident images you can use right away.
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Real photos. Real you. No filters.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${seeLink}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  See the difference →
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                Take a look at the results. You'll see what I mean.
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

Hi ${displayName},

Most "AI photo" tools look fake — we know.

That's why SSELFIE was built differently.

It creates realistic photos that actually look like you — no filters, no retouching, no weird hands.

Just natural, confident images you can use right away.

Real photos. Real you. No filters.

See the difference →: ${seeLink}

Take a look at the results. You'll see what I mean.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "Real photos. Real you. No filters.",
  }
}
