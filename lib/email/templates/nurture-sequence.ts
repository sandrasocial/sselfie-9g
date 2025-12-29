/**
 * Nurture Sequence Email Templates
 * For free users who downloaded Blueprint freebie
 * Day 1, Day 5, Day 10
 * Written in Alex's voice: strategic, enthusiastic, direct
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export interface NurtureSequenceParams {
  firstName?: string
  campaignId?: number
}

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
 * Day 1 - Value Delivery
 * Sent 1 day after freebie download
 */
export function generateNurtureDay1(params: NurtureSequenceParams = {}) {
  const { firstName, campaignId } = params
  const campaignName = 'nurture-day-1'
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Blueprint is ready! (Plus something better) ✨</title>
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
                ${firstName && firstName !== 'friend' ? `Hey ${firstName}! 👋` : ''}
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Your Brand Blueprint should be in your inbox. But here's the thing - I want to show you something even better. 👋
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                The Blueprint shows you WHAT to post. SSELFIE Studio shows you HOW to actually create that content - without hiring a photographer, without spending hours on shoots, without the stress.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Real talk: I used to spend HOURS trying to get content ready. Now? SSELFIE helps me show up confidently in minutes. That's the difference.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's what Studio members get:
              </p>

              <ul style="margin: 0 0 24px; padding-left: 20px; color: #1c1917; font-size: 16px; line-height: 1.8;">
                <li style="margin-bottom: 12px;"><strong>100+ professional photos per month</strong> - Never run out of content again</li>
                <li style="margin-bottom: 12px;"><strong>20 video clips</strong> - Perfect for Reels and Stories</li>
                <li style="margin-bottom: 12px;"><strong>Feed Designer</strong> - Plan your entire Instagram grid before you post</li>
                <li style="margin-bottom: 12px;"><strong>Maya, your AI creative director</strong> - She styles your shoots like a best friend</li>
              </ul>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                All for $79/month. That's less than most people spend on coffee. And it'll save you 10+ hours per month.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${getCheckoutLink('membership', campaignName, campaignId)}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Join SSELFIE Studio
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                <strong>P.S.</strong> Want to test it first? Try a one-time session for $49. No pressure, just options.
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

  const text = `${firstName && firstName !== 'friend' ? `Hey ${firstName}! 👋\n\n` : ''}Your Brand Blueprint should be in your inbox. But here's the thing - I want to show you something even better. 👋

The Blueprint shows you WHAT to post. SSELFIE Studio shows you HOW to actually create that content - without hiring a photographer, without spending hours on shoots, without the stress.

Real talk: I used to spend HOURS trying to get content ready. Now? SSELFIE helps me show up confidently in minutes. That's the difference.

Here's what Studio members get:
- 100+ professional photos per month - Never run out of content again
- 20 video clips - Perfect for Reels and Stories
- Feed Designer - Plan your entire Instagram grid before you post
- Maya, your AI creative director - She styles your shoots like a best friend

All for $79/month. That's less than most people spend on coffee. And it'll save you 10+ hours per month.

Join SSELFIE Studio: ${getCheckoutLink('membership', campaignName, campaignId)}

P.S. Want to test it first? Try a one-time session for $49. No pressure, just options.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text, subject: "Your Blueprint is ready! (Plus something better) ✨" }
}

/**
 * Day 5 - Case Study
 * Sent 5 days after freebie download
 */
export function generateNurtureDay5(params: NurtureSequenceParams = {}) {
  const { firstName, campaignId } = params
  const campaignName = 'nurture-day-5'
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How Sarah went from invisible to booked solid 📈</title>
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
                I want to tell you about Sarah. She's a life coach who was struggling to get clients. Her Instagram had maybe 200 followers, and she was posting the same 3 selfies on rotation.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Then she joined SSELFIE Studio. In her first month, she created 50+ professional photos. She started posting consistently. Her feed looked cohesive and professional.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Three months later? She's booked solid. Her DMs are full of potential clients asking about her services. She went from invisible to in-demand.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                What changed? Not her coaching skills - those were always there. What changed was her visibility. People could finally SEE her, trust her, want to work with her.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Professional photos did that. Consistent content did that. SSELFIE Studio did that.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's the thing - you have the same potential. You just need the right tools.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${getCheckoutLink('membership', campaignName, campaignId)}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  See How She Did It
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                <strong>P.S.</strong> Sarah's story isn't unique. I hear versions of this from Studio members every week. The pattern is clear: consistent professional content = more visibility = more clients.
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

  const text = `${firstName && firstName !== 'friend' ? `Hey ${firstName},\n\n` : ''}I want to tell you about Sarah. She's a life coach who was struggling to get clients. Her Instagram had maybe 200 followers, and she was posting the same 3 selfies on rotation.

Then she joined SSELFIE Studio. In her first month, she created 50+ professional photos. She started posting consistently. Her feed looked cohesive and professional.

Three months later? She's booked solid. Her DMs are full of potential clients asking about her services. She went from invisible to in-demand.

What changed? Not her coaching skills - those were always there. What changed was her visibility. People could finally SEE her, trust her, want to work with her.

Professional photos did that. Consistent content did that. SSELFIE Studio did that.

Here's the thing - you have the same potential. You just need the right tools.

See How She Did It: ${getCheckoutLink('membership', campaignName, campaignId)}

P.S. Sarah's story isn't unique. I hear versions of this from Studio members every week. The pattern is clear: consistent professional content = more visibility = more clients.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text, subject: "How Sarah went from invisible to booked solid 📈" }
}

