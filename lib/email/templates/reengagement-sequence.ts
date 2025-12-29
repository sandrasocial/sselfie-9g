/**
 * Re-engagement Sequence Email Templates
 * For inactive users (30+ days no activity)
 * Day 0, Day 7, Day 14
 * Written in Alex's voice: strategic, enthusiastic, direct
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export interface ReengagementSequenceParams {
  firstName?: string
  campaignId?: number
}

function getCheckoutLink(type: 'membership' | 'one-time', campaignName: string, campaignId?: number, promoCode?: string): string {
  const campaignSlug = campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const baseUrl = `${SITE_URL}/checkout/${type}`
  const params = new URLSearchParams({
    utm_source: 'email',
    utm_medium: 'email',
    utm_campaign: campaignSlug,
    utm_content: 'cta_button',
  })
  if (campaignId) {
    params.append('campaign_id', campaignId.toString())
  }
  if (promoCode) {
    params.append('promo', promoCode)
  }
  return `${baseUrl}?${params.toString()}`
}

/**
 * Day 0 - Miss You
 * Sent when user is 30+ days inactive
 */
export function generateReengagementDay0(params: ReengagementSequenceParams = {}) {
  const { firstName, campaignId } = params
  const campaignName = 'reengagement-day-0'
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Haven't seen you in a while... 👀</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <tr>
            <td style="background-color: #0c0a09; padding: 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Times New Roman', serif; font-size: 32px; font-weight: 200; letter-spacing: 0.3em; color: #fafaf9; text-transform: uppercase;">
                S S E L F I E
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                ${firstName && firstName !== 'friend' ? `Hey ${firstName},` : ''}
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Haven't seen you in Studio for a while. Life gets busy, I get it.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                But here's the thing - we've added some features since you were last here that you're going to want to see. Maya's gotten smarter. The process is faster. The results are better.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                No pressure, no hard sell. Just genuinely curious if you're ready to come back and see what's new.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Your account is waiting. Everything is exactly as you left it.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${SITE_URL}/studio" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  See What's New
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                <strong>P.S.</strong> If you need anything or have questions, just reply. We're here to help.
              </p>

              <p style="margin: 24px 0 0; font-size: 16px; color: #1c1917;">
                XoXo Sandra 💋
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px; background-color: #f5f5f4; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                SSELFIE Studio - Where Visibility Meets Financial Freedom
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #78716c; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${firstName && firstName !== 'friend' ? `Hey ${firstName},\n\n` : ''}Haven't seen you in Studio for a while. Life gets busy, I get it.

But here's the thing - we've added some features since you were last here that you're going to want to see. Maya's gotten smarter. The process is faster. The results are better.

No pressure, no hard sell. Just genuinely curious if you're ready to come back and see what's new.

Your account is waiting. Everything is exactly as you left it.

See What's New: ${SITE_URL}/studio

P.S. If you need anything or have questions, just reply. We're here to help.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text, subject: "Haven't seen you in a while... 👀" }
}

/**
 * Day 7 - New Features
 * Sent 7 days after re-engagement email
 */
export function generateReengagementDay7(params: ReengagementSequenceParams = {}) {
  const { firstName, campaignId } = params
  const campaignName = 'reengagement-day-7'
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You haven't seen what Maya can do now... 🚀</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <tr>
            <td style="background-color: #0c0a09; padding: 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Times New Roman', serif; font-size: 32px; font-weight: 200; letter-spacing: 0.3em; color: #fafaf9; text-transform: uppercase;">
                S S E L F I E
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                ${firstName && firstName !== 'friend' ? `Hey ${firstName},` : ''}
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Remember when you first joined Studio? Maya was pretty good. But honestly? She's gotten SO much better since then.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's what's new:
              </p>

              <ul style="margin: 0 0 24px; padding-left: 20px; color: #1c1917; font-size: 16px; line-height: 1.8;">
                <li style="margin-bottom: 12px;"><strong>Video Clips:</strong> Create 20 professional video clips per month. Perfect for Reels. Game changer for engagement.</li>
                <li style="margin-bottom: 12px;"><strong>Smarter Prompts:</strong> Maya understands context better. Ask for "coffee shop entrepreneur vibe" and she gets it instantly.</li>
                <li style="margin-bottom: 12px;"><strong>Faster Generation:</strong> Photos are ready in minutes, not hours. We've optimized everything.</li>
                <li style="margin-bottom: 12px;"><strong>Feed Designer:</strong> Plan your entire Instagram grid before you post. See how photos work together.</li>
                <li style="margin-bottom: 12px;"><strong>Pro Mode:</strong> Want editorial-quality photos without training a model? Upload reference images and get luxury influencer content instantly.</li>
              </ul>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Members who came back are creating content faster than ever. One member told me she saves 10 hours per month now.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Your account is waiting. Come see what's new.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${SITE_URL}/studio" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Try New Features
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                <strong>P.S.</strong> If you're not a member anymore, I've got a special comeback offer for you. Just reply and ask.
              </p>

              <p style="margin: 24px 0 0; font-size: 16px; color: #1c1917;">
                XoXo Sandra 💋
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px; background-color: #f5f5f4; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                SSELFIE Studio - Where Visibility Meets Financial Freedom
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #78716c; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${firstName && firstName !== 'friend' ? `Hey ${firstName},\n\n` : ''}Remember when you first joined Studio? Maya was pretty good. But honestly? She's gotten SO much better since then.

Here's what's new:
- Video Clips: Create 20 professional video clips per month. Perfect for Reels. Game changer for engagement.
- Smarter Prompts: Maya understands context better. Ask for "coffee shop entrepreneur vibe" and she gets it instantly.
- Faster Generation: Photos are ready in minutes, not hours. We've optimized everything.
- Feed Designer: Plan your entire Instagram grid before you post. See how photos work together.
- Pro Mode: Want editorial-quality photos without training a model? Upload reference images and get luxury influencer content instantly.

Members who came back are creating content faster than ever. One member told me she saves 10 hours per month now.

Your account is waiting. Come see what's new.

Try New Features: ${SITE_URL}/studio

P.S. If you're not a member anymore, I've got a special comeback offer for you. Just reply and ask.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text, subject: "You haven't seen what Maya can do now... 🚀" }
}

