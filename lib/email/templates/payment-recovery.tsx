export interface PaymentRecoveryParams {
  firstName?: string
  email: string
  planName?: string
  amount?: string
}

// EMAIL 1: Payment Update Needed (Immediate)
export function generatePaymentUpdateEmail(params: PaymentRecoveryParams) {
  const { firstName, email, planName = "SSELFIE SUITE membership", amount = "€97" } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const billingUrl = `${siteUrl}/studio?tab=account&utm_source=email&utm_medium=payment_recovery&utm_campaign=update_payment`

  const subject = "Quick heads up: your payment didn't go through"

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment update needed</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e7e5e4;">

          <!-- Header -->
          <tr>
            <td style="background-color: #0c0a09; padding: 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 200; letter-spacing: 0.3em; color: #fafaf9; text-transform: uppercase;">
                S S E L F I E
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #1c1917;">Hey ${displayName},</p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #1c1917;">
                Your payment for ${planName} (${amount}) didn't go through. It happens. Cards expire, banks flag things.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #1c1917;">
                Your account is still active for now. Update your payment details to keep things running.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${billingUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;">
                  Update payment details &rarr;
                </a>
              </div>

              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #57534e;">
                If you're having trouble or need help, just reply here.
              </p>

              <p style="margin: 0; font-size: 16px; color: #1c1917;">Sandra</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 11px; color: #a8a29e;">
                SSELFIE Studio &bull; Fauskevegen 121, 6230 Sykkylven, Norway
              </p>
              <p style="margin: 0; font-size: 11px; color: #a8a29e;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #a8a29e; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `S S E L F I E

Hey ${displayName},

Your payment for ${planName} (${amount}) didn't go through. It happens. Cards expire, banks flag things.

Your account is still active for now. Update your payment details to keep things running:

${billingUrl}

If you're having trouble or need help, just reply here.

Sandra

SSELFIE Studio · Fauskevegen 121, 6230 Sykkylven, Norway
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text, subject }
}

// EMAIL 2: Still hasn't updated (Day 3 — last nudge before access ends)
export function generateWeMissYouEmail(params: PaymentRecoveryParams) {
  const { firstName, email, planName = "SSELFIE SUITE membership" } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const billingUrl = `${siteUrl}/studio?tab=account&utm_source=email&utm_medium=payment_recovery&utm_campaign=access_ending`
  const checkoutUrl = `${siteUrl}/checkout/membership?utm_source=email&utm_medium=payment_recovery&utm_campaign=rejoin`

  const subject = "Your SUITE access is about to end"

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SUITE access is about to end</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e7e5e4;">

          <!-- Header -->
          <tr>
            <td style="background-color: #0c0a09; padding: 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 200; letter-spacing: 0.3em; color: #fafaf9; text-transform: uppercase;">
                S S E L F I E
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #1c1917;">Hey ${displayName},</p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #1c1917;">
                I sent a note a few days ago about your ${planName} payment. Looks like it still hasn't gone through, so your access will end soon if nothing changes.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #1c1917;">
                If you want to keep your account, just update your card. Takes about 30 seconds.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${billingUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;">
                  Update payment &rarr;
                </a>
              </div>

              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #57534e;">
                If you've decided to pause for now, no hard feelings at all. You can always come back when the timing works.
              </p>

              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #8a8780;">
                <a href="${checkoutUrl}" style="color: #8a8780; text-decoration: underline;">Rejoin the SUITE whenever you're ready &rarr;</a>
              </p>

              <p style="margin: 0; font-size: 16px; color: #1c1917;">Sandra</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 11px; color: #a8a29e;">
                SSELFIE Studio &bull; Fauskevegen 121, 6230 Sykkylven, Norway
              </p>
              <p style="margin: 0; font-size: 11px; color: #a8a29e;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #a8a29e; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `S S E L F I E

Hey ${displayName},

I sent a note a few days ago about your ${planName} payment. Looks like it still hasn't gone through, so your access will end soon if nothing changes.

If you want to keep your account, just update your card. Takes about 30 seconds:

${billingUrl}

If you've decided to pause for now, no hard feelings at all. You can always come back when the timing works:
${checkoutUrl}

Sandra

SSELFIE Studio · Fauskevegen 121, 6230 Sykkylven, Norway
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text, subject }
}
