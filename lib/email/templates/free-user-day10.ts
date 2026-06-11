/**
 * Free User Day 10 Email
 * Subject: "last one from me"
 *
 * Fires 10 days after signup for free users who haven't subscribed.
 *
 * Tone: direct, honest, no pressure. Final nudge.
 * This is the last in the free user sequence — clear, generous offer.
 * CTA: upgrade to Studio. The case is made simply and cleanly.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
  .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
  .replace(/\/+$/, "")

export function generateFreeUserDay10Email(input: { firstName?: string }): {
  subject: string
  html: string
  text: string
} {
  const firstName = input.firstName?.trim() || "friend"

  const upgradeUrl = `${SITE_URL}/checkout/membership?utm_source=email&utm_medium=lifecycle&utm_campaign=free_user_day10`
  const studioUrl = `${SITE_URL}/studio?utm_source=email&utm_medium=lifecycle&utm_campaign=free_user_day10`

  const subject = "last one from me"

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
                You've had SSELFIE for 10 days now. I've sent a couple of emails. I don't want to keep interrupting your inbox, so this is the last one.
              </p>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1c1917;">
                Just wanted to say this one thing clearly before I go quiet:
              </p>

              <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 28px;">
                <tr>
                  <td style="padding:24px 28px;background:#fafaf9;border-radius:8px;">
                    <p style="margin:0 0 12px;font-size:18px;line-height:1.5;color:#1c1917;font-weight:400;">
                      The SUITE is &euro;97/month.
                    </p>
                    <p style="margin:0 0 8px;font-size:15px;line-height:1.65;color:#292524;">
                      That's 200 brand photos every month. No photographer. No shoot. No booking.
                    </p>
                    <p style="margin:0;font-size:15px;line-height:1.65;color:#292524;">
                      Maya knows your face. She generates photos that actually look like you, in your aesthetic, whenever you need them. Cancel any time.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1c1917;">
                I built this because I was spending thousands on photographers and still running out of content. I'm not running out anymore.
              </p>

              <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#1c1917;">
                If that's something you want, the door's open.
              </p>

              <div style="text-align:center;margin:0 0 16px;">
                <a href="${upgradeUrl}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:14px 36px;font-size:14px;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;border-radius:8px;">
                  Join SSELFIE SUITE &middot; &euro;97/month &rarr;
                </a>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#8a8780;text-align:center;">
                Or <a href="${studioUrl}" style="color:#57534e;">try your free credits first</a>. They're still there.
              </p>

              <p style="margin:40px 0 0;font-size:15px;color:#1c1917;">XoXo Sandra</p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 32px;background:#f5f5f5;border-top:1px solid #e7e5e4;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#8a8780;">SSELFIE Studio &middot; sselfie.ai</p>
              <p style="margin:0;font-size:12px;color:#8a8780;">
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
    `You've had SSELFIE for 10 days now. I've sent a couple of emails. I don't want to keep interrupting your inbox, so this is the last one.`,
    ``,
    `Just wanted to say this one thing clearly before I go quiet:`,
    ``,
    `The SUITE is €97/month.`,
    `That's 200 brand photos every month. No photographer. No shoot. No booking.`,
    `Maya knows your face. She generates photos that actually look like you, in your aesthetic, whenever you need them. Cancel any time.`,
    ``,
    `I built this because I was spending thousands on photographers and still running out of content. I'm not running out anymore.`,
    ``,
    `If that's something you want, the door's open.`,
    ``,
    `Join SSELFIE SUITE · €97/month: ${upgradeUrl}`,
    ``,
    `Or try your free credits first: ${studioUrl}`,
    ``,
    `XoXo Sandra`,
    ``,
    `---`,
    `Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`,
  ].join("\n")

  return { subject, html, text }
}
