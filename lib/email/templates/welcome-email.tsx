import type { WelcomeEmailParams } from "./welcome-email-params"

export function generateWelcomeEmail(params: WelcomeEmailParams): {
  html: string
  text: string
} {
  const { customerName, customerEmail, creditsGranted, packageName } = params

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to SSELFIE</title>
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
              <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2841%29-4vcnjHmEyRfK3XJz48N3olzSa1JHQu.jpeg" alt="Welcome to SSELFIE" style="width: 100%; height: auto; display: block; max-height: 300px; object-fit: cover;" />
            </td>
          </tr>
          
          <!-- Logo & Welcome -->
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 28px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif;">
                S S E L F I E
              </h1>
              <p style="margin: 0; color: #57534e; font-size: 16px; font-weight: 300; line-height: 1.6;">
                ${customerName ? `Hey ${customerName}` : "Hey there"}, you're officially in! 
              </p>
            </td>
          </tr>
          
          <!-- Personal Message -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I'm so excited to have you here. You just took the first step toward building your brand empire, and trust me—this is where the magic happens.
              </p>
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                No more waiting for the "perfect" photoshoot. No more feeling invisible online. You're about to create professional photos that actually look like you—and they're going to be stunning.
              </p>
            </td>
          </tr>
          
          <!-- Order Details -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table role="presentation" style="width: 100%; background-color: #fafaf9; border-radius: 8px; padding: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 16px; color: #78716c; font-size: 11px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase;">
                      YOUR ORDER
                    </p>
                    
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #e7e5e4;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="color: #78716c; font-size: 13px; font-weight: 300;">
                                ${packageName}
                              </td>
                              <td align="right" style="color: #1c1917; font-size: 14px; font-weight: 400;">
                                ${creditsGranted} credits
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 12px 0;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="color: #78716c; font-size: 13px; font-weight: 300;">
                                Email
                              </td>
                              <td align="right" style="color: #1c1917; font-size: 14px; font-weight: 400;">
                                ${customerEmail}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- What's Next -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <h2 style="margin: 0 0 16px; color: #1c1917; font-size: 18px; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase; font-family: Georgia, serif;">
                What's Next
              </h2>
              
              <p style="margin: 0 0 12px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.7;">
                Here's how to get started:
              </p>
              
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                      <strong style="color: #1c1917; font-weight: 400;">1.</strong> Upload 10-20 selfies (the more variety, the better)
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                      <strong style="color: #1c1917; font-weight: 400;">2.</strong> Let the AI train on your unique look
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                      <strong style="color: #1c1917; font-weight: 400;">3.</strong> Create your first professional photos
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                      <strong style="color: #1c1917; font-weight: 400;">4.</strong> Start building your brand empire
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Personal Note -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "I built my business from nothing but selfies and a story. Now it's your turn."
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  — Sandra
                </p>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/studio" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 400; letter-spacing: 0.1em; text-transform: uppercase;">
                Go to Studio
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6; text-align: center;">
                Need help? Just reply to this email—I read every message.
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

${customerName ? `Hey ${customerName}` : "Hey there"}, you're officially in!

I'm so excited to have you here. You just took the first step toward building your brand empire, and trust me—this is where the magic happens.

No more waiting for the "perfect" photoshoot. No more feeling invisible online. You're about to create professional photos that actually look like you—and they're going to be stunning.

YOUR ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${packageName}: ${creditsGranted} credits
Email: ${customerEmail}

WHAT'S NEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Here's how to get started:

1. Upload 10-20 selfies (the more variety, the better)
2. Let the AI train on your unique look
3. Create your first professional photos
4. Start building your brand empire

"I built my business from nothing but selfies and a story. Now it's your turn."
— Sandra

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need help? Just reply to this email—I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
