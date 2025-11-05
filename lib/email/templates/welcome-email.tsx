import type { WelcomeEmailParams } from "./welcome-email-params"

export function generateWelcomeEmail(params: WelcomeEmailParams): {
  html: string
  text: string
} {
  const { customerName, customerEmail, passwordSetupUrl, creditsGranted, packageName } = params

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
                Your subscription is active. Let's build your brand empire.
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
                      ORDER DETAILS
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
          
          <!-- Next Steps -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" style="width: 100%; background-color: #fafaf9; border-radius: 8px; padding: 32px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 24px; color: #1c1917; font-size: 20px; font-weight: 300; letter-spacing: 0.2em; text-transform: uppercase; font-family: Georgia, serif;">
                      NEXT STEPS
                    </h2>
                    
                    <!-- Step 1 -->
                    <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                      <tr>
                        <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                          <div style="width: 32px; height: 32px; background-color: #1c1917; color: #fafaf9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; text-align: center; line-height: 32px;">
                            1
                          </div>
                        </td>
                        <td style="padding-left: 16px;">
                          <h3 style="margin: 0 0 4px; color: #1c1917; font-size: 16px; font-weight: 500;">
                            Set Your Password
                          </h3>
                          <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.5;">
                            Choose a secure password to access your account and start creating.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Step 2 -->
                    <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                      <tr>
                        <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                          <div style="width: 32px; height: 32px; background-color: #1c1917; color: #fafaf9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; text-align: center; line-height: 32px;">
                            2
                          </div>
                        </td>
                        <td style="padding-left: 16px;">
                          <h3 style="margin: 0 0 4px; color: #1c1917; font-size: 16px; font-weight: 500;">
                            Upload Your Selfies
                          </h3>
                          <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.5;">
                            Train your AI model with 10-20 selfies to get started.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Step 3 -->
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="width: 32px; vertical-align: top; padding-top: 2px;">
                          <div style="width: 32px; height: 32px; background-color: #1c1917; color: #fafaf9; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; text-align: center; line-height: 32px;">
                            3
                          </div>
                        </td>
                        <td style="padding-left: 16px;">
                          <h3 style="margin: 0 0 4px; color: #1c1917; font-size: 16px; font-weight: 500;">
                            Meet Maya
                          </h3>
                          <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.5;">
                            Your AI strategist will guide you through creating your first professional photos.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <a href="${passwordSetupUrl}" style="display: inline-block; padding: 20px 48px; background-color: #1c1917; color: #fafaf9; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px; letter-spacing: 0.1em; text-transform: uppercase;">
                SET UP YOUR ACCOUNT
              </a>
              <p style="margin: 16px 0 0; color: #78716c; font-size: 12px; font-weight: 300;">
                This link will expire in 24 hours for security reasons.
              </p>
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

Your subscription is active. Let's build your brand empire.

ORDER DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Product: ${packageName}
${packageName.includes("MEMBERSHIP") ? "Monthly Credits" : "Credits Included"}: ${creditsGranted} credits
Email: ${customerEmail}
Status: ACTIVE

NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Set Your Password
   Choose a secure password to access your account and start creating.

2. Upload Your Selfies
   Train your AI model with 10-20 selfies to get started.

3. Meet Maya
   Your AI strategist will guide you through creating your first professional photos.

SET UP YOUR ACCOUNT
${passwordSetupUrl}

This link will expire in 24 hours for security reasons.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need help? Just reply to this email and we'll be happy to assist you.

© ${new Date().getFullYear()} SSelfie. All rights reserved.
  `

  return { html, text }
}
