export interface PaidBlueprintDeliveryParams {
  firstName?: string
  email: string
  accessToken: string
  photoPreviewUrls?: string[] // Optional: up to 4 preview images
}

export const PAID_BLUEPRINT_DELIVERY_SUBJECT = "Your SSELFIE Brand Blueprint is ready 📸"

export function generatePaidBlueprintDeliveryEmail(params: PaidBlueprintDeliveryParams): {
  html: string
  text: string
} {
  const { firstName, email, accessToken, photoPreviewUrls } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  // Generate tracked link to paid blueprint page
  const paidBlueprintUrl = `${siteUrl}/blueprint/paid?access=${accessToken}&utm_source=email&utm_medium=email&utm_campaign=paid_blueprint&utm_content=delivery`

  // Build photo preview grid if provided (max 4 images)
  const previewImages = photoPreviewUrls?.slice(0, 4) || []
  const photoPreviewHtml = previewImages.length > 0 ? `
              <div style="margin: 24px 0;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  Here's a preview of your photos:
                </p>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    ${previewImages.map((url, idx) => `
                    <td style="padding: ${idx < previewImages.length - 1 ? "0 8px 0 0" : "0"}; width: ${100 / previewImages.length}%;">
                      <img src="${url}" alt="Photo ${idx + 1}" style="width: 100%; height: auto; border-radius: 8px; display: block;" />
                    </td>
                    `).join("")}
                  </tr>
                </table>
              </div>
  ` : ""

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SSELFIE Brand Blueprint is ready</title>
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
                Hi ${displayName}! Your 30 Photos Are Ready
              </h2>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I'm so excited to share your personalized brand blueprint photos with you! You now have 30 professional photos ready to use, all based on your brand strategy.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Here's what you got:
              </p>
              
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.8;">
                <li style="margin-bottom: 12px;">30 custom photos that match your brand aesthetic</li>
                <li style="margin-bottom: 12px;">Ready to download and use immediately</li>
                <li style="margin-bottom: 12px;">Perfect for Instagram, LinkedIn, or your website</li>
                <li style="margin-bottom: 12px;">All photos look like you - no generic stock photos</li>
              </ul>
              
              ${photoPreviewHtml}
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "Your photos are ready. Now it's time to show up consistently."
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  - Sandra
                </p>
              </div>
              
              <p style="margin: 24px 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Click below to view and download all 30 photos. You can start using them right away!
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${paidBlueprintUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  View My 30 Photos →
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

Hi ${displayName}! Your 30 Photos Are Ready

I'm so excited to share your personalized brand blueprint photos with you! You now have 30 professional photos ready to use, all based on your brand strategy.

Here's what you got:

• 30 custom photos that match your brand aesthetic
• Ready to download and use immediately
• Perfect for Instagram, LinkedIn, or your website
• All photos look like you - no generic stock photos

"Your photos are ready. Now it's time to show up consistently."
- Sandra

Click below to view and download all 30 photos. You can start using them right away!

View My 30 Photos →: ${paidBlueprintUrl}

Questions? Just reply to this email - I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
