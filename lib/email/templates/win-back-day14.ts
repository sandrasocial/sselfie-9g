/**
 * Win-Back Day 14 Email Template
 * Subject: "Last one, I promise"
 *
 * Touch 3 of 3 - The last ask.
 * Honest, warm, no pressure. "Door is always open."
 * Frame what SSELFIE does for her specifically.
 * Soft close - if she's not ready now, she will be. Seed the future.
 */

export interface WinBackDay14Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
  .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
  .replace(/\/+$/, "")

export function generateWinBackDay14Email(params: WinBackDay14Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  const rejoinLink = `${SITE_URL}/checkout/membership?utm_source=email&utm_medium=email&utm_campaign=win_back_day14&utm_content=soft_close`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Last one, I promise</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #0c0a09; padding: 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 200; letter-spacing: 0.3em; color: #fafaf9; text-transform: uppercase;">
                S S E L F I E
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Hey ${displayName},
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Last one, I promise.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                I've sent two emails already, and I don't want to be the person in your inbox who won't take the hint. So this is it from me.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                But before I go, let me say this straight.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                SSELFIE is built for the woman who wants to show up online without it taking over her week. She wants her Instagram to look like her. She wants content that doesn't feel forced. She wants to be the face of her own brand without dreading every photo.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                That's what it does. One selfie, and you've got a week of content ready. Real photos, your real face. Not a stock image, not an AI that looks like a stranger.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                If that's still something you want, and the timing just hasn't been right, I get it. Completely.
              </p>

              <!-- What's waiting for her -->
              <div style="margin: 0 0 28px; padding: 24px; background-color: #0c0a09; border-radius: 10px;">
                <p style="margin: 0 0 16px; font-size: 13px; font-weight: 500; color: #a8a29e; letter-spacing: 0.12em; text-transform: uppercase;">
                  When you're ready, here's what's waiting
                </p>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #e7e5e4; font-size: 15px; line-height: 2;">
                  <li>Brand photos that actually look like you, on Instagram, Reels, anywhere</li>
                  <li>A system that keeps you consistent without burning you out</li>
                  <li>Maya, who gets your style and makes every session faster</li>
                  <li>Me, building this with you, not just for you</li>
                </ul>
              </div>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                The door is always open. No deadline, no lost discount, no awkward re-join form. Just click whenever the moment feels right.
              </p>

              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                I hope to see you back in there one day.
              </p>

              <div style="text-align: center; margin: 0 0 32px;">
                <a href="${rejoinLink}" style="display: inline-block; padding: 14px 36px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 8px;">
                  Come back whenever you're ready &rarr;
                </a>
              </div>

              <p style="margin: 0; font-size: 16px; color: #1c1917;">
                XoXo Sandra
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f5f5f5; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #8a8780;">
                SSELFIE Studio &bull; sselfie.ai
              </p>
              <p style="margin: 0; font-size: 12px; color: #8a8780;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #8a8780; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `S S E L F I E

Hey ${displayName},

Last one, I promise.

I've sent two emails already, and I don't want to be the person in your inbox who won't take the hint. So this is it from me.

But before I go, let me say this straight.

SSELFIE is built for the woman who wants to show up online without it taking over her week. She wants her Instagram to look like her. She wants content that doesn't feel forced. She wants to be the face of her own brand without dreading every photo.

That's what it does. One selfie, and you've got a week of content ready. Real photos, your real face. Not a stock image, not an AI that looks like a stranger.

If that's still something you want, and the timing just hasn't been right, I get it. Completely.

WHEN YOU'RE READY, HERE'S WHAT'S WAITING:
- Brand photos that actually look like you, on Instagram, Reels, anywhere
- A system that keeps you consistent without burning you out
- Maya, who gets your style and makes every session faster
- Me, building this with you, not just for you

The door is always open. No deadline, no lost discount, no awkward re-join form. Just click whenever the moment feels right.

I hope to see you back in there one day.

Come back whenever you're ready: ${rejoinLink}

XoXo Sandra

SSELFIE Studio · sselfie.ai
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "Last one, I promise",
  }
}
