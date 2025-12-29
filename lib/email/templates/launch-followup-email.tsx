export interface LaunchFollowupEmailParams {
  recipientEmail: string
  recipientName?: string
  trackingId: string
}

export function generateLaunchFollowupEmail(params: LaunchFollowupEmailParams): {
  html: string
  text: string
} {
  const { recipientEmail, recipientName, trackingId } = params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  const membershipCheckoutUrl = `${siteUrl}/api/email/track-click?id=${trackingId}&type=studio_membership_followup&redirect=/checkout/membership`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Beta Window is Closing...</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 16px; color: #1c1917; font-size: 28px; font-weight: 600; line-height: 1.2;">
                ${recipientName ? recipientName : "Hey"}, the window is closing...
              </h1>
              <p style="margin: 0; color: #57534e; font-size: 16px; font-weight: 300; line-height: 1.6;">
                Only 10 days left at 50% OFF forever
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I sent you the launch email a few days ago, and I noticed you haven't claimed your spot yet.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I get it. New tools. New investments. It's a lot.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                But here's the thing: <strong>we've already hit 30 founding members in the first 48 hours.</strong>
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 400; line-height: 1.7;">
                And the beta pricing? It ends in 10 days.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                After that, Content Creator Studio goes from $49.50/mo to $79/mo. That's the regular price. Forever.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                But if you join NOW as a founding member? <strong>You lock in $49.50/month for life.</strong>
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #1c1917; border-radius: 12px; padding: 32px; text-align: center;">
                <div style="background-color: #ef4444; color: #ffffff; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 16px;">
                  ⏰ BETA ENDING IN 10 DAYS
                </div>
                <h3 style="margin: 0 0 8px; color: #fafaf9; font-size: 24px; font-weight: 600;">
                  SSELFIE Studio Founding Member
                </h3>
                <p style="margin: 0 0 4px; color: #fafaf9; font-size: 32px; font-weight: 700;">
                  $49.50<span style="font-size: 18px; font-weight: 400; color: #d6d3d1;">/month</span>
                </p>
                <p style="margin: 0 0 24px; color: #a8a29e; font-size: 14px; font-weight: 300;">
                  Regular price $79/mo - Save $354/year forever
                </p>
                <a href="${membershipCheckoutUrl}" style="display: inline-block; background-color: #fafaf9; color: #1c1917; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;">
                  CLAIM YOUR FOUNDING SPOT
                </a>
                <p style="margin: 20px 0 0; color: #d6d3d1; font-size: 13px; font-weight: 300;">
                  30 founding members joined. Don't miss this.
                </p>
              </div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7;">
                This isn't just about AI photos. It's about finally showing up as the face of your brand without the fear, the cost, or the hassle.
              </p>
              <p style="margin: 0; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7;">
                I built this FOR you. And I want you there with me.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 28px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif; text-align: center;">
                S S E L F I E
              </h1>
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6; text-align: center;">
                Questions? Just reply-I read every message.
              </p>
              <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300; text-align: center;">
                XoXo Sandra 💋
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
${recipientName ? recipientName : "Hey"}, the window is closing...

Only 10 days left at 50% OFF forever

I sent you the launch email a few days ago, and I noticed you haven't claimed your spot yet.

I get it. New tools. New investments. It's a lot.

But here's the thing: we've already hit 30 founding members in the first 48 hours.

And the beta pricing? It ends in 10 days.

After that, Content Creator Studio goes from $49.50/mo to $79/mo. That's the regular price. Forever.

But if you join NOW as a founding member? You lock in $49.50/month for life.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ BETA ENDING IN 10 DAYS

SSELFIE Studio Founding Member
$49.50/month (Regular price $79/mo)
Save $354/year forever

→ Claim your spot: ${membershipCheckoutUrl}

30 founding members joined. Don't miss this.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This isn't just about AI photos. It's about finally showing up as the face of your brand without the fear, the cost, or the hassle.

I built this FOR you. And I want you there with me.

XoXo Sandra 💋

S S E L F I E
  `

  return { html, text }
}