/**
 * Day 14 - Final Offer
 * Sent 14 days after re-engagement email
 */
export function generateReengagementDay14(params: ReengagementSequenceParams = {}) {
  const { firstName, campaignId } = params
  const campaignName = 'reengagement-day-14'
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Last call: Come back to Studio (50% off) 💪</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <tr>
            <td style="background-color: #0c0a09; padding: 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Times New Roman', serif; font-size: 32px; font-weight: 200; letter-spacing: 0.3em; color: #fafaf9; text-transform: uppercase;">
                S S E L F I E
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                ${firstName && firstName !== 'friend' ? `Hey ${firstName},` : ''}
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                This is my last email. I don't want to bug you, but I also don't want you to miss out.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                If you're not a member anymore, here's a comeback offer: 50% off your first month. That's $39.50 instead of $79.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Why? Because I believe in second chances. Because I know life gets busy. Because I want you to see how much Studio has improved.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's what you're missing:
              </p>

              <ul style="margin: 0 0 24px; padding-left: 20px; color: #1c1917; font-size: 16px; line-height: 1.8;">
                <li style="margin-bottom: 12px;"><strong>100+ professional photos per month</strong> - Never run out of content</li>
                <li style="margin-bottom: 12px;"><strong>20 video clips</strong> - Perfect for Reels and Stories</li>
                <li style="margin-bottom: 12px;"><strong>Feed Designer</strong> - Plan your entire Instagram grid</li>
                <li style="margin-bottom: 12px;"><strong>Maya's latest features</strong> - Smarter, faster, better results</li>
                <li style="margin-bottom: 12px;"><strong>Pro Mode</strong> - Editorial-quality photos without model training</li>
              </ul>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                This offer expires in 48 hours. After that, it's gone forever.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${getCheckoutLink('membership', campaignName, campaignId, 'COMEBACK50')}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Claim Your Comeback Offer
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                <strong>P.S.</strong> If you're not interested, just reply and say "unsubscribe." No hard feelings. But if you are, don't wait. This offer won't return.
              </p>

              <p style="margin: 24px 0 0; font-size: 16px; color: #1c1917;">
                XoXo Sandra 💋
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 30px; background-color: #f5f5f4; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                SSELFIE Studio - Where Visibility Meets Financial Freedom
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #78716c; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${firstName && firstName !== 'friend' ? `Hey ${firstName},\n\n` : ''}This is my last email. I don't want to bug you, but I also don't want you to miss out.

If you're not a member anymore, here's a comeback offer: 50% off your first month. That's $39.50 instead of $79.

Why? Because I believe in second chances. Because I know life gets busy. Because I want you to see how much Studio has improved.

Here's what you're missing:
- 100+ professional photos per month - Never run out of content
- 20 video clips - Perfect for Reels and Stories
- Feed Designer - Plan your entire Instagram grid
- Maya's latest features - Smarter, faster, better results
- Pro Mode - Editorial-quality photos without model training

This offer expires in 48 hours. After that, it's gone forever.

Claim Your Comeback Offer: ${getCheckoutLink('membership', campaignName, campaignId, 'COMEBACK50')}

P.S. If you're not interested, just reply and say "unsubscribe." No hard feelings. But if you are, don't wait. This offer won't return.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text, subject: "Last call: Come back to Studio (50% off) 💪" }
}
