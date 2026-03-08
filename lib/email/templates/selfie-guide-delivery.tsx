export interface SelfieGuideDeliveryParams {
  firstName?: string
  email: string
  guideAccessLink: string
  presetDownloadLink: string
  includesBrandStrategyPack?: boolean
}

export const SELFIE_GUIDE_DELIVERY_SUBJECT = "Your Selfie Guide is ready"

export function generateSelfieGuideDeliveryEmail(params: SelfieGuideDeliveryParams): {
  html: string
  text: string
} {
  const { firstName, email, guideAccessLink, presetDownloadLink, includesBrandStrategyPack } = params
  const displayName = firstName || email.split("@")[0]

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Selfie Guide is ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 28px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif;">
                S S E L F I E
              </h1>
              <h2 style="margin: 0; color: #292524; font-size: 24px; font-weight: 300; line-height: 1.4; font-family: Georgia, serif;">
                Hi ${displayName}, your guide is ready
              </h2>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 16px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Thank you for buying the Selfie Guide.
              </p>
              ${
                includesBrandStrategyPack
                  ? `<p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Your Brand Strategy Pack is also included inside your account.
              </p>`
                  : ""
              }
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                This is your simple system for better selfies, clearer content, and a stronger starting point for your brand.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 24px;">
              <table role="presentation" style="width: 100%; background-color: #fafaf9; border-radius: 8px; padding: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px; color: #78716c; font-size: 11px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase;">
                      Included today
                    </p>
                    <p style="margin: 0 0 10px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.7;">
                      • Full interactive guide access
                    </p>
                    <p style="margin: 0 0 10px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.7;">
                      • Checklists and the 7-day selfie challenge
                    </p>
                    ${
                      includesBrandStrategyPack
                        ? `<p style="margin: 0 0 10px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.7;">
                      • Brand Strategy Pack included
                    </p>`
                        : ""
                    }
                    <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.7;">
                      • Lightroom preset pack bonus
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "You do not need a whole production team. You need one clear next step and a system you will actually use."
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  - Sandra
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 18px; text-align: center;">
              <a href="${guideAccessLink}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase;">
                Read your guide
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="${presetDownloadLink}" style="display: inline-block; color: #1c1917; font-size: 13px; font-weight: 400; line-height: 1.7; text-decoration: underline;">
                Download your Lightroom preset pack
              </a>
              <p style="margin: 16px 0 0; color: #a8a29e; font-size: 12px; font-weight: 300; line-height: 1.6;">
                Save this email so you can come back to both links anytime.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6; text-align: center;">
                Questions? Just reply to this email. I read every message.
              </p>
              <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300; text-align: center;">
                XoXo Sandra
              </p>
              <p style="margin: 16px 0 0; color: #a8a29e; font-size: 11px; font-weight: 300; text-align: center;">
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

Hi ${displayName}, your guide is ready

Thank you for buying the Selfie Guide.

${includesBrandStrategyPack ? "Your Brand Strategy Pack is also included inside your account.\n" : ""}
This is your simple system for better selfies, clearer content, and a stronger starting point for your brand.

Included today:
• Full interactive guide access
• Checklists and the 7-day selfie challenge
${includesBrandStrategyPack ? "• Brand Strategy Pack included\n" : ""}• Lightroom preset pack bonus

"You do not need a whole production team. You need one clear next step and a system you will actually use."
- Sandra

Read your guide: ${guideAccessLink}
Download your Lightroom preset pack: ${presetDownloadLink}

Save this email so you can come back to both links anytime.

Questions? Just reply to this email. I read every message.

XoXo Sandra

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
