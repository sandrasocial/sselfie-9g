/**
 * Reactivation Day 5 Email Template
 * "See how creators are building their brand visuals in minutes"
 * 
 * Phase 1: RECONNECT - Soft introduce the app
 * Show how it works without being pushy.
 */

export interface ReactivationDay5Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateReactivationDay5Email(params: ReactivationDay5Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  // Generate UTM-tracked link
  const exploreLink = `${SITE_URL}?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day5`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>See how creators are building their brand visuals in minutes</title>
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
                I wanted to show you what I've been working on.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Creators are using <strong>SSELFIE Studio</strong> to build their brand visuals in minutes — not hours.
              </p>
              
              <div style="background-color: #fafaf9; padding: 24px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #1c1917; font-weight: 500;">
                  How it works:
                </p>
                <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #57534e;">
                  Upload 3 selfies → Studio learns your style → Generate professional photoshoots in any style, outfit, or setting.
                </p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #57534e;">
                  Same confident energy you learned to create. Just faster.
                </p>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                No photographers. No scheduling. No hours of shooting.
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Just you, your style, and professional results in minutes.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${exploreLink}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Explore Studio →
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                Take a look when you're ready. No rush.
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

I wanted to show you what I've been working on.

Creators are using SSELFIE Studio to build their brand visuals in minutes — not hours.

How it works:
Upload 3 selfies → Studio learns your style → Generate professional photoshoots in any style, outfit, or setting.

Same confident energy you learned to create. Just faster.

No photographers. No scheduling. No hours of shooting.

Just you, your style, and professional results in minutes.

Explore Studio →: ${exploreLink}

Take a look when you're ready. No rush.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "See how creators are building their brand visuals in minutes",
  }
}
