export interface BlueprintFollowupDay3Params {
  firstName?: string
  email: string
}

export function generateBlueprintFollowupDay3Email(params: BlueprintFollowupDay3Params): {
  html: string
  text: string
} {
  const { firstName, email } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  // Generate tracked links
  const photoshootUrl = `${siteUrl}/?utm_source=email&utm_medium=email&utm_campaign=blueprint_followup_day3&utm_content=cta&product=one_time`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3 Ways to Use Your Blueprint This Week</title>
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
                Let's Put Your Blueprint to Work
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
                It's been a few days since you got your blueprint. Let's make sure you're actually using it! Here are 3 things you can do THIS WEEK to start seeing results:
              </p>
              
              <div style="margin: 24px 0;">
                <h3 style="margin: 0 0 12px; color: #1c1917; font-size: 18px; font-weight: 400; font-family: Georgia, serif;">
                  1. Pick 3 Caption Templates & Fill Them In Today
                </h3>
                <p style="margin: 0 0 24px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  Don't overthink it. Just pick 3 templates from your blueprint, fill in the blanks with YOUR story, and save them. You'll use them this week.
                </p>
                
                <h3 style="margin: 0 0 12px; color: #1c1917; font-size: 18px; font-weight: 400; font-family: Georgia, serif;">
                  2. Schedule Your Posts for the Week
                </h3>
                <p style="margin: 0 0 24px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  Use your 30-day calendar to plan what you're posting this week. Pick 3-5 days and commit to posting on those days. Consistency beats perfection.
                </p>
                
                <h3 style="margin: 0 0 12px; color: #1c1917; font-size: 18px; font-weight: 400; font-family: Georgia, serif;">
                  3. Plan Your Selfie Photoshoot (Or Skip the Stress)
                </h3>
                <p style="margin: 0 0 24px; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  You need photos to go with those captions. You can either plan a traditional photoshoot (time, money, stress) or get 50 professional photos that look like you in 2 hours for $49.
                </p>
              </div>
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  <strong>Real talk:</strong> The blueprint is only valuable if you USE it. Don't let it sit in your inbox. Take action this week.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${photoshootUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Try Once - $49
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

Let's Put Your Blueprint to Work

Hey ${displayName},

It's been a few days since you got your blueprint. Let's make sure you're actually using it! Here are 3 things you can do THIS WEEK to start seeing results:

1. Pick 3 Caption Templates & Fill Them In Today
Don't overthink it. Just pick 3 templates from your blueprint, fill in the blanks with YOUR story, and save them. You'll use them this week.

2. Schedule Your Posts for the Week
Use your 30-day calendar to plan what you're posting this week. Pick 3-5 days and commit to posting on those days. Consistency beats perfection.

3. Plan Your Selfie Photoshoot (Or Skip the Stress)
You need photos to go with those captions. You can either plan a traditional photoshoot (time, money, stress) or get 50 professional photos that look like you in 2 hours for $49.

Real talk: The blueprint is only valuable if you USE it. Don't let it sit in your inbox. Take action this week.

Try Once - $49: ${photoshootUrl}

P.S. Stuck on something? Just reply to this email - I read every message.

Questions? Just reply to this email - I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
