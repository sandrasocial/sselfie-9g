/**
 * Reactivation Day 25 Email Template
 * "50% off your first month — this week only."
 * 
 * Phase 3: CONVERT - Final call with discount offer
 * Uses COMEBACK50 Stripe promo code.
 */

export interface ReactivationDay25Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateReactivationDay25Email(params: ReactivationDay25Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  // Generate UTM-tracked offer link with COMEBACK50 discount
  const offerLink = `${SITE_URL}/checkout/membership?discount=COMEBACK50&utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day25&utm_medium=email`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>50% off your first month — this week only.</title>
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
                This is your last call — I'm opening <strong>50% off your first month</strong> of SSELFIE Studio for the next few days.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                You'll get:
              </p>
              
              <ul style="margin: 0 0 16px 20px; padding: 0; color: #1c1917; font-size: 16px; line-height: 1.8;">
                <li style="margin-bottom: 12px;">Fresh brand photos every month</li>
                <li style="margin-bottom: 12px;">Feed planner access</li>
                <li style="margin-bottom: 12px;">Learning hub + monthly ideas</li>
                <li style="margin-bottom: 12px;">Community of creators like you</li>
              </ul>
              
              <div style="background-color: #fafaf9; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #1c1917;">
                <p style="margin: 0 0 8px; font-size: 18px; line-height: 1.6; color: #1c1917; font-weight: 500;">
                  Use code: <strong>COMEBACK50</strong>
                </p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #57534e;">
                  50% off your first month
                </p>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Cancel anytime. No stress. Just start showing up.
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                This offer expires in a few days. If you've been thinking about it, now's the time.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${offerLink}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Claim 50% Off →
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                Questions? Just reply — I read every message.
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

This is your last call — I'm opening 50% off your first month of SSELFIE Studio for the next few days.

You'll get:
• Fresh brand photos every month
• Feed planner access
• Learning hub + monthly ideas
• Community of creators like you

Use code: COMEBACK50
50% off your first month

Cancel anytime. No stress. Just start showing up.

This offer expires in a few days. If you've been thinking about it, now's the time.

Claim 50% Off →: ${offerLink}

Questions? Just reply — I read every message.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "50% off your first month — this week only.",
  }
}
