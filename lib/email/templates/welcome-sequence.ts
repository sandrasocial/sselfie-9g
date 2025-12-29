/**
 * Welcome Sequence Email Templates
 * For new paid SSELFIE Studio members
 * Day 0, Day 3, Day 7
 * Written in Alex's voice: strategic, enthusiastic, direct
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export interface WelcomeSequenceParams {
  firstName?: string
  campaignId?: number
}

/**
 * Generate UTM-tracked checkout link
 */
function getCheckoutLink(type: 'membership' | 'one-time', campaignName: string, campaignId?: number): string {
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
  return `${baseUrl}?${params.toString()}`
}

/**
 * Day 0 - Welcome Email
 * Sent immediately when user completes payment
 */
export function generateWelcomeDay0(params: WelcomeSequenceParams = {}) {
  const { firstName, campaignId } = params
  const campaignName = 'welcome-day-0'
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're in! Let's get you creating 🚀</title>
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
                ${firstName && firstName !== 'friend' ? `Hey ${firstName}! 🚀` : ''}
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                You just joined SSELFIE Studio. This is going to change everything. 🚀
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's the thing - most people struggle with content because they're trying to do it the old way. Hours of photoshoots. Expensive photographers. The same 5 photos on rotation.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                You? You just got access to 100+ professional photos every month. No photographer. No studio. Just you, your selfies, and Maya's AI magic.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's what happens next:
              </p>

              <ul style="margin: 0 0 24px; padding-left: 20px; color: #1c1917; font-size: 16px; line-height: 1.8;">
                <li style="margin-bottom: 12px;"><strong>Upload 10-20 selfies</strong> - Mix of angles, expressions, outfits. More variety = better results.</li>
                <li style="margin-bottom: 12px;"><strong>Maya trains your model</strong> - Takes about 2 hours. Then you're ready to create.</li>
                <li style="margin-bottom: 12px;"><strong>Start generating</strong> - Chat with Maya, create concepts, build your brand library.</li>
                <li style="margin-bottom: 12px;"><strong>Show up consistently</strong> - Never scramble for content again.</li>
              </ul>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Honestly? This is the fastest way to build a professional brand presence. Members are creating content in minutes that used to take hours.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${getCheckoutLink('membership', campaignName, campaignId)}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Create Your First Photos
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                <strong>P.S.</strong> If you need anything, just hit reply. Sandra reads every message personally.
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

  const text = `${firstName && firstName !== 'friend' ? `Hey ${firstName}! 🚀\n\n` : ''}You just joined SSELFIE Studio. This is going to change everything. 🚀

Here's the thing - most people struggle with content because they're trying to do it the old way. Hours of photoshoots. Expensive photographers. The same 5 photos on rotation.

You? You just got access to 100+ professional photos every month. No photographer. No studio. Just you, your selfies, and Maya's AI magic.

Here's what happens next:
- Upload 10-20 selfies - Mix of angles, expressions, outfits. More variety = better results.
- Maya trains your model - Takes about 2 hours. Then you're ready to create.
- Start generating - Chat with Maya, create concepts, build your brand library.
- Show up consistently - Never scramble for content again.

Honestly? This is the fastest way to build a professional brand presence. Members are creating content in minutes that used to take hours.

Create Your First Photos: ${getCheckoutLink('membership', campaignName, campaignId)}

P.S. If you need anything, just hit reply. Sandra reads every message personally.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text, subject: "You're in! Let's get you creating 🚀" }
}

/**
 * Day 3 - Progress Check
 * Sent 3 days after signup
 */
export function generateWelcomeDay3(params: WelcomeSequenceParams = {}) {
  const { firstName, campaignId } = params
  const campaignName = 'welcome-day-3'
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quick check: How's it going? 💪</title>
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
                Quick check-in: How are your first photos looking?
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                I know the first few days can feel overwhelming. New tool, new process, figuring out what works. That's totally normal.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's what I'd do if I were you:
              </p>

              <ul style="margin: 0 0 24px; padding-left: 20px; color: #1c1917; font-size: 16px; line-height: 1.8;">
                <li style="margin-bottom: 12px;"><strong>Be specific with Maya.</strong> Instead of "professional photo," try "professional headshot, soft lighting, confident smile, business casual outfit." The more detail, the better the result.</li>
                <li style="margin-bottom: 12px;"><strong>Generate multiple variations.</strong> Don't settle for the first one. Create 3-4 options and pick your favorite.</li>
                <li style="margin-bottom: 12px;"><strong>Use your training photos wisely.</strong> More variety in angles, expressions, and outfits = better model accuracy.</li>
              </ul>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Members who nail this in week one are creating stunning content by week two. You've got this.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Stuck? Just reply to this email. We'll help you troubleshoot.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${SITE_URL}/studio" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Continue Creating
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                <strong>P.S.</strong> The best content comes from experimentation. Don't be afraid to try different prompts and see what works for your brand.
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

  const text = `${firstName && firstName !== 'friend' ? `Hey ${firstName},\n\n` : ''}Quick check-in: How are your first photos looking?

I know the first few days can feel overwhelming. New tool, new process, figuring out what works. That's totally normal.

Here's what I'd do if I were you:
- Be specific with Maya. Instead of "professional photo," try "professional headshot, soft lighting, confident smile, business casual outfit." The more detail, the better the result.
- Generate multiple variations. Don't settle for the first one. Create 3-4 options and pick your favorite.
- Use your training photos wisely. More variety in angles, expressions, and outfits = better model accuracy.

Members who nail this in week one are creating stunning content by week two. You've got this.

Stuck? Just reply to this email. We'll help you troubleshoot.

Continue Creating: ${SITE_URL}/studio

P.S. The best content comes from experimentation. Don't be afraid to try different prompts and see what works for your brand.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text, subject: "Quick check: How's it going? 💪" }
}

