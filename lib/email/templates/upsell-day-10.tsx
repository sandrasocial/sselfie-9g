import { generateTrackedCheckoutLink } from "@/lib/email/generate-tracked-link"

export interface UpsellDay10Params {
  firstName?: string
  recipientEmail: string
  campaignId?: number
  campaignName?: string
}

export function generateUpsellDay10Email(params: UpsellDay10Params): {
  html: string
  text: string
} {
  const { firstName, recipientEmail, campaignId, campaignName } = params
  const displayName = firstName || recipientEmail.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  // Use tracked link if campaignId is available, otherwise fall back to regular link
  const checkoutUrl = campaignId && campaignName
    ? generateTrackedCheckoutLink(campaignId, campaignName, "upsell_day_10", "studio_membership")
    : `${siteUrl}/studio?checkout=studio_membership`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ready for the Next Level?</title>
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
                It's been about 10 days since you grabbed the free guide. I'm curious-how's it going?
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                The guide gives you the basics. But I've been thinking about you, and I wonder if you're ready for something more.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Here's what I see happening with women who take the next step:
              </p>
              
              <ul style="margin: 0 0 24px 20px; padding: 0; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.8;">
                <li style="margin-bottom: 12px;">They stop worrying about what to post because they have a library of photos</li>
                <li style="margin-bottom: 12px;">They feel confident showing their face online (no more hiding behind logos)</li>
                <li style="margin-bottom: 12px;">They build a personal brand that actually feels like them</li>
                <li style="margin-bottom: 12px;">They save time and money (no more expensive photoshoots)</li>
              </ul>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                That's what SSELFIE Studio is really about. It's not just photos-it's freedom. Freedom to show up consistently. Freedom to be yourself. Freedom to build something real.
              </p>
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "I went from dreading content creation to actually enjoying it. Now I have photos I'm proud to post, and my audience can finally see the real me."
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  - Maria, Studio Member
                </p>
              </div>
              
              <p style="margin: 24px 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                With Studio membership, you get:
              </p>
              
              <ul style="margin: 0 0 24px 20px; padding: 0; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.8;">
                <li style="margin-bottom: 12px;">150+ professional photos every single month</li>
                <li style="margin-bottom: 12px;">Full Academy with video courses and templates</li>
                <li style="margin-bottom: 12px;">Feed Designer to plan your content</li>
                <li style="margin-bottom: 12px;">Monthly drops with the newest strategies</li>
                <li style="margin-bottom: 12px;">Direct access to me when you need help</li>
              </ul>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                This is your photography studio. Your creative team. Your content library. All powered by AI that actually understands YOUR brand.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${checkoutUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Join SSELFIE Studio
                </a>
              </div>
              
              <p style="margin: 24px 0 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                No pressure. Just wanted to make sure you know what's available when you're ready to take your content to the next level.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6;">
                Questions? Just reply to this email-I read every message.
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

It's been about 10 days since you grabbed the free guide. I'm curious-how's it going?

The guide gives you the basics. But I've been thinking about you, and I wonder if you're ready for something more.

Here's what I see happening with women who take the next step:
- They stop worrying about what to post because they have a library of photos
- They feel confident showing their face online (no more hiding behind logos)
- They build a personal brand that actually feels like them
- They save time and money (no more expensive photoshoots)

That's what SSELFIE Studio is really about. It's not just photos-it's freedom. Freedom to show up consistently. Freedom to be yourself. Freedom to build something real.

"I went from dreading content creation to actually enjoying it. Now I have photos I'm proud to post, and my audience can finally see the real me."
- Maria, Studio Member

With Studio membership, you get:
- 150+ professional photos every single month
- Full Academy with video courses and templates
- Feed Designer to plan your content
- Monthly drops with the newest strategies
- Direct access to me when you need help

This is your photography studio. Your creative team. Your content library. All powered by AI that actually understands YOUR brand.

Join SSELFIE Studio: ${checkoutUrl}

No pressure. Just wanted to make sure you know what's available when you're ready to take your content to the next level.

Questions? Just reply to this email-I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}

