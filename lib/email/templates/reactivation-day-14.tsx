/**
 * Reactivation Day 14 Email Template
 * "You're invited — 25 credits to explore SSELFIE Studio."
 * 
 * Phase 2: DISCOVER - Offer first taste with credit bonus
 * Invitation with 25 free credits to explore the Studio.
 */

export interface ReactivationDay14Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateReactivationDay14Email(params: ReactivationDay14Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  // Generate UTM-tracked signup link (credit bonus granted on signup via utm_source)
  const activateLink = `${SITE_URL}/signup?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day14&utm_medium=email`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited — 25 credits to explore SSELFIE Studio.</title>
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
                Because you joined my original Selfie Guide list, you get <strong>25 free credits</strong> to explore SSELFIE Studio.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Use them to:
              </p>
              
              <ul style="margin: 0 0 16px 20px; padding: 0; color: #1c1917; font-size: 16px; line-height: 1.8;">
                <li style="margin-bottom: 12px;">Create your first on-brand photos</li>
                <li style="margin-bottom: 12px;">Try the feed planner</li>
                <li style="margin-bottom: 12px;">Start showing up with confidence</li>
              </ul>
              
              <div style="background-color: #fafaf9; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #1c1917;">
                <p style="margin: 0; font-size: 18px; line-height: 1.6; color: #1c1917; font-weight: 500;">
                  No card needed. Just your selfies and a few minutes.
                </p>
              </div>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                This is your invitation to see what's possible.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${activateLink}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Activate my Studio →
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                Your credits will be waiting for you as soon as you sign up.
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

Because you joined my original Selfie Guide list, you get 25 free credits to explore SSELFIE Studio.

Use them to:
• Create your first on-brand photos
• Try the feed planner
• Start showing up with confidence

No card needed. Just your selfies and a few minutes.

This is your invitation to see what's possible.

Activate my Studio →: ${activateLink}

Your credits will be waiting for you as soon as you sign up.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "You're invited — 25 credits to explore SSELFIE Studio.",
  }
}
