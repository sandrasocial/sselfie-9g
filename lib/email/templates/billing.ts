/**
 * Billing / Transactional Email Templates
 * For Stripe subscription events
 */

export function subscriptionConfirmationEmail(options: {
  firstName?: string
  productName: string
  amount: number
  billingPeriod: "month" | "year"
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafaf9; }
    .container { max-width: 600px; margin: 0 auto; padding: 60px 40px; background: white; }
    h1 { font-size: 32px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 24px 0; }
    p { font-size: 16px; line-height: 1.7; color: #292524; margin: 0 0 20px 0; }
    .footer { padding: 40px; background-color: #fafaf9; border-top: 1px solid #e7e5e4; text-align: center; }
    .footer p { font-size: 13px; color: #78716c; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SSELFIE</h1>
    ${options.firstName ? `<p>Hi ${options.firstName},</p>` : "<p>Hi there,</p>"}
    <p>Your subscription to ${options.productName} is confirmed!</p>
    <p>You'll be charged $${(options.amount / 100).toFixed(2)} ${options.billingPeriod === "month" ? "monthly" : "annually"}.</p>
    <p>Welcome to SSELFIE Studio. Let's create something stunning together.</p>
    <p>XoXo,<br>Maya</p>
  </div>
  <div class="footer">
    <p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p>
    <p>Questions? Just reply to this email.</p>
  </div>
</body>
</html>
  `.trim()
}

export function paymentFailedEmail(options: {
  firstName?: string
  productName: string
  retryUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafaf9; }
    .container { max-width: 600px; margin: 0 auto; padding: 60px 40px; background: white; }
    h1 { font-size: 32px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 24px 0; }
    p { font-size: 16px; line-height: 1.7; color: #292524; margin: 0 0 20px 0; }
    .button { display: inline-block; padding: 16px 32px; background-color: #1c1917; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SSELFIE</h1>
    ${options.firstName ? `<p>Hi ${options.firstName},</p>` : "<p>Hi there,</p>"}
    <p>We had trouble processing your payment for ${options.productName}.</p>
    <p>Don't worry, this happens sometimes. Just update your payment method and we'll try again.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="${options.retryUrl}" class="button">Update Payment Method</a>
    </p>
    <p>XoXo,<br>Maya</p>
  </div>
</body>
</html>
  `.trim()
}

export function subscriptionCancelledEmail(options: {
  firstName?: string
  productName: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafaf9; }
    .container { max-width: 600px; margin: 0 auto; padding: 60px 40px; background: white; }
    h1 { font-size: 32px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 24px 0; }
    p { font-size: 16px; line-height: 1.7; color: #292524; margin: 0 0 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SSELFIE</h1>
    ${options.firstName ? `<p>Hi ${options.firstName},</p>` : "<p>Hi there,</p>"}
    <p>Your ${options.productName} subscription has been cancelled.</p>
    <p>We're sorry to see you go. If you change your mind, you can reactivate anytime.</p>
    <p>XoXo,<br>Maya</p>
  </div>
</body>
</html>
  `.trim()
}

export function trialEndingEmail(options: {
  firstName?: string
  daysRemaining: number
  upgradeUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafaf9; }
    .container { max-width: 600px; margin: 0 auto; padding: 60px 40px; background: white; }
    h1 { font-size: 32px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 24px 0; }
    p { font-size: 16px; line-height: 1.7; color: #292524; margin: 0 0 20px 0; }
    .button { display: inline-block; padding: 16px 32px; background-color: #1c1917; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <h1>SSELFIE</h1>
    ${options.firstName ? `<p>Hi ${options.firstName},</p>` : "<p>Hi there,</p>"}
    <p>Your trial ends in ${options.daysRemaining} day${options.daysRemaining !== 1 ? "s" : ""}.</p>
    <p>Don't miss out on all the features you've been enjoying. Upgrade now to keep creating stunning content.</p>
    <p style="text-align: center; margin: 32px 0;">
      <a href="${options.upgradeUrl}" class="button">Upgrade Now</a>
    </p>
    <p>XoXo,<br>Maya</p>
  </div>
</body>
</html>
  `.trim()
}

