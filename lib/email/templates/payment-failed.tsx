export interface PaymentFailedEmailParams {
  firstName?: string
  recipientEmail: string
  retryDate?: string
  manageBillingUrl: string
}

export function generatePaymentFailedEmail(params: PaymentFailedEmailParams): {
  subject: string
  html: string
  text: string
} {
  const { firstName, recipientEmail, retryDate, manageBillingUrl } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  const subject = "Payment failed — update your card to keep access"

  const retryLine = retryDate ? `We'll retry on ${retryDate}.` : "We'll retry automatically soon."

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment failed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 26px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif;">
                S S E L F I E
              </h1>
              <p style="margin: 0; color: #1c1917; font-size: 18px; font-weight: 500;">
                Payment failed
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 24px; color: #44403c; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 12px;">Hi ${displayName},</p>
              <p style="margin: 0 0 12px;">
                We couldn’t process your membership payment. ${retryLine}
              </p>
              <p style="margin: 0 0 16px;">
                Please update your card to keep your Studio access active.
              </p>
              <p style="margin: 0;">
                <a href="${manageBillingUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
                  Update billing details
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px; color: #78716c; font-size: 13px; line-height: 1.6;">
              If you need help, reply to this email and we’ll take care of you.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `Hi ${displayName},

We couldn’t process your membership payment. ${retryLine}

Please update your card to keep your Studio access active:
${manageBillingUrl}

If you need help, reply to this email and we’ll take care of you.
`

  return { subject, html, text }
}
