export interface BlueprintFollowupDay0Params {
  firstName?: string
  email: string
  formData?: {
    business?: string
    dreamClient?: string
    vibe?: string
    [key: string]: any
  }
}

export function generateBlueprintFollowupDay0Email(params: BlueprintFollowupDay0Params): {
  html: string
  text: string
} {
  const { firstName, email, formData } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const vibe = formData?.vibe ? formData.vibe.charAt(0).toUpperCase() + formData.vibe.slice(1) : "your chosen"

  // Generate tracked links
  const photoshootUrl = `${siteUrl}/?utm_source=email&utm_medium=email&utm_campaign=blueprint_followup_day0&utm_content=cta&product=one_time`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Brand Blueprint is Ready!</title>
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
                Hi ${displayName}! Your Blueprint is Here
              </h2>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I'm so excited to share your personalized brand blueprint with you! This is everything you need to start building a consistent, professional brand online.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Here's what's inside:
              </p>
              
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.8;">
                <li style="margin-bottom: 12px;">Your ${vibe} aesthetic guide - the exact vibe you selected</li>
                <li style="margin-bottom: 12px;">30 caption templates ready to customize</li>
                <li style="margin-bottom: 12px;">30-day content calendar with post ideas</li>
                <li style="margin-bottom: 12px;">Quick implementation tips to get started today</li>
              </ul>
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "The best time to start was yesterday. The second best time is now."
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  - Sandra
                </p>
              </div>
              
              <p style="margin: 24px 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Ready to bring this to life? Try your first AI photoshoot for $49 and see your blueprint come together with professional photos that actually look like you.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${photoshootUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Try Your First Photoshoot - $49
                </a>
              </div>
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

Hi ${displayName}! Your Blueprint is Here

I'm so excited to share your personalized brand blueprint with you! This is everything you need to start building a consistent, professional brand online.

Here's what's inside:

• Your ${vibe} aesthetic guide - the exact vibe you selected
• 30 caption templates ready to customize
• 30-day content calendar with post ideas
• Quick implementation tips to get started today

"The best time to start was yesterday. The second best time is now."
- Sandra

Ready to bring this to life? Try your first AI photoshoot for $49 and see your blueprint come together with professional photos that actually look like you.

Try Your First Photoshoot - $49: ${photoshootUrl}

Questions? Just reply to this email - I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
