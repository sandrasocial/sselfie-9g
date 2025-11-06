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
  <title>Welcome to SSelfie</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 2px solid #e7e5e4; border-radius: 8px;">
          
          <!-- Success Icon -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <div style="width: 64px; height: 64px; background-color: #22c55e; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <h1 style="margin: 0 0 16px; color: #1c1917; font-size: 36px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif;">
                WELCOME TO SSELFIE
              </h1>
              <p style="margin: 0; color: #57534e; font-size: 18px; font-weight: 300; line-height: 1.6;">
                ${customerName ? `Hi ${customerName}, your` : "Your"} account is ready. Let's build your brand empire.
              </p>
            </td>
          </tr>
          
          <!-- Order Details Box -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" style="width: 100%; background-color: #ffffff; border: 2px solid #e7e5e4; border-radius: 8px; padding: 32px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 24px; color: #1c1917; font-size: 20px; font-weight: 300; letter-spacing: 0.2em; text-transform: uppercase; font-family: Georgia, serif;">
                      ORDER CONFIRMATION
                    </h2>
                    
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="padding: 16px 0; border-bottom: 1px solid #e7e5e4;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="color: #78716c; font-size: 12px; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase;">
                                PRODUCT
                              </td>
                              <td align="right" style="color: #1c1917; font-size: 16px; font-weight: 500;">
                                ${packageName}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 16px 0; border-bottom: 1px solid #e7e5e4;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="color: #78716c; font-size: 12px; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase;">
                                ${packageName.includes("MEMBERSHIP") ? "MONTHLY CREDITS" : "CREDITS INCLUDED"}
                              </td>
                              <td align="right" style="color: #1c1917; font-size: 16px; font-weight: 500;">
                                ${creditsGranted} credits
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 16px 0; border-bottom: 1px solid #e7e5e4;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="color: #78716c; font-size: 12px; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase;">
                                EMAIL
                              </td>
                              <td align="right" style="color: #1c1917; font-size: 16px; font-weight: 500;">
                                ${customerEmail}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 16px 0;">
                          <table role="presentation" style="width: 100%;">
                            <tr>
                              <td style="color: #78716c; font-size: 12px; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase;">
                                STATUS
                              </td>
                              <td align="right" style="color: #22c55e; font-size: 16px; font-weight: 500;">
                                ACTIVE
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
            <td style="padding: 0 40px 32px;">
              <table role="presentation" style="width: 100%; background-color: #fafaf9; border-radius: 8px; padding: 32px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 24px; color: #1c1917; font-size: 20px; font-weight: 300; letter-spacing: 0.2em; text-transform: uppercase; font-family: Georgia, serif;">
                      WHAT'S NEXT
                    </h2>
                    
                    <p style="margin: 0 0 16px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                      Your account is ready to use. Here's what you can do:
                    </p>
                    
                    <ul style="margin: 0; padding-left: 20px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.8;">
                      <li>Upload 10-20 selfies to train your AI model</li>
                      <li>Meet Maya, your AI strategist who will guide you</li>
                      <li>Create your first professional photos</li>
                      <li>Build your brand empire with AI-powered content</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #fafaf9; border-radius: 0 0 8px 8px; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0 0 12px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                Need help? Just reply to this email and we'll be happy to assist you.
              </p>
              <p style="margin: 0; color: #a8a29e; font-size: 12px; font-weight: 300;">
                © ${new Date().getFullYear()} SSelfie. All rights reserved.
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
WELCOME TO SSELFIE

${customerName ? `Hi ${customerName}, your` : "Your"} account is ready. Let's build your brand empire.

ORDER CONFIRMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Product: ${packageName}
${packageName.includes("MEMBERSHIP") ? "Monthly Credits" : "Credits Included"}: ${creditsGranted} credits
Email: ${customerEmail}
Status: ACTIVE

WHAT'S NEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your account is ready to use. Here's what you can do:

• Upload 10-20 selfies to train your AI model
• Meet Maya, your AI strategist who will guide you
• Create your first professional photos
• Build your brand empire with AI-powered content

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need help? Just reply to this email and we'll be happy to assist you.

© ${new Date().getFullYear()} SSelfie. All rights reserved.
  `

  return { html, text }
}
