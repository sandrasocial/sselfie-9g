export const BRAND_ENGINE_BROADCAST_CAMPAIGN_NAME = "Brand Engine Launch Broadcast Feb 2026"
export const BRAND_ENGINE_BROADCAST_SUBJECT = "I went to the mountains. Here's what I came back with."
export const BRAND_ENGINE_BROADCAST_PREVIEW = "This is the most honest email I've written all year."
export const BRAND_ENGINE_BROADCAST_UTM =
  "utm_source=email&utm_medium=broadcast&utm_campaign=brand-engine-feb-2026"
export const BRAND_ENGINE_BROADCAST_CTA_URL = `https://sselfie.ai/apply/brand-engine?${BRAND_ENGINE_BROADCAST_UTM}`

export function getBrandEngineBroadcastHtml() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Brand Engine</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#ffffff;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;background:#ffffff;">
            <tr>
              <td style="padding:0 8px 24px 8px;font-size:18px;line-height:1.7;color:#0a0a0a;">
                <p style="margin:0 0 20px 0;">Hey [first_name] 🤍</p>
                <p style="margin:0 0 20px 0;">Let me be really honest for a second.</p>
                <p style="margin:0 0 20px 0;">
                  I built an app from €12. Learned to code. Grew to 180K followers.
                  Did it all as a single mom with two boys and my own ADHD to manage.
                </p>
                <p style="margin:0 0 20px 0;">And I still doubted myself every single day.</p>
                <p style="margin:0 0 20px 0;">
                  In January I hit a wall. Not burnout. More like... I couldn't
                  celebrate what I'd built because I was already chasing the next thing.
                </p>
                <p style="margin:0 0 20px 0;">
                  So I took my boys to the mountains.
                  No wifi. No electricity. No running water.
                  Just a fireplace, red wine and quiet.
                </p>
                <p style="margin:0 0 20px 0;">
                  And sitting there I realised — I had been running so hard
                  I forgot to look at how far I'd come.
                </p>
                <p style="margin:0 0 20px 0;">
                  Here's the thing. Rewiring your mind is harder than
                  building the actual thing. Wild, right?
                </p>

                <hr style="border:none;border-top:1px solid #e7e5e4;margin:32px 0;" />

                <p style="margin:0 0 20px 0;">This chapter I'm doing things differently.</p>
                <p style="margin:0 0 20px 0;">
                  And I'm ready to help a small group of women do the same.
                </p>
                <p style="margin:0 0 20px 0;">
                  I'm opening Brand Engine in March — 6 weeks where we build
                  your entire personal brand together using AI.
                </p>
                <p style="margin:0 0 20px 0;">Not a course. Not theory. Actually built.</p>

                <p style="margin:0 0 14px 0;">Week by week:</p>
                <ul style="margin:0 0 20px 22px;padding:0;">
                  <li style="margin:0 0 10px 0;">Your Brand DNA — story, voice, message, values</li>
                  <li style="margin:0 0 10px 0;">Your Control Centre — website, tools, everything connected</li>
                  <li style="margin:0 0 10px 0;">Your AI Director — an agent that thinks and talks like you</li>
                  <li style="margin:0 0 10px 0;">Your Offer + Funnel — three-tier offers, automations live</li>
                  <li style="margin:0 0 10px 0;">Your Content System — 30 days batched and ready</li>
                  <li style="margin:0 0 10px 0;">Your full AI Team — running your brand while you live your life</li>
                </ul>
                <p style="margin:0 0 20px 0;">
                  You leave with everything built and a brand that works
                  while you're with your kids.
                </p>

                <hr style="border:none;border-top:1px solid #e7e5e4;margin:32px 0;" />

                <p style="margin:0 0 14px 0;">Two options:</p>
                <p style="margin:0 0 10px 0;"><strong>THE COHORT — €2,497</strong><br />12 women. Weekly live sessions. Private Telegram.<br />Starts March 16.</p>
                <p style="margin:0 0 20px 0;"><strong>THE VIP — €4,997</strong><br />Just you and me. Weekly private calls.<br />Unlimited access between sessions.<br />Only 2 spots.</p>

                <p style="margin:0 0 20px 0;">Small API running costs on top — typically €10–50/month.<br />I guide you through keeping these minimal.</p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:4px 8px 24px 8px;">
                <a
                  href="${BRAND_ENGINE_BROADCAST_CTA_URL}"
                  style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:14px 24px;font-size:14px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;"
                >
                  Apply for Brand Engine
                </a>
              </td>
            </tr>

            <tr>
              <td style="padding:0 8px 24px 8px;font-size:18px;line-height:1.7;color:#0a0a0a;">
                <p style="margin:0 0 16px 0;">
                  If this isn't for you right now — that's completely okay.
                  But if something in this email made you feel seen —
                  that's probably not a coincidence.
                </p>
                <p style="margin:0 0 20px 0;">Sandra 🤍</p>
                <p style="margin:0 0 0 0;font-size:15px;line-height:1.6;color:#44403c;">
                  P.S. Only 12 cohort spots and 2 VIP spots exist.
                  I'm not doing a big launch. Just telling the people who already know me.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 8px 0 8px;border-top:1px solid #e7e5e4;font-size:12px;line-height:1.6;color:#78716c;text-align:center;">
                You're receiving this because you're part of the SSELFIE community.<br />
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#78716c;text-decoration:underline;">Unsubscribe</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