/**
 * Day 10 - Offer
 * Sent 10 days after freebie download
 */
export function generateNurtureDay10(params: NurtureSequenceParams = {}) {
  const { firstName, campaignId } = params
  const campaignName = 'nurture-day-10'
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ready to be SEEN? (Let's make it simple) 💪</title>
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
                I've been thinking about you. You downloaded the Blueprint, which means you're serious about building your brand. But you haven't joined Studio yet.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Maybe you're not sure if it's worth it. Maybe you're worried it's too complicated. Maybe you're waiting for the "right time."
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's what I know: The "right time" is now. Every day you wait is another day you're not showing up. Another day you're invisible. Another day your competitors are getting ahead.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                So I'm making this simple. Two options:
              </p>

              <ul style="margin: 0 0 24px; padding-left: 20px; color: #1c1917; font-size: 16px; line-height: 1.8;">
                <li style="margin-bottom: 12px;"><strong>Try it once for $49</strong> - Test it out. Create your first professional photoshoot. If you love it, upgrade. If not, you're only out $49.</li>
                <li style="margin-bottom: 12px;"><strong>Join Studio for $79/month</strong> - Get 100+ photos per month, video clips, Feed Designer, everything. The full system.</li>
              </ul>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                No risk. No commitment. Just results. Pick what works for you.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${getCheckoutLink('one-time', campaignName, campaignId)}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px; margin-bottom: 12px;">
                  Try Once - $49
                </a>
                <br>
                <a href="${getCheckoutLink('membership', campaignName, campaignId)}" style="display: inline-block; padding: 14px 32px; background-color: #fafaf9; color: #1c1917; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px; border: 2px solid #1c1917;">
                  Join Studio - $79/mo
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                <strong>P.S.</strong> The members who start now are the ones seeing results in 30 days. Don't wait. Start today.
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

  const text = `${firstName && firstName !== 'friend' ? `Hey ${firstName},\n\n` : ''}I've been thinking about you. You downloaded the Blueprint, which means you're serious about building your brand. But you haven't joined Studio yet.

Maybe you're not sure if it's worth it. Maybe you're worried it's too complicated. Maybe you're waiting for the "right time."

Here's what I know: The "right time" is now. Every day you wait is another day you're not showing up. Another day you're invisible. Another day your competitors are getting ahead.

So I'm making this simple. Two options:
- Try it once for $49 - Test it out. Create your first professional photoshoot. If you love it, upgrade. If not, you're only out $49.
- Join Studio for $79/month - Get 100+ photos per month, video clips, Feed Designer, everything. The full system.

No risk. No commitment. Just results. Pick what works for you.

Try Once - $49: ${getCheckoutLink('one-time', campaignName, campaignId)}
Join Studio - $79/mo: ${getCheckoutLink('membership', campaignName, campaignId)}

P.S. The members who start now are the ones seeing results in 30 days. Don't wait. Start today.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text, subject: "Ready to be SEEN? (Let's make it simple) 💪" }
}
