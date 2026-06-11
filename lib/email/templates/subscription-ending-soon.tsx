export interface SubscriptionEndingSoonParams {
  firstName?: string
  recipientEmail: string
  periodEndDate: string
  manageBillingUrl: string
}

export function generateSubscriptionEndingSoonEmail(params: SubscriptionEndingSoonParams): {
  subject: string
  html: string
  text: string
} {
  const { firstName, recipientEmail, periodEndDate, manageBillingUrl } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  const subject = "Your SUITE access is ending soon"

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription ending soon</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 26px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: 'Cormorant Garamond', Georgia, serif;">
                S S E L F I E
              </h1>
              <p style="margin: 0; color: #1c1917; font-size: 18px; font-weight: 500;">
                Your SUITE access is ending soon
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 24px; color: #666666; font-size: 15px; line-height: 1.6;">
              <p style="margin: 0 0 12px;">Hi ${displayName},</p>
              <p style="margin: 0 0 12px;">
                Your current SUITE access is set to end on <strong>${periodEndDate}</strong>.
              </p>
              <p style="margin: 0 0 16px;">
                If you want to keep creating without interruption, you can manage your subscription below.
              </p>
              <p style="margin: 0;">
                <a href="${manageBillingUrl}" style="display: inline-block; background: #0a0a0a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
                  Manage subscription
                </a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px; color: #8a8780; font-size: 13px; line-height: 1.6;">
              Need help? Reply to this email and I’ll sort it out.
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

Your current SUITE access is set to end on ${periodEndDate}.

If you want to keep creating without interruption, you can manage your subscription here:
${manageBillingUrl}

Need help? Reply to this email and I’ll sort it out.
`

  return { subject, html, text }
}
