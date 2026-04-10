export interface NurtureStrategyEmailProps {
  firstName?: string
  recipientEmail: string
  strategyUrl?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const MEMBERSHIP_URL = `${SITE_URL}/checkout/membership`
const REFERRAL_URL = `${SITE_URL}/studio?tab=account`

export function generateNurtureStrategyN3Email({
  firstName,
  recipientEmail,
}: NurtureStrategyEmailProps): {
  html: string
  text: string
  subject: string
} {
  const name = firstName?.trim() || recipientEmail.split("@")[0] || "friend"

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>I want to show you something</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Inter,Arial,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fafaf9;">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e7e5e4;">
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Hi ${name},</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">You know that brand strategy Maya built for you?</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Imagine if you had an AI that actually remembered all of that. Your pillars. Your voice. Your audience. Your story.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">And every time you needed to create content - a caption, a reel script, a post idea - it already knew who you were. You didn't have to explain yourself from scratch every single time.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">That's what Studio is.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">It's where your brand strategy becomes your content engine.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">You get Maya — an AI that already knows your brand pillars, your voice, your aesthetic. A full content system. AI photo generation trained on your face so you never run out of visuals.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">€97/month. Cancel anytime.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">I built this because I needed it myself. And then my members needed it. And now it's the thing I'm most proud of building.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Know someone who'd love this? Share your invite link here: <a href="${REFERRAL_URL}" style="color:#0a0a0a;font-weight:600;">Open referrals -></a></p>
              <p style="margin:0 0 18px;"><a href="${MEMBERSHIP_URL}" style="color:#0a0a0a;font-size:15px;font-weight:600;">Take a look -></a></p>
              <p style="margin:0;font-size:16px;line-height:1.7;">Not pushing you. Just wanted you to know it exists.<br/><br/>Sandra</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Hi ${name},

You know that brand strategy Maya built for you?

Imagine if you had an AI that actually remembered all of that. Your pillars. Your voice. Your audience. Your story.

And every time you needed to create content - a caption, a reel script, a post idea - it already knew who you were. You didn't have to explain yourself from scratch every single time.

That's what Studio is.

It's where your brand strategy becomes your content engine.

You get Maya — an AI that already knows your brand pillars, your voice, your aesthetic. A full content system. AI photo generation trained on your face so you never run out of visuals.

€97/month. Cancel anytime.

I built this because I needed it myself. And then my members needed it. And now it's the thing I'm most proud of building.

Know someone who'd love this? Share your invite link here: ${REFERRAL_URL}

Take a look -> ${MEMBERSHIP_URL}

Not pushing you. Just wanted you to know it exists.

Sandra`

  return { html, text, subject: "I want to show you something" }
}
