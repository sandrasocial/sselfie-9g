export interface BlueprintFollowupDay7Params {
  firstName?: string
  email: string
}

export function generateBlueprintFollowupDay7Email(params: BlueprintFollowupDay7Params): {
  html: string
  text: string
} {
  const { firstName, email } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  // Generate tracked links
  const studioUrl = `${siteUrl}/?utm_source=email&utm_medium=email&utm_campaign=blueprint_followup_day7&utm_content=cta&product=studio_membership`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>This Could Be You</title>
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
                This Could Be You
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
                I want to share a story with you. One of our members - let's call her Sarah - started exactly where you are right now.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                She completed the blueprint, got her caption templates, and decided to try one AI photoshoot. Just one. $49.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                She used those photos with the caption templates from her blueprint. Posted consistently 3x a week. Used the calendar to plan her content.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Three months later? She went from 5,000 followers to 25,000. Her DMs are full of potential clients. Her content actually converts.
              </p>
              
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "I finally have a system that works. No more scrambling for content. No more wondering what to post. SSELFIE gave me everything I needed."
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                  - Sarah, SSELFIE Member
                </p>
              </div>
              
              <p style="margin: 24px 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Here's what made the difference:
              </p>
              
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.8;">
                <li style="margin-bottom: 12px;">Consistent content (using the calendar)</li>
                <li style="margin-bottom: 12px;">Professional photos that actually looked like her</li>
                <li style="margin-bottom: 12px;">Caption templates that resonated with her audience</li>
                <li style="margin-bottom: 12px;">A system she could actually stick to</li>
              </ul>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                This isn't about getting lucky. It's about having the right system and using it consistently.
              </p>
              
              <p style="margin: 0 0 24px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Ready to start your transformation? Join Studio Membership for $79/month and get unlimited photos, feed planning, and new templates every month.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${studioUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Start Your Transformation → Join Studio for $79/mo
                </a>
              </div>
              
              <div style="background-color: #fafaf9; padding: 20px; margin: 24px 0; border-radius: 8px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 400; line-height: 1.7;">
                  What's included in Studio:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.8;">
                  <li>Unlimited professional photoshoots</li>
                  <li>100+ images per month</li>
                  <li>Feed planning & strategy</li>
                  <li>New caption templates monthly</li>
                  <li>Cancel anytime</li>
                </ul>
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

This Could Be You

Hey ${displayName},

I want to share a story with you. One of our members - let's call her Sarah - started exactly where you are right now.

She completed the blueprint, got her caption templates, and decided to try one AI photoshoot. Just one. $49.

She used those photos with the caption templates from her blueprint. Posted consistently 3x a week. Used the calendar to plan her content.

Three months later? She went from 5,000 followers to 25,000. Her DMs are full of potential clients. Her content actually converts.

"I finally have a system that works. No more scrambling for content. No more wondering what to post. SSELFIE gave me everything I needed."
- Sarah, SSELFIE Member

Here's what made the difference:

• Consistent content (using the calendar)
• Professional photos that actually looked like her
• Caption templates that resonated with her audience
• A system she could actually stick to

This isn't about getting lucky. It's about having the right system and using it consistently.

Ready to start your transformation? Join Studio Membership for $79/month and get unlimited photos, feed planning, and new templates every month.

Start Your Transformation → Join Studio for $79/mo: ${studioUrl}

What's included in Studio:
• Unlimited professional photoshoots
• 100+ images per month
• Feed planning & strategy
• New caption templates monthly
• Cancel anytime

Questions? Just reply to this email - I read every message.

XoXo Sandra 💋

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
