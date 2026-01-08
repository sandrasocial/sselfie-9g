/**
 * Cold Education Day 7 Email Template
 * "You're invited — your 30% creator restart."
 * 
 * Invitation with discount offer for original community members.
 * Not pushy, warm invitation tone.
 */

export interface ColdEduDay7Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateColdEduDay7Email(params: ColdEduDay7Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  // Generate UTM-tracked link with discount code
  const activateLink = `${SITE_URL}/checkout/membership?discount=RESTART30&utm_source=email&utm_medium=email&utm_campaign=cold-edu-day-7&utm_content=cta_button`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited — your 30% creator restart.</title>
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
                If you've been thinking about showing up again online — this is your sign.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                For my original community (that's you!), I'm opening a <strong>30% welcome back offer</strong>.
              </p>
              
              <div style="background-color: #fafaf9; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #1c1917;">
                <p style="margin: 0 0 8px; font-size: 18px; line-height: 1.6; color: #1c1917; font-weight: 500;">
                  Use code: <strong>RESTART30</strong>
                </p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #57534e;">
                  30% off your first month of SSELFIE Studio
                </p>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                This is for you — the person who trusted me enough to download my guide, even when I was just starting out.
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                No pressure. No hard sell. Just an invitation, if you're ready.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${activateLink}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Activate your account →
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                Whether you join or not, thank you for being part of this journey from the beginning.
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

If you've been thinking about showing up again online — this is your sign.

For my original community (that's you!), I'm opening a 30% welcome back offer.

Use code: RESTART30
30% off your first month of SSELFIE Studio

This is for you — the person who trusted me enough to download my guide, even when I was just starting out.

No pressure. No hard sell. Just an invitation, if you're ready.

Activate your account →: ${activateLink}

Whether you join or not, thank you for being part of this journey from the beginning.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "You're invited — your 30% creator restart.",
  }
}
