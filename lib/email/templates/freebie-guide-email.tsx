export interface FreebieGuideEmailParams {
  firstName: string
  email: string
  guideAccessLink: string
}

export function generateFreebieGuideEmail(params: FreebieGuideEmailParams): {
  html: string
  text: string
} {
  const { firstName, guideAccessLink } = params

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Free Selfie Guide is Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2841%29-4vcnjHmEyRfK3XJz48N3olzSa1JHQu.jpeg" alt="Your Free Selfie Guide" style="width: 100%; height: auto; display: block; max-height: 300px; object-fit: cover;" />
            </td>
          </tr>
          
          <!-- Logo & Welcome -->
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 28px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif;">
                S S E L F I E
              </h1>
              <p style="margin: 0; color: #57534e; font-size: 16px; font-weight: 300; line-height: 1.6;">
                ${firstName}, your free guide is ready
              </p>
            </td>
          </tr>
          
          <!-- Personal Message -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I created this guide for you because I know what it's like to feel invisible online.
              </p>
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Inside, you'll discover the exact selfie techniques I used to build my business from scratch. No expensive equipment. No professional photographer. Just you, your phone, and the right approach.
              </p>
            </td>
          </tr>
          
          <!-- What's Inside Box -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table role="presentation" style="width: 100%; background-color: #fafaf9; border-radius: 8px; padding: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px; color: #78716c; font-size: 11px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase;">
                      What's Inside
                    </p>
                    
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 8px 0;">
                          <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                            <strong style="color: #1c1917; font-weight: 400;">•</strong> The 3 lighting setups that make any space photo-ready
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                            <strong style="color: #1c1917; font-weight: 400;">•</strong> Camera angles that actually flatter (not just filters)
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                            <strong style="color: #1c1917; font-weight: 400;">•</strong> Poses that look natural, never awkward
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                            <strong style="color: #1c1917; font-weight: 400;">•</strong> How to build a content library in one afternoon
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Personal Note -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #fafaf9; border-left: 3px solid: #292524; padding: 20px; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "Your selfies are the foundation of your personal brand. Make them count."
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  - Sandra
                </p>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="${guideAccessLink}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 400; letter-spacing: 0.1em; text-transform: uppercase;">
                Read Your Guide
              </a>
              <p style="margin: 16px 0 0; color: #a8a29e; font-size: 12px; font-weight: 300; line-height: 1.6;">
                This link gives you lifetime access to your guide
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6; text-align: center;">
                Questions? Just reply to this email-I read every message.
              </p>
              <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300; text-align: center;">
                XoXo Sandra 💋
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

${firstName}, your free guide is ready

I created this guide for you because I know what it's like to feel invisible online.

Inside, you'll discover the exact selfie techniques I used to build my business from scratch. No expensive equipment. No professional photographer. Just you, your phone, and the right approach.

WHAT'S INSIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• The 3 lighting setups that make any space photo-ready
• Camera angles that actually flatter (not just filters)
• Poses that look natural, never awkward
• How to build a content library in one afternoon

"Your selfies are the foundation of your personal brand. Make them count."
- Sandra

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

READ YOUR GUIDE: ${guideAccessLink}

This link gives you lifetime access to your guide.

Questions? Just reply to this email-I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
