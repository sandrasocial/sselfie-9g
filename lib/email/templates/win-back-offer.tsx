import { generateTrackedCheckoutLink } from "@/lib/email/generate-tracked-link"

export interface WinBackOfferParams {
  firstName?: string
  recipientEmail: string
  offerDiscount?: number // Percentage discount (e.g., 20 for 20% off)
  offerAmount?: number // Dollar amount discount (e.g., 10 for $10 off)
  offerCode?: string
  offerExpiry?: string
  campaignId?: number
  campaignName?: string
}

export function generateWinBackOfferEmail(params: WinBackOfferParams): {
  html: string
  text: string
} {
  const { firstName, recipientEmail, offerDiscount, offerAmount, offerCode, offerExpiry, campaignId, campaignName } = params
  const displayName = firstName || recipientEmail.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  // Determine if we're showing a dollar amount or percentage discount
  const hasOffer = offerAmount !== undefined || offerDiscount !== undefined
  const isDollarAmount = offerAmount !== undefined
  const discountDisplay = isDollarAmount 
    ? `$${offerAmount} OFF`
    : offerDiscount 
      ? `${offerDiscount}% OFF`
      : ""
  
  // Use tracked link if campaignId is available, otherwise fall back to regular link
  let checkoutUrl: string
  if (campaignId && campaignName) {
    const baseUrl = generateTrackedCheckoutLink(campaignId, campaignName, "win_back_offer", "studio_membership")
    const url = new URL(baseUrl)
    if (offerCode) {
      url.searchParams.set('code', offerCode)
    }
    checkoutUrl = url.toString()
  } else {
    checkoutUrl = `${siteUrl}/studio?checkout=studio_membership${offerCode ? `&code=${offerCode}` : ''}`
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We Miss You - Here's Something Special</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 28px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif;">
                S S E L F I E
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Hey ${displayName},
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I'll be honest-I miss you.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                It's been a while since we connected, and I've been thinking about what might have happened. Maybe life got busy. Maybe you weren't sure if SSELFIE was right for you. Maybe you just needed more time.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Whatever it was, I want you to know: I get it. And I want to make it easy for you to come back.
              </p>
              
              ${hasOffer ? `
              <!-- Offer Box -->
              <div style="background-color: #1c1917; border-radius: 12px; padding: 32px; margin: 24px 0; text-align: center;">
                <p style="margin: 0 0 12px; color: #fafaf9; font-size: 13px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase;">
                  SPECIAL OFFER JUST FOR YOU
                </p>
                <h2 style="margin: 0 0 16px; color: #fafaf9; font-size: 36px; font-weight: 300; line-height: 1.2;">
                  ${discountDisplay}
                </h2>
                <p style="margin: 0 0 20px; color: #d6d3d1; font-size: 15px; font-weight: 300; line-height: 1.6;">
                  ${isDollarAmount ? "Your first photoshoot" : "Your first month of SSELFIE Studio"}
                </p>
                ${offerCode ? `
                <p style="margin: 0 0 20px; color: #fafaf9; font-size: 14px; font-weight: 400;">
                  Use code: <strong style="letter-spacing: 0.1em;">${offerCode}</strong>
                </p>
                ` : ''}
                ${offerExpiry ? `
                <p style="margin: 0; color: #a8a29e; font-size: 12px; font-weight: 300;">
                  Valid until ${offerExpiry}
                </p>
                ` : ''}
              </div>
              ` : ''}
              
              <p style="margin: 24px 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Here's what you'll get with SSELFIE Studio:
              </p>
              
              <ul style="margin: 0 0 24px 20px; padding: 0; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.8;">
                <li style="margin-bottom: 12px;">150+ professional photos every month</li>
                <li style="margin-bottom: 12px;">Full Academy with video courses and templates</li>
                <li style="margin-bottom: 12px;">Feed Designer for content planning</li>
                <li style="margin-bottom: 12px;">Monthly drops with newest strategies</li>
                <li style="margin-bottom: 12px;">Direct access to me for support</li>
              </ul>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                This is your chance to finally show up online in a way that feels authentic and powerful. No more hiding. No more worrying about what to post. Just you, being yourself, consistently.
              </p>
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "I came back after months away, and I'm so glad I did. SSELFIE gave me the confidence to finally be the face of my brand."
                </p>
                <p style="margin: 8px 0 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  - Jessica, Studio Member
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${checkoutUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Claim Your Offer
                </a>
              </div>
              
              <p style="margin: 24px 0 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                This offer is just for you, and it won't last forever. But more importantly, I want you back because I believe in what you're building. And I want to help you get there.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6;">
                Questions? Just reply to this email-I read every message.
              </p>
              <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                XoXo Sandra 💋
              </p>
              <p style="margin: 16px 0 0; color: #a8a29e; font-size: 11px; font-weight: 300;">
                © ${new Date().getFullYear()} SSELFIE. All rights reserved.
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
S S E L F I E

Hey ${displayName},

I'll be honest-I miss you.

It's been a while since we connected, and I've been thinking about what might have happened. Maybe life got busy. Maybe you weren't sure if SSELFIE was right for you. Maybe you just needed more time.

Whatever it was, I want you to know: I get it. And I want to make it easy for you to come back.

${hasOffer ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPECIAL OFFER JUST FOR YOU

${discountDisplay}
${isDollarAmount ? "Your first photoshoot" : "Your first month of SSELFIE Studio"}
${offerCode ? `Use code: ${offerCode}` : ''}
${offerExpiry ? `Valid until ${offerExpiry}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

Here's what you'll get with SSELFIE Studio:
- 150+ professional photos every month
- Full Academy with video courses and templates
- Feed Designer for content planning
- Monthly drops with newest strategies
- Direct access to me for support

This is your chance to finally show up online in a way that feels authentic and powerful. No more hiding. No more worrying about what to post. Just you, being yourself, consistently.

"I came back after months away, and I'm so glad I did. SSELFIE gave me the confidence to finally be the face of my brand."
- Jessica, Studio Member

Claim Your Offer: ${checkoutUrl}

This offer is just for you, and it won't last forever. But more importantly, I want you back because I believe in what you're building. And I want to help you get there.

Questions? Just reply to this email-I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}

