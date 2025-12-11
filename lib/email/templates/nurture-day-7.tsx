import { generateTrackedLink } from "@/lib/email/generate-tracked-link"

export interface NurtureDay7Params {
  firstName?: string
  recipientEmail: string
  campaignId?: number
  campaignName?: string
}

export function generateNurtureDay7Email(params: NurtureDay7Params): {
  html: string
  text: string
} {
  const { firstName, recipientEmail, campaignId, campaignName } = params
  const displayName = firstName || recipientEmail.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  // Use tracked link to landing page (educational, not direct checkout)
  const studioLink = campaignId && campaignName
    ? generateTrackedLink({
        baseUrl: `${siteUrl}/why-studio`,
        campaignId,
        campaignName,
        campaignType: "nurture_day_7",
        linkType: "cta",
      })
    : `${siteUrl}/why-studio`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>One Week In</title>
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
                You've been with SSELFIE for a week now. How are you feeling about your content?
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                By now, you should have a good sense of what's possible. Whether you've created 10 photos or 100, you're building something real-a personal brand that actually represents YOU.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Here's what I want you to know: you don't need to be perfect. You just need to keep going. Every photo you create is progress. Every post you plan is momentum.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                If you're a Studio member, you're getting fresh credits every month. Use them. Experiment. Try new styles. The more you create, the more confident you'll become.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${siteUrl}/studio" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Keep Creating
                </a>
              </div>
              
              <p style="margin: 24px 0 16px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                I'd love to hear how it's going. What's working? What questions do you have? Just reply and let me know.
              </p>
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 400; line-height: 1.6;">
                  P.S. If you're loving what you're creating and want unlimited access to fresh photos every month, Studio membership gives you 150+ new images, the full Academy, and direct support from me. Just something to think about when you're ready.
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  <a href="${studioLink}" style="color: #1c1917; text-decoration: underline;">Learn more about Studio →</a>
                </p>
              </div>
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

You've been with SSELFIE for a week now. How are you feeling about your content?

By now, you should have a good sense of what's possible. Whether you've created 10 photos or 100, you're building something real-a personal brand that actually represents YOU.

Here's what I want you to know: you don't need to be perfect. You just need to keep going. Every photo you create is progress. Every post you plan is momentum.

If you're a Studio member, you're getting fresh credits every month. Use them. Experiment. Try new styles. The more you create, the more confident you'll become.

Keep Creating: ${siteUrl}/studio

I'd love to hear how it's going. What's working? What questions do you have? Just reply and let me know.

Questions? Just reply to this email-I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}

