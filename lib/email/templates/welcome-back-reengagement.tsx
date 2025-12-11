import { generateTrackedLink } from "@/lib/email/generate-tracked-link"

export interface WelcomeBackReengagementParams {
  firstName?: string
  recipientEmail: string
  campaignId?: number
  campaignName?: string
}

export function generateWelcomeBackReengagementEmail(params: WelcomeBackReengagementParams): {
  html: string
  text: string
} {
  const { firstName, recipientEmail, campaignId, campaignName } = params
  const displayName = firstName || recipientEmail.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  // Use tracked link to public "What's New" page (no login required)
  const studioLink = campaignId && campaignName
    ? generateTrackedLink({
        baseUrl: `${siteUrl}/whats-new`,
        campaignId,
        campaignName,
        campaignType: "welcome_back_reengagement",
        linkType: "cta",
      })
    : `${siteUrl}/whats-new`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>I've been thinking about you...</title>
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
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Hey ${displayName},
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I've been thinking about you.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                It's been a while since we connected, and I wanted to reach out because something's changed. SSELFIE Studio has grown into something I'm really proud of - and I think you'd love what we've built.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Remember when I first started this? I was just a woman with a phone, trying to figure out how to show up online without feeling awkward. Now, we're helping hundreds of women create professional photos that actually feel like them.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Here's what's new:
              </p>
              
              <ul style="margin: 0 0 24px 20px; padding: 0; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.8;">
                <li style="margin-bottom: 12px;">150+ professional photos every month (not just a few)</li>
                <li style="margin-bottom: 12px;">Full Academy with video courses and templates</li>
                <li style="margin-bottom: 12px;">Feed Designer to plan your content</li>
                <li style="margin-bottom: 12px;">Monthly drops with the newest strategies</li>
              </ul>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                But honestly? The best part isn't the features. It's watching women finally feel confident showing their face online. That's what gets me up every morning.
              </p>
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "I used to hide behind my logo. Now I'm the face of my brand, and it's changed everything."
                </p>
                <p style="margin: 8px 0 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  - Sarah, Studio Member
                </p>
              </div>
              
              <p style="margin: 24px 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I'm not here to sell you anything. I just wanted you to know what's possible now. If you're ready to show up online in a way that feels authentic and powerful, we're here.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${studioLink}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  See What's New
                </a>
              </div>
              
              <p style="margin: 24px 0 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                No pressure. Just wanted to reconnect and see how you're doing.
              </p>
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

Hey ${displayName},

I've been thinking about you.

It's been a while since we connected, and I wanted to reach out because something's changed. SSELFIE Studio has grown into something I'm really proud of - and I think you'd love what we've built.

Remember when I first started this? I was just a woman with a phone, trying to figure out how to show up online without feeling awkward. Now, we're helping hundreds of women create professional photos that actually feel like them.

Here's what's new:
- 150+ professional photos every month (not just a few)
- Full Academy with video courses and templates
- Feed Designer to plan your content
- Monthly drops with the newest strategies

But honestly? The best part isn't the features. It's watching women finally feel confident showing their face online. That's what gets me up every morning.

"I used to hide behind my logo. Now I'm the face of my brand, and it's changed everything."
- Sarah, Studio Member

I'm not here to sell you anything. I just wanted you to know what's possible now. If you're ready to show up online in a way that feels authentic and powerful, we're here.

See What's New: ${studioLink}

No pressure. Just wanted to reconnect and see how you're doing.

Questions? Just reply to this email - I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}

