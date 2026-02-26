/**
 * Win-Back Day 3 Email Template
 * Subject: "Something I want to say"
 *
 * Touch 1 of 3 — The honest check-in.
 * Sandra speaking directly. No pitch. "What happened?" energy.
 * Soft CTA to rejoin sits at the bottom, not the headline.
 */

export interface WinBackDay3Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateWinBackDay3Email(params: WinBackDay3Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  const rejoinLink = `${SITE_URL}/checkout/membership?utm_source=email&utm_medium=email&utm_campaign=win_back_day3&utm_content=soft_cta`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Something I want to say</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: #0c0a09; padding: 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Times New Roman', serif; font-size: 32px; font-weight: 200; letter-spacing: 0.3em; color: #fafaf9; text-transform: uppercase;">
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
                I noticed you cancelled your Studio membership a few days ago.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                I'm not going to pretend that's not disappointing for me. It is.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                But more than that, I want to understand it.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                You paid. You showed up. Something about SSELFIE made sense to you at some point — and then it didn't. I don't think that's about you. I think that might be about us.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                So I have one question: <strong>What didn't work?</strong>
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Was it the onboarding? Too slow to see results? Not sure what to do next? Life just got in the way? Something felt off about the product?
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                If you reply to this email, I will read it. Not a bot, not a team — me.
              </p>

              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                I'm asking because I'm building this for women like you, and I can't get it right if I don't know what went wrong.
              </p>

              <div style="margin: 0 0 32px; padding: 20px 24px; background-color: #fafaf9; border-left: 3px solid #1c1917; border-radius: 4px;">
                <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #57534e; font-style: italic;">
                  And if there's any part of you that's still curious — the door is open. No pressure, no expiry, no pitch.
                </p>
                <p style="margin: 12px 0 0; font-size: 14px; color: #78716c;">
                  <a href="${rejoinLink}" style="color: #1c1917; text-decoration: underline;">Come back and start fresh &rarr;</a>
                </p>
              </div>

              <p style="margin: 0; font-size: 16px; color: #1c1917;">
                XoXo Sandra
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f5f5f4; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                SSELFIE Studio &mdash; Where Visibility Meets Financial Freedom
              </p>
              <p style="margin: 0; font-size: 12px; color: #78716c;">
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

  const text = `S S E L F I E

Hey ${displayName},

I noticed you cancelled your Studio membership a few days ago.

I'm not going to pretend that's not disappointing for me. It is.

But more than that, I want to understand it.

You paid. You showed up. Something about SSELFIE made sense to you at some point — and then it didn't. I don't think that's about you. I think that might be about us.

So I have one question: What didn't work?

Was it the onboarding? Too slow to see results? Not sure what to do next? Life just got in the way? Something felt off about the product?

If you reply to this email, I will read it. Not a bot, not a team — me.

I'm asking because I'm building this for women like you, and I can't get it right if I don't know what went wrong.

And if there's any part of you that's still curious — the door is open. No pressure, no expiry, no pitch.

Come back and start fresh: ${rejoinLink}

XoXo Sandra

SSELFIE Studio — Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "Something I want to say",
  }
}
