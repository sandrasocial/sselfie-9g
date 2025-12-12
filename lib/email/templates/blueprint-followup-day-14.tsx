export interface BlueprintFollowupDay14Params {
  firstName?: string
  email: string
}

export function generateBlueprintFollowupDay14Email(params: BlueprintFollowupDay14Params): {
  html: string
  text: string
} {
  const { firstName, email } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  // Generate tracked links with discount code
  const photoshootUrl = `${siteUrl}/?utm_source=email&utm_medium=email&utm_campaign=blueprint_followup_day14&utm_content=cta&product=one_time&discount=BLUEPRINT10`
  const studioUrl = `${siteUrl}/?utm_source=email&utm_medium=email&utm_campaign=blueprint_followup_day14&utm_content=cta&product=studio_membership`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Still thinking about it? Here's $10 off</title>
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
                I Want to Help You Get Started
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
                I noticed you got your blueprint but haven't tried SSELFIE yet. No pressure at all - but I wanted to make it easier for you.
              </p>
              
              <div style="background-color: #1c1917; border-radius: 12px; padding: 32px; text-align: center; margin: 24px 0;">
                <div style="background-color: #ef4444; color: #ffffff; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 16px;">
                  ⏰ VALID FOR 48 HOURS
                </div>
                <h3 style="margin: 0 0 8px; color: #fafaf9; font-size: 24px; font-weight: 400; font-family: Georgia, serif;">
                  $10 Off Your First Photoshoot
                </h3>
                <p style="margin: 0 0 4px; color: #fafaf9; font-size: 32px; font-weight: 300; font-family: Georgia, serif;">
                  Use Code: <strong style="font-weight: 400;">BLUEPRINT10</strong>
                </p>
                <p style="margin: 0 0 24px; color: #a8a29e; font-size: 14px; font-weight: 300;">
                  That's $39 instead of $49
                </p>
                <a href="${photoshootUrl}" style="display: inline-block; background-color: #fafaf9; color: #1c1917; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Claim Your $10 Off → Try SSELFIE
                </a>
              </div>
              
              <p style="margin: 24px 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Or, if you're ready to go all-in, start with Studio membership (no discount needed - it's already the best value at $79/month).
              </p>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${studioUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Start Studio Membership - $79/mo
                </a>
              </div>
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  <strong>Final note:</strong> This is the last email about this. If SSELFIE isn't for you right now, that's totally okay. Keep the blueprint and use it whenever you're ready. 💕
                </p>
              </div>
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

I Want to Help You Get Started

Hey ${displayName},

I noticed you got your blueprint but haven't tried SSELFIE yet. No pressure at all - but I wanted to make it easier for you.

⏰ VALID FOR 48 HOURS

$10 Off Your First Photoshoot

Use Code: BLUEPRINT10

That's $39 instead of $49

Claim Your $10 Off → Try SSELFIE: ${photoshootUrl}

Or, if you're ready to go all-in, start with Studio membership (no discount needed - it's already the best value at $79/month).

Start Studio Membership - $79/mo: ${studioUrl}

Final note: This is the last email about this. If SSELFIE isn't for you right now, that's totally okay. Keep the blueprint and use it whenever you're ready. 💕

Questions? Just reply to this email - I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
