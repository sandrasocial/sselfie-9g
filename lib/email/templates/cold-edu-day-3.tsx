/**
 * Cold Education Day 3 Email Template
 * "From selfies to Studio — this is how it works."
 * 
 * Educational, visual explanation of how SSELFIE Studio works
 * for cold subscribers who need to understand the product.
 */

export interface ColdEduDay3Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateColdEduDay3Email(params: ColdEduDay3Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  // Generate UTM-tracked link (homepage or how-it-works section)
  const learnLink = `${SITE_URL}?utm_source=email&utm_medium=email&utm_campaign=cold-edu-day-3&utm_content=cta_button`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>From selfies to Studio — this is how it works.</title>
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
                Remember when I taught you how to take confident selfies?
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Now I've built a tool that helps you create those same confident visuals — automatically.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's how it works:
              </p>
              
              <div style="background-color: #fafaf9; padding: 24px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #1c1917; font-weight: 500;">
                  1. Upload 3 selfies
                </p>
                <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #57534e;">
                  Any 3 photos of yourself — phone selfies work perfectly.
                </p>
                
                <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #1c1917; font-weight: 500;">
                  2. Studio learns your style
                </p>
                <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #57534e;">
                  AI creates a personalized model that captures your unique look.
                </p>
                
                <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #1c1917; font-weight: 500;">
                  3. Get styled photoshoots in minutes
                </p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #57534e;">
                  Generate professional photos in any style, outfit, or setting — without a photoshoot.
                </p>
              </div>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Same confident energy you learned to create. Just faster, and easier.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${learnLink}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Learn how SSELFIE works →
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

Hey ${displayName},

Remember when I taught you how to take confident selfies?

Now I've built a tool that helps you create those same confident visuals — automatically.

Here's how it works:

1. Upload 3 selfies
   Any 3 photos of yourself — phone selfies work perfectly.

2. Studio learns your style
   AI creates a personalized model that captures your unique look.

3. Get styled photoshoots in minutes
   Generate professional photos in any style, outfit, or setting — without a photoshoot.

Same confident energy you learned to create. Just faster, and easier.

Learn how SSELFIE works →: ${learnLink}

Questions? Just reply — I read every message.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "From selfies to Studio — this is how it works.",
  }
}
