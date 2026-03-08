export interface MilestoneBonusParams {
  firstName?: string
  milestone: number
  rewardAmount: number
}

export function generateMilestoneBonusEmail(params: MilestoneBonusParams): {
  html: string
  text: string
  subject: string
} {
  const { firstName, milestone, rewardAmount } = params
  const displayName = firstName || "there"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const studioUrl = `${siteUrl}/studio`

  // Different messages based on milestone
  let milestoneMessage = ""
  let encouragementMessage = ""

  if (milestone === 10) {
    milestoneMessage = "You're on your way — keep going!"
    encouragementMessage = "You've created your first 10 photos. That's consistency. That's showing up. Keep building your brand, one photo at a time."
  } else if (milestone === 50) {
    milestoneMessage = "You're officially consistent — 25 credits for your effort."
    encouragementMessage = "50 photos. That's not just showing up — that's building something real. Your visibility is growing, and we're here for it."
  } else if (milestone === 100) {
    milestoneMessage = "You're unstoppable — here's a bonus on us!"
    encouragementMessage = "100 photos. You're not just consistent — you're unstoppable. Your brand is visible, your content is authentic, and you're inspiring others. Keep going."
  } else {
    milestoneMessage = `You hit ${milestone} photos! Here's ${rewardAmount} bonus credits 🎉`
    encouragementMessage = `You've created ${milestone} photos. That's incredible consistency. Keep building your brand.`
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${milestoneMessage}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 40px 30px 20px 30px; text-align: center;">
              <h1 style="margin: 0 0 10px; font-family: Georgia, serif; font-size: 28px; line-height: 32px; color: #1c1917; font-weight: 300;">
                You hit ${milestone} photos! 🎉
              </h1>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #292524;">
                Hi ${displayName},
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px 40px 30px; text-align: center;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                ${milestoneMessage}
              </p>
              <p style="margin: 0 0 24px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                ${encouragementMessage}
              </p>
              <div style="background-color: #fafaf9; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #e7e5e4;">
                <p style="margin: 0 0 8px; color: #57534e; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">
                  Your Bonus
                </p>
                <p style="margin: 0; color: #1c1917; font-size: 32px; font-weight: 300; font-family: Georgia, serif;">
                  +${rewardAmount} Credits
                </p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${studioUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                  Keep Creating →
                </a>
              </div>
              <p style="margin: 40px 0 0; font-size: 14px; line-height: 20px; color: #57534e;">
                You've got this,<br/>
                — Maya + The SSELFIE Studio Team
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
Hi ${displayName},

${milestoneMessage}

${encouragementMessage}

Your Bonus: +${rewardAmount} Credits

Keep Creating →: ${studioUrl}

You've got this,
— Maya + The SSELFIE Studio Team
  `

  return {
    html,
    text,
    subject: `You hit ${milestone} photos! Here's ${rewardAmount} bonus credits 🎉`,
  }
}