/**
 * Day 7 - Deepening Value
 * Sent 7 days after signup
 */
export function generateWelcomeDay7(params: WelcomeSequenceParams = {}) {
  const { firstName, campaignId } = params
  const campaignName = 'welcome-day-7'
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>One week in - you're crushing it! 🎯</title>
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
                ${firstName && firstName !== 'friend' ? `Hey ${firstName}! 🎉` : ''}
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                You've been in Studio for a week. That's huge. 🎉
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Most people give up on new tools after 3 days. But you? You're still here, creating, learning, building. That's the kind of consistency that changes everything.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Now that you've got the basics down, here are some features that'll take your content to the next level:
              </p>

              <ul style="margin: 0 0 24px; padding-left: 20px; color: #1c1917; font-size: 16px; line-height: 1.8;">
                <li style="margin-bottom: 12px;"><strong>Feed Designer:</strong> Plan your entire Instagram grid before you post. See how photos work together. No more guessing.</li>
                <li style="margin-bottom: 12px;"><strong>Video Clips:</strong> Create 20 professional video clips per month. Perfect for Reels and Stories. Game changer for engagement.</li>
                <li style="margin-bottom: 12px;"><strong>Maya's Advanced Mode:</strong> Ask for specific concepts - "coffee shop entrepreneur vibe" or "luxury brand aesthetic." She gets it.</li>
                <li style="margin-bottom: 12px;"><strong>Pro Mode:</strong> Want editorial-quality photos without training a model? Upload reference images and get luxury influencer content instantly.</li>
              </ul>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's the thing - the members who use ALL the features are the ones seeing the biggest results. They're not just creating photos. They're building complete brand systems.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                You've got everything you need to show up consistently and confidently. Time to scale.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${SITE_URL}/studio" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Explore Advanced Features
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                <strong>P.S.</strong> We're always adding new features. Keep an eye on your inbox - you'll be the first to know when something drops.
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

  const text = `${firstName && firstName !== 'friend' ? `Hey ${firstName}! 🎉\n\n` : ''}You've been in Studio for a week. That's huge. 🎉

Most people give up on new tools after 3 days. But you? You're still here, creating, learning, building. That's the kind of consistency that changes everything.

Now that you've got the basics down, here are some features that'll take your content to the next level:
- Feed Designer: Plan your entire Instagram grid before you post. See how photos work together. No more guessing.
- Video Clips: Create 20 professional video clips per month. Perfect for Reels and Stories. Game changer for engagement.
- Maya's Advanced Mode: Ask for specific concepts - "coffee shop entrepreneur vibe" or "luxury brand aesthetic." She gets it.
- Pro Mode: Want editorial-quality photos without training a model? Upload reference images and get luxury influencer content instantly.

Here's the thing - the members who use ALL the features are the ones seeing the biggest results. They're not just creating photos. They're building complete brand systems.

You've got everything you need to show up consistently and confidently. Time to scale.

Explore Advanced Features: ${SITE_URL}/studio

P.S. We're always adding new features. Keep an eye on your inbox - you'll be the first to know when something drops.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text, subject: "One week in - you're crushing it! 🎯" }
}
