/**
 * Win-Back Day 7 Email Template
 * Subject: "This is different now"
 *
 * Touch 2 of 3 — The thing that changed.
 * Lead with what's specifically improved since they left.
 * Frame each change as "you get X without having to Y."
 * CTA: Come back and try it free (7-day free trial restart or credit bonus).
 */

export interface WinBackDay7Params {
  firstName?: string
  recipientEmail: string
  offerCode?: string // Optional promo code for 7-day free trial or credit bonus
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateWinBackDay7Email(params: WinBackDay7Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail, offerCode } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  const checkoutParams = new URLSearchParams({
    utm_source: "email",
    utm_medium: "email",
    utm_campaign: "win_back_day7",
    utm_content: "cta_button",
  })
  if (offerCode) {
    checkoutParams.append("promo", offerCode)
  }
  const rejoinLink = `${SITE_URL}/checkout/membership?${checkoutParams.toString()}`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>This is different now</title>
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
                A few things have changed since you left.
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                I'm not saying that to pitch you. I'm saying it because I know one of the hardest things about signing up for something new is not knowing if it'll actually work for you. And some of what made it harder — I've fixed.
              </p>

              <!-- What changed -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 28px;">

                <tr>
                  <td style="padding: 16px 20px; background-color: #fafaf9; border-radius: 8px; margin-bottom: 12px; display: block;">
                    <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #1c1917; letter-spacing: 0.03em; text-transform: uppercase;">
                      Getting started
                    </p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.65; color: #292524;">
                      You now get your first brand photo in under 2 minutes &mdash; without having to read a tutorial or figure out settings first.
                    </p>
                  </td>
                </tr>

                <tr><td style="height: 10px;"></td></tr>

                <tr>
                  <td style="padding: 16px 20px; background-color: #fafaf9; border-radius: 8px;">
                    <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #1c1917; letter-spacing: 0.03em; text-transform: uppercase;">
                      Maya, your AI stylist
                    </p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.65; color: #292524;">
                      Maya now remembers your sessions &mdash; so you don't have to re-explain your style every time. She gets better the more you use her.
                    </p>
                  </td>
                </tr>

                <tr><td style="height: 10px;"></td></tr>

                <tr>
                  <td style="padding: 16px 20px; background-color: #fafaf9; border-radius: 8px;">
                    <p style="margin: 0 0 6px; font-size: 14px; font-weight: 600; color: #1c1917; letter-spacing: 0.03em; text-transform: uppercase;">
                      The welcome flow
                    </p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.65; color: #292524;">
                      No more guessing what to do next. The new onboarding walks you step by step &mdash; one action, one result, done.
                    </p>
                  </td>
                </tr>

              </table>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                These aren't feature updates for the sake of it. They're the exact things I know got in the way.
              </p>

              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                So I want to make it easy: come back and try it free. ${offerCode ? `Use code <strong>${offerCode}</strong> at checkout for a 7-day free restart &mdash; no charge until you decide to stay.` : "I'll add credits to your account so you can pick up where you left off, on me."}
              </p>

              <div style="text-align: center; margin: 0 0 32px;">
                <a href="${rejoinLink}" style="display: inline-block; padding: 14px 36px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 8px;">
                  Come back and try it free &rarr;
                </a>
              </div>

              <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #57534e;">
                If you've already moved on, I completely understand. But if there's still a part of you that wants consistent, beautiful content that actually looks and sounds like you &mdash; this is the moment.
              </p>

              <p style="margin: 24px 0 0; font-size: 16px; color: #1c1917;">
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

  const trialOffer = offerCode
    ? `Use code ${offerCode} at checkout for a 7-day free restart — no charge until you decide to stay.`
    : "I'll add credits to your account so you can pick up where you left off, on me."

  const text = `S S E L F I E

Hey ${displayName},

A few things have changed since you left.

I'm not saying that to pitch you. I'm saying it because I know one of the hardest things about signing up for something new is not knowing if it'll actually work for you. And some of what made it harder — I've fixed.

GETTING STARTED
You now get your first brand photo in under 2 minutes — without having to read a tutorial or figure out settings first.

MAYA, YOUR AI STYLIST
Maya now remembers your sessions — so you don't have to re-explain your style every time. She gets better the more you use her.

THE WELCOME FLOW
No more guessing what to do next. The new onboarding walks you step by step — one action, one result, done.

These aren't feature updates for the sake of it. They're the exact things I know got in the way.

So I want to make it easy: come back and try it free. ${trialOffer}

Come back and try it free: ${rejoinLink}

If you've already moved on, I completely understand. But if there's still a part of you that wants consistent, beautiful content that actually looks and sounds like you — this is the moment.

XoXo Sandra

SSELFIE Studio — Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "This is different now",
  }
}
