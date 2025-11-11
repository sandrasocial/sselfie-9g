interface FeedbackReplyEmailProps {
  userName: string
  originalSubject: string
  originalMessage: string
  adminReply: string
}

export function generateFeedbackReplyEmail({
  userName,
  originalSubject,
  originalMessage,
  adminReply,
}: FeedbackReplyEmailProps) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reply to Your Feedback</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafaf9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 0 40px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 32px; font-weight: 300; letter-spacing: 0.2em; text-transform: uppercase; color: #0c0a09;">SSELFIE</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; font-family: 'Georgia', serif; font-size: 24px; font-weight: 300; color: #0c0a09;">Hi ${userName}!</h2>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #57534e;">
                We've responded to your feedback. Here's our reply:
              </p>
              
              <!-- Admin Reply Box -->
              <div style="background-color: #fafaf9; border-left: 4px solid: #0c0a09; padding: 20px; margin: 0 0 24px 0; border-radius: 8px;">
                <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #1c1917; white-space: pre-wrap;">${adminReply}</p>
              </div>
              
              <!-- Original Feedback Reference -->
              <div style="border-top: 1px solid #e7e5e4; padding-top: 24px; margin-top: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c;">Your Original Feedback:</p>
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 500; color: #44403c;">${originalSubject}</p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #78716c;">${originalMessage}</p>
              </div>
              
              <p style="margin: 32px 0 0 0; font-size: 15px; line-height: 1.6; color: #57534e;">
                If you have any follow-up questions, feel free to reply to this email or send us new feedback from the app.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                <tr>
                  <td align="center">
                    <a href="https://sselfie.ai/studio" style="display: inline-block; padding: 14px 32px; background-color: #0c0a09; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                      Back to Studio
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #fafaf9; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #78716c; text-align: center;">
                xo,<br>
                <strong style="color: #44403c;">Sandra</strong>
              </p>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #a8a29e; text-align: center;">
                SSELFIE Studio · Your AI Beauty & Content Studio
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

  const text = `Hi ${userName}!

We've responded to your feedback:

${adminReply}

---
Your Original Feedback:
${originalSubject}
${originalMessage}

---

If you have any follow-up questions, feel free to reply to this email or send us new feedback from the app.

xo,
Sandra

SSELFIE Studio · Your AI Beauty & Content Studio
https://sselfie.ai/studio
  `

  return { html, text }
}
