export interface LaunchEmailParams {
  recipientName?: string
  recipientEmail?: string
  trackingId?: string
}

export function generateLaunchEmail(params: LaunchEmailParams = {}): {
  html: string
  text: string
} {
  const { recipientName, recipientEmail, trackingId } = params
  const heroImage =
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1053-fltQEJEqPNk8YEHba1hPm2R1mOHcFc-6fUsJ79dRJRnK38O9iNRmryvwMTA42.png"

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  const oneTimeCheckoutUrl = `${siteUrl}/studio?checkout=one_time${trackingId ? `&ref=${trackingId}` : ""}`
  const membershipCheckoutUrl = `${siteUrl}/studio?checkout=studio_membership${trackingId ? `&ref=${trackingId}` : ""}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>THE DOORS ARE OPEN 🚨</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="${heroImage}" alt="SSELFIE Studio Beta Launch" style="width: 100%; height: auto; display: block;" />
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 16px; color: #1c1917; font-size: 32px; font-weight: 600; line-height: 1.2;">
                THE DOORS ARE OPEN. 🚨
              </h1>
              <p style="margin: 0; color: #57534e; font-size: 16px; font-weight: 300; line-height: 1.6; font-style: italic;">
                After 6 months of building... After 2 crashed launches... After crying, rebuilding, and learning more about myself than I ever expected...
              </p>
            </td>
          </tr>
          
          <!-- Main Message -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 20px; color: #1c1917; font-size: 20px; font-weight: 500; text-align: center;">
                SSELFIE Studio Beta is officially LIVE.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                ${recipientName ? `${recipientName}, ` : ""}I'm not going to make this long and salesy because honestly? If you've been following this journey, you already know what this is about.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                This is for the woman who's tired of hiding.
              </p>
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                The entrepreneur who knows she needs to show her face but keeps putting it off.
              </p>
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                The creator who's done using the same 5 selfies from 2 years ago.
              </p>
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                The coach who wants to look professional but can't afford a $2000 photoshoot.
              </p>
              
              <p style="margin: 20px 0 16px; color: #292524; font-size: 15px; font-weight: 400; line-height: 1.7;">
                This is your photography studio. Your creative team. Your content library.
              </p>
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                All powered by AI that actually understands YOUR brand.
              </p>
            </td>
          </tr>
          
          <!-- Pricing Cards -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <h2 style="margin: 0 0 24px; color: #1c1917; font-size: 20px; font-weight: 500; text-align: center;">
                Choose your Beta experience:
              </h2>
              
              <!-- One-Time Session Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="background-color: #fafaf9; border-radius: 12px; border: 2px solid #e7e5e4; padding: 28px;">
                    <h3 style="margin: 0 0 8px; color: #1c1917; font-size: 18px; font-weight: 600;">
                      ONE-TIME SESSION
                    </h3>
                    <p style="margin: 0 0 4px; color: #1c1917; font-size: 28px; font-weight: 700;">
                      $24.50
                    </p>
                    <p style="margin: 0 0 4px; color: #a8a29e; font-size: 13px; font-weight: 300; text-decoration: line-through;">
                      Regular $49
                    </p>
                    <p style="margin: 0 0 20px; color: #78716c; font-size: 14px; font-weight: 300;">
                      Perfect for testing the basics
                    </p>
                    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.8;">
                      <li>Custom AI model trained on YOUR photos</li>
                      <li>70 professional images with Maya</li>
                      <li>Experience the SSELFIE magic before committing</li>
                    </ul>
                    <a href="${oneTimeCheckoutUrl}" style="display: block; background-color: #1c1917; color: #fafaf9; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; text-align: center;">
                      TRY ONCE
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Studio Membership Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #1c1917; border-radius: 12px; border: 3px solid #292524; padding: 28px; position: relative;">
                    <div style="background-color: #ef4444; color: #ffffff; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 12px;">
                      BETA SPECIAL
                    </div>
                    <h3 style="margin: 0 0 8px; color: #fafaf9; font-size: 18px; font-weight: 600;">
                      SSELFIE STUDIO
                    </h3>
                    <p style="margin: 0 0 4px; color: #fafaf9; font-size: 28px; font-weight: 700;">
                      $49.50<span style="font-size: 16px; font-weight: 400; color: #d6d3d1;">/month</span>
                    </p>
                    <p style="margin: 0 0 4px; color: #a8a29e; font-size: 13px; font-weight: 300; text-decoration: line-through;">
                      Regular $99/mo
                    </p>
                    <p style="margin: 0 0 20px; color: #d6d3d1; font-size: 14px; font-weight: 300;">
                      50% OFF FOREVER as a founding member
                    </p>
                    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #e7e5e4; font-size: 14px; font-weight: 300; line-height: 1.8;">
                      <li>Custom AI model trained on YOUR photos</li>
                      <li>100+ professional images monthly</li>
                      <li>Full academy with video courses & templates</li>
                      <li>Feed Designer for content planning</li>
                      <li>Monthly drops with newest strategies</li>
                      <li>Direct access to ME for support</li>
                    </ul>
                    <a href="${membershipCheckoutUrl}" style="display: block; background-color: #fafaf9; color: #1c1917; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; text-align: center;">
                      CLAIM YOUR SPOT
                    </a>
                    <p style="margin: 16px 0 0; color: #d6d3d1; font-size: 12px; font-weight: 300; text-align: center;">
                      🏆 Founding member badge included
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Personal Note -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  Beta spots are limited because I want to personally support every single person who joins. This isn't some massive faceless platform. It's my baby. And I care about YOUR success.
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300; font-style: italic;">
                  P.S. We already had 30 founding members join in the first 2 hours. Only 10 days left at this beta price.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 28px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif; text-align: center;">
                S S E L F I E
              </h1>
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6; text-align: center;">
                Questions? Just reply to this email-I read every message.
              </p>
              <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300; text-align: center;">
                XoXo Sandra 💋
              </p>
              <p style="margin: 16px 0 0; color: #a8a29e; font-size: 11px; font-weight: 300; text-align: center;">
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
THE DOORS ARE OPEN. 🚨

After 6 months of building... After 2 crashed launches... After crying, rebuilding, and learning more about myself than I ever expected...

SSELFIE Studio Beta is officially LIVE.

${recipientName ? `${recipientName}, ` : ""}I'm not going to make this long and salesy because honestly? If you've been following this journey, you already know what this is about.

This is for the woman who's tired of hiding.
The entrepreneur who knows she needs to show her face but keeps putting it off.
The creator who's done using the same 5 selfies from 2 years ago.
The coach who wants to look professional but can't afford a $2000 photoshoot.

This is your photography studio. Your creative team. Your content library.
All powered by AI that actually understands YOUR brand.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHOOSE YOUR BETA EXPERIENCE:

ONE-TIME SESSION - $24.50 (Regular $49)
Perfect for testing the basics
• Custom AI model trained on YOUR photos
• 70 professional images with Maya
• Experience the SSELFIE magic before committing
→ Get started: ${oneTimeCheckoutUrl}

SSELFIE STUDIO - $49.50/month (50% OFF FOREVER)
Regular $97/mo - For the woman ready to transform her entire brand
• Custom AI model trained on YOUR photos
• 100+ professional images monthly
• Full academy with video courses & templates
• Feed Designer for content planning
• Monthly drops with newest strategies
• Direct access to ME for support
• Founding member badge included
→ Claim your spot: ${membershipCheckoutUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Beta spots are limited because I want to personally support every single person who joins. This isn't some massive faceless platform. It's my baby. And I care about YOUR success.

P.S. We already had 30 founding members join in the first 2 hours. Only 10 days left at this beta price.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

S S E L F I E

Questions? Just reply to this email-I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
