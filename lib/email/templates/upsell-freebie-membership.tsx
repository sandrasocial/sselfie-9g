import { generateTrackedCheckoutLink } from "@/lib/email/generate-tracked-link"

export interface UpsellFreebieMembershipParams {
  firstName?: string
  recipientEmail: string
  campaignId?: number
  campaignName?: string
}

export function generateUpsellFreebieMembershipEmail(params: UpsellFreebieMembershipParams): {
  html: string
  text: string
} {
  const { firstName, recipientEmail, campaignId, campaignName } = params
  const displayName = firstName || recipientEmail.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  // Use tracked link if campaignId is available, otherwise fall back to regular link
  const checkoutUrl = campaignId && campaignName
    ? generateTrackedCheckoutLink(campaignId, campaignName, "upsell_freebie_to_membership", "studio_membership")
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
                You grabbed the free guide-that's a great first step. Now, are you ready to take it to the next level?
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                The free guide gives you the basics. But SSELFIE Studio gives you:
              </p>
              
              <ul style="margin: 0 0 24px 20px; padding: 0; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.8;">
                <li style="margin-bottom: 12px;">150+ professional photos every month</li>
                <li style="margin-bottom: 12px;">Full Academy with video courses and templates</li>
                <li style="margin-bottom: 12px;">Feed Designer for content planning</li>
                <li style="margin-bottom: 12px;">Monthly drops with newest strategies</li>
                <li style="margin-bottom: 12px;">Direct access to me for support</li>
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
                No pressure-just wanted to make sure you know what's available when you're ready.
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

You grabbed the free guide-that's a great first step. Now, are you ready to take it to the next level?

The free guide gives you the basics. But SSELFIE Studio gives you:
- 150+ professional photos every month
- Full Academy with video courses and templates
- Feed Designer for content planning
- Monthly drops with newest strategies
- Direct access to me for support

This is your photography studio. Your creative team. Your content library. All powered by AI that actually understands YOUR brand.

Join SSELFIE Studio: ${checkoutUrl}

No pressure-just wanted to make sure you know what's available when you're ready.

Questions? Just reply to this email-I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}

