export interface PaymentRecoveryParams {
  firstName?: string
  email: string
  planName?: string
  amount?: string
}

// EMAIL 1: Payment Update Needed (Immediate)
export function generatePaymentUpdateEmail(params: PaymentRecoveryParams) {
  const { firstName, email, planName = "Blueprint", amount = "$47" } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quick Payment Update Needed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #fafaf9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px;">
    
    <h2 style="color: #1c1917; font-size: 22px; margin: 0 0 20px;">Hi ${displayName},</h2>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">There was a small issue processing your payment for SSELFIE ${planName}.</p>
    
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border: 1px solid #f59e0b; margin: 20px 0;">
      <h3 style="color: #92400e; margin: 0 0 10px; font-size: 16px;">💳 Quick Fix Needed</h3>
      <p style="margin: 0; color: #92400e; font-size: 14px;">Your card couldn't be charged for your ${planName} (${amount}). This happens sometimes!</p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">No worries — it takes 30 seconds to fix:</p>
    
    <ol style="color: #44403c; line-height: 1.8; padding-left: 20px;">
      <li>Click the button below</li>
      <li>Update your payment method</li>
      <li>Continue creating amazing content!</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${siteUrl}/account/billing?utm_source=email&utm_medium=payment_recovery&utm_campaign=update_payment" 
         style="background: #1c1917; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
        Update Payment Method →
      </a>
    </div>
    
    <div style="background: #f5f5f4; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; color: #57534e; font-size: 14px; text-align: center;">
        <strong>Your account is still active</strong> — just need to update your payment to continue!
      </p>
    </div>
    
    <p style="font-size: 14px; color: #78716c; text-align: center; margin: 20px 0 0;">
      Questions? Just reply and I'll help sort it out!<br>
      Sandra ✨
    </p>
    
  </div>
</body>
</html>`

  const text = `Hi ${displayName},

There was a small issue processing your payment for SSELFIE ${planName}.

💳 Quick Fix Needed
Your card couldn't be charged for your ${planName} (${amount}). This happens sometimes!

No worries — it takes 30 seconds to fix:
1. Click the link below
2. Update your payment method  
3. Continue creating amazing content!

Update Payment Method: ${siteUrl}/account/billing?utm_source=email&utm_medium=payment_recovery&utm_campaign=update_payment

Your account is still active — just need to update your payment to continue!

Questions? Just reply and I'll help sort it out!
Sandra ✨`

  return { html, text }
}

// EMAIL 2: We Miss You (Day 3 after failed payment)
export function generateWeMissYouEmail(params: PaymentRecoveryParams) {
  const { firstName, email, planName = "Blueprint" } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>We Miss You in SSELFIE</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #fafaf9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px;">
    
    <h2 style="color: #1c1917; font-size: 22px; margin: 0 0 20px;">${displayName}, we miss you! 💔</h2>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">I noticed your ${planName} payment didn't go through a few days ago, and I wanted to reach out personally.</p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">I know how it feels when tech stuff gets in the way of creating. That's exactly why I built SSELFIE — to make showing up online <em>easier</em>, not harder.</p>
    
    <div style="background: #eff6ff; padding: 25px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #1d4ed8; margin: 0 0 15px; font-size: 18px;">💫 Special Welcome Back Offer</h3>
      <p style="margin: 0 0 15px; color: #1e40af;">Because I want you back in the SSELFIE community:</p>
      <ul style="color: #1e40af; margin: 0; line-height: 1.8;">
        <li><strong>30 professional photos</strong> styled for your brand</li>
        <li><strong>Complete Instagram strategy</strong></li>
        <li><strong>Ready-to-use captions</strong> for each post</li>
        <li><strong>Content calendar</strong> for next month</li>
      </ul>
    </div>
    
    <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #f87171; margin: 25px 0;">
      <p style="margin: 0; color: #dc2626; font-size: 15px; text-align: center; font-weight: 600;">🎁 This week only: Get your ${planName} for just $37</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${siteUrl}/checkout/blueprint?discount=WELCOME_BACK&utm_source=email&utm_medium=recovery&utm_campaign=we_miss_you" 
         style="background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
        Welcome Back - Get Blueprint ($37) →
      </a>
    </div>
    
    <p style="font-size: 14px; color: #78716c; text-align: center; margin: 20px 0 0;">
      Questions? Just reply — I personally read every email.<br>
      Sandra ✨
    </p>
    
  </div>
</body>
</html>`

  const text = `${displayName}, we miss you! 💔

I noticed your ${planName} payment didn't go through a few days ago, and I wanted to reach out personally.

I know how it feels when tech stuff gets in the way of creating. That's exactly why I built SSELFIE — to make showing up online easier, not harder.

💫 Special Welcome Back Offer

Because I want you back in the SSELFIE community:
• 30 professional photos styled for your brand
• Complete Instagram strategy
• Ready-to-use captions for each post  
• Content calendar for next month

🎁 This week only: Get your ${planName} for just $37

Welcome Back: ${siteUrl}/checkout/blueprint?discount=WELCOME_BACK&utm_source=email&utm_medium=recovery&utm_campaign=we_miss_you

Questions? Just reply — I personally read every email.
Sandra ✨`

  return { html, text }
}