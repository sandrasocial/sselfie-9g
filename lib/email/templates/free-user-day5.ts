/**
 * Free User Day 5 Email
 * Subject: "did you get a chance to try it?"
 *
 * Fires 5 days after signup for free users who:
 *   - Haven't subscribed to Studio
 *   - Whether they generated or not (this is the gentle check-in)
 *
 * Tone: warm, no pressure, curious. Sandra voice.
 * CTA: studio first (try/come back), soft upgrade mention.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
  .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
  .replace(/\/+$/, "")

export function generateFreeUserDay5Email(input: { firstName?: string }): {
  subject: string
  html: string
  text: string
} {
  const firstName = input.firstName?.trim() || "friend"

  const studioUrl = `${SITE_URL}/app?utm_source=email&utm_medium=lifecycle&utm_campaign=free_user_day5`
  const upgradeUrl = `${SITE_URL}/checkout/membership?utm_source=email&utm_medium=lifecycle&utm_campaign=free_user_day5`

  const subject = "did you get a chance to try it?"

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:20px;">
        <table role="presentation" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">

          <tr>
            <td style="background:#0c0a09;padding:32px 24px;text-align:center;">
              <p style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:200;letter-spacing:0.3em;color:#fafaf9;text-transform:uppercase;">S S E L F I E</p>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#1c1917;">Hey ${firstName},</p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1c1917;">
                It's been a few days since you signed up. I wanted to check in. Did you get a chance to try your free photos?
              </p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1c1917;">
                If you did: I'd love to know what you thought. Just hit reply.
              </p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1c1917;">
                If you haven't yet, no judgement. Life gets busy. Your credits are still there. It still takes 3 minutes. And the result might actually surprise you.
              </p>

              <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#1c1917;">
                Here's what a few women told me after their first photo:
              </p>

              <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 32px;">
                <tr>
                  <td style="padding:16px 20px;background:#fafaf9;border-left:3px solid #1c1917;border-radius:4px;margin-bottom:12px;display:block;">
                    <p style="margin:0;font-size:15px;line-height:1.65;color:#292524;font-style:italic;">
                      "I genuinely could not tell the difference from a real shoot. I cried a little."
                    </p>
                  </td>
                </tr>
                <tr><td style="height:12px;"></td></tr>
                <tr>
                  <td style="padding:16px 20px;background:#fafaf9;border-left:3px solid #1c1917;border-radius:4px;">
                    <p style="margin:0;font-size:15px;line-height:1.65;color:#292524;font-style:italic;">
                      "I've been putting off my content for 6 months because I had no photos. I made 12 in one hour."
                    </p>
                  </td>
                </tr>
              </table>

              <div style="text-align:center;margin:0 0 16px;">
                <a href="${studioUrl}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:14px 36px;font-size:14px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;border-radius:8px;">
                  Try it now &rarr;
                </a>
              </div>

              <p style="margin:0 0 32px;font-size:13px;color:#8a8780;text-align:center;">Your 2 free credits are still waiting.</p>

              <p style="margin:0;font-size:15px;color:#1c1917;">XoXo Sandra</p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;background:#f5f5f5;border-top:1px solid #e7e5e4;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#8a8780;">SSELFIE Studio &middot; sselfie.ai</p>
              <p style="margin:0;font-size:12px;color:#8a8780;">
                Want 200 photos/month? <a href="${upgradeUrl}" style="color:#57534e;">See SSELFIE SUITE plans</a>
                &nbsp;&middot;&nbsp;
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#8a8780;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    `S S E L F I E`,
    ``,
    `Hey ${firstName},`,
    ``,
    `It's been a few days since you signed up. I wanted to check in. Did you get a chance to try your free photos?`,
    ``,
    `If you did: I'd love to know what you thought. Just hit reply.`,
    ``,
    `If you haven't yet, no judgement. Life gets busy. Your credits are still there. It still takes 3 minutes. And the result might actually surprise you.`,
    ``,
    `Here's what a few women told me after their first photo:`,
    ``,
    `"I genuinely could not tell the difference from a real shoot. I cried a little."`,
    ``,
    `"I've been putting off my content for 6 months because I had no photos. I made 12 in one hour."`,
    ``,
    `Try it now: ${studioUrl}`,
    `Your 2 free credits are still waiting.`,
    ``,
    `XoXo Sandra`,
    ``,
    `---`,
    `Want 200 photos/month? ${upgradeUrl}`,
    `Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`,
  ].join("\n")

  return { subject, html, text }
}
