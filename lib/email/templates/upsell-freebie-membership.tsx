import { getCTALink } from "@/lib/email/cta-routing"

export interface UpsellFreebieMembershipParams {
  firstName?: string
  recipientEmail: string
  campaignId?: number
  campaignName?: string
  intentLevel?: "hot" | "warm" | "cold"
}

export function generateUpsellFreebieMembershipEmail(params: UpsellFreebieMembershipParams): {
  subject: string
  html: string
  text: string
} {
  const { firstName, recipientEmail, campaignId, campaignName, intentLevel = "cold" } = params
  const displayName = firstName || recipientEmail.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  const primaryProduct = intentLevel === "hot" ? "membership" : "one-time"
  const landingPageUrl = getCTALink({
    userType: "no_account",
    campaignId,
    campaignName,
    productType: primaryProduct,
    intentLevel,
  })

  const subject = primaryProduct === "membership" ? "Ready for Creator Studio?" : "Start with the $49 Starter Photoshoot"

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
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
              
              <p style="margin: 0 0 12px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                You took the first step with the free guide.
              </p>

              <p style="margin: 0 0 12px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Let's make this easy.
              </p>

              <p style="margin: 0 0 14px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                ${primaryProduct === "membership"
                  ? "If you are ready, go straight to Creator Studio."
                  : "Start with the Starter Photoshoot. One payment. No pressure."}
              </p>

              <ul style="margin: 0 0 24px 20px; padding: 0; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.8;">
                <li style="margin-bottom: 10px;">Your photos start looking like your brand.</li>
                <li style="margin-bottom: 10px;">You get content you can actually post.</li>
                <li style="margin-bottom: 10px;">Then you can upgrade to Studio when you're ready.</li>
              </ul>

              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                This works.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${landingPageUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  ${primaryProduct === "membership" ? "Join Creator Studio" : "Start $49 Starter"}
                </a>
              </div>
              
              <p style="margin: 24px 0 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                No pressure. You've got this.
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

You took the first step with the free guide.

Let's make this easy.

${primaryProduct === "membership"
  ? "If you are ready, go straight to Creator Studio."
  : "Start with the Starter Photoshoot. One payment. No pressure."}

- Your photos start looking like your brand.
- You get content you can actually post.
- Then you can upgrade to Studio when you're ready.

This works.

${primaryProduct === "membership" ? "Join Creator Studio" : "Start $49 Starter"}: ${landingPageUrl}

No pressure. You've got this.

Questions? Just reply to this email-I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { subject, html, text }
}
