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

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
  .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
  .replace(/\/+$/, "")

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
                I noticed you cancelled your SUITE membership a few days ago.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Honestly? I think I know why. And it's on me, not you.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                I've been building and updating and adding things non-stop. And somewhere along the way, SSELFIE got confusing. Features kept changing. The path to actually doing anything wasn't clear. I made it harder than it should have been.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                That's not on you for leaving. That's on me for not making it simple enough to stay.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                I do have one question, not to pitch you, just because I'm still building this and I want to get it right: <strong>What was the moment it stopped working?</strong>
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Was it the onboarding? Too slow to see results? Not sure what to do next? Life just got in the way?
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                If you reply to this email, I will read it. Not a bot, not a team. Me.
              </p>

              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                And if you're curious what's changed: it's a lot. But I'll save that for another day. For now, I just wanted to say: I get it. No hard feelings. You didn't do anything wrong.
              </p>

              <div style="margin: 0 0 32px; padding: 20px 24px; background-color: #fafaf9; border-left: 3px solid #1c1917; border-radius: 4px;">
                <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #57534e; font-style: italic;">
                  And if there's any part of you that's still curious: the door is open. No pressure, no expiry, no pitch.
                </p>
                <p style="margin: 12px 0 0; font-size: 14px; color: #8a8780;">
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

I noticed you cancelled your SUITE membership a few days ago.

Honestly? I think I know why. And it's on me, not you.

I've been building and updating and adding things non-stop. And somewhere along the way, SSELFIE got confusing. Features kept changing. The path to actually doing anything wasn't clear. I made it harder than it should have been.

That's not on you for leaving. That's on me for not making it simple enough to stay.

I do have one question, not to pitch you, just because I'm still building this and I want to get it right: What was the moment it stopped working?

Was it the onboarding? Too slow to see results? Not sure what to do next? Life just got in the way?

If you reply to this email, I will read it. Not a bot, not a team. Me.

And if you're curious what's changed: it's a lot. But I'll save that for another day. For now, I just wanted to say: I get it. No hard feelings. You didn't do anything wrong.

And if there's any part of you that's still curious: the door is open. No pressure, no expiry, no pitch.

Come back and start fresh: ${rejoinLink}

XoXo Sandra

SSELFIE Studio · sselfie.ai
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "Something I want to say",
  }
}
