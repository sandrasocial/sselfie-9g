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
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                Welcome to SSelfie! 🎉
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Hey ${customerName || "there"},
              </p>
              
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">
                Thanks for joining SSelfie! We're excited to have you here. Your account is ready, and you're all set to start creating amazing AI-powered selfies.
              </p>
              
              <!-- Subscription Details -->
              <table role="presentation" style="width: 100%; background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Your Subscription
                    </p>
                    <p style="margin: 0 0 8px; color: #111827; font-size: 20px; font-weight: 700;">
                      ${packageName}
                    </p>
                    <p style="margin: 0; color: #374151; font-size: 16px;">
                      <strong>${creditsGranted} credits</strong> added to your account
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                To get started, you'll need to set up your password. Just click the button below:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="${passwordSetupUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">
                      Set Up Your Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 24px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                This link will expire in 24 hours for security reasons. If you didn't create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; line-height: 1.6;">
                Need help? Just reply to this email and we'll be happy to assist you.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
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
Welcome to SSelfie!

Hey ${customerName || "there"},

Thanks for joining SSelfie! We're excited to have you here. Your account is ready, and you're all set to start creating amazing AI-powered selfies.

Your Subscription: ${packageName}
Credits: ${creditsGranted} credits added to your account

To get started, you'll need to set up your password. Click the link below:

${passwordSetupUrl}

This link will expire in 24 hours for security reasons. If you didn't create this account, you can safely ignore this email.

Need help? Just reply to this email and we'll be happy to assist you.

© ${new Date().getFullYear()} SSelfie. All rights reserved.
  `

  return { html, text }
}
