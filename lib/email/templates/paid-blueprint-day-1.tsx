export interface PaidBlueprintDay1Params {
  firstName?: string
  email: string
  accessToken: string
}

export const PAID_BLUEPRINT_DAY1_SUBJECT = "Your photos are waiting (quick start inside)"

export function generatePaidBlueprintDay1Email(params: PaidBlueprintDay1Params): {
  html: string
  text: string
} {
  const { firstName, email, accessToken } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  // Generate tracked link to paid blueprint page
  const paidBlueprintUrl = `${siteUrl}/blueprint/paid?access=${accessToken}&utm_source=email&utm_medium=email&utm_campaign=paid_blueprint&utm_content=day1`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3 Fast Ways to Use Your Photos This Week</title>
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
              <h2 style="margin: 0; color: #292524; font-size: 24px; font-weight: 300; line-height: 1.4; font-family: Georgia, serif;">
                3 Fast Ways to Use Your Photos This Week
              </h2>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Hey ${displayName},
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                It's been a day since you got your photos. Let's make sure you're actually using them! Here are 3 quick ways to start THIS WEEK:
              </p>
              
              <div style="margin: 24px 0;">
                <h3 style="margin: 0 0 12px; color: #1c1917; font-size: 18px; font-weight: 400; font-family: Georgia, serif;">
                  1. Post Your First Photo Today
                </h3>
                <p style="margin: 0 0 24px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  Don't overthink it. Pick your favorite photo, write a quick caption about what you're working on, and post it. Done. You've started.
                </p>
                
                <h3 style="margin: 0 0 12px; color: #1c1917; font-size: 18px; font-weight: 400; font-family: Georgia, serif;">
                  2. Schedule 3 Posts for This Week
                </h3>
                <p style="margin: 0 0 24px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  Pick 3 photos from your collection and plan when you'll post them. Use your phone's calendar or a simple note. Consistency beats perfection.
                </p>
                
                <h3 style="margin: 0 0 12px; color: #1c1917; font-size: 18px; font-weight: 400; font-family: Georgia, serif;">
                  3. Download All 30 Photos to Your Phone
                </h3>
                <p style="margin: 0 0 24px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  Having them ready on your phone makes it so much easier to post. Download them all now so you're never scrambling for content.
                </p>
              </div>
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  <strong>Real talk:</strong> Your photos are only valuable if you USE them. Don't let them sit in your account. Take action this week.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${paidBlueprintUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  View & Download My Photos →
                </a>
              </div>
              
              <p style="margin: 24px 0 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6;">
                <strong>P.S.</strong> Stuck on something? Just reply to this email - I read every message.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6;">
                Questions? Just reply to this email - I read every message.
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

3 Fast Ways to Use Your Photos This Week

Hey ${displayName},

It's been a day since you got your photos. Let's make sure you're actually using them! Here are 3 quick ways to start THIS WEEK:

1. Post Your First Photo Today
Don't overthink it. Pick your favorite photo, write a quick caption about what you're working on, and post it. Done. You've started.

2. Schedule 3 Posts for This Week
Pick 3 photos from your collection and plan when you'll post them. Use your phone's calendar or a simple note. Consistency beats perfection.

3. Download All 30 Photos to Your Phone
Having them ready on your phone makes it so much easier to post. Download them all now so you're never scrambling for content.

Real talk: Your photos are only valuable if you USE them. Don't let them sit in your account. Take action this week.

View & Download My Photos →: ${paidBlueprintUrl}

P.S. Stuck on something? Just reply to this email - I read every message.

Questions? Just reply to this email - I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
