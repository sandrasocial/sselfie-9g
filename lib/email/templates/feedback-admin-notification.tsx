interface FeedbackAdminNotificationProps {
  userName: string
  userEmail: string
  feedbackType: string
  subject: string
  message: string
  feedbackId: number
  dashboardUrl: string
}

export function generateFeedbackAdminNotification({
  userName,
  userEmail,
  feedbackType,
  subject,
  message,
  feedbackId,
  dashboardUrl,
}: FeedbackAdminNotificationProps) {
  return {
    subject: `New ${feedbackType} Feedback: ${subject}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Feedback Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                SSELFIE
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 500;">
                New Feedback Received
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Feedback Type Badge -->
              <div style="margin-bottom: 24px;">
                <span style="display: inline-block; padding: 6px 16px; background-color: #f0f4ff; color: #667eea; font-size: 13px; font-weight: 600; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${feedbackType}
                </span>
              </div>

              <!-- Subject -->
              <h2 style="margin: 0 0 24px; color: #1a1a1a; font-size: 22px; font-weight: 700; line-height: 1.4;">
                ${subject}
              </h2>

              <!-- User Info -->
              <div style="margin-bottom: 28px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                <p style="margin: 0 0 8px; color: #666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  From
                </p>
                <p style="margin: 0 0 4px; color: #1a1a1a; font-size: 16px; font-weight: 600;">
                  ${userName}
                </p>
                <p style="margin: 0; color: #667eea; font-size: 14px;">
                  <a href="mailto:${userEmail}" style="color: #667eea; text-decoration: none;">
                    ${userEmail}
                  </a>
                </p>
              </div>

              <!-- Message -->
              <div style="margin-bottom: 32px;">
                <p style="margin: 0 0 12px; color: #666; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  Message
                </p>
                <div style="padding: 20px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
                  <p style="margin: 0; color: #1a1a1a; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">
${message}
                  </p>
                </div>
              </div>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                      Reply in Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Footer Info -->
              <p style="margin: 0; color: #999; font-size: 13px; text-align: center; line-height: 1.6;">
                Feedback ID: #${feedbackId}
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; color: #999; font-size: 13px; line-height: 1.6;">
                This notification was sent to admins of SSELFIE
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  }
}
