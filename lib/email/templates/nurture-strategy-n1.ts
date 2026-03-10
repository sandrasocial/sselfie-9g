export interface NurtureStrategyEmailProps {
  firstName?: string
  recipientEmail: string
  strategyUrl?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const STRATEGY_FALLBACK_URL = `${SITE_URL}/brand-strategy`

export function generateNurtureStrategyN1Email({
  firstName,
  recipientEmail,
  strategyUrl,
}: NurtureStrategyEmailProps): {
  html: string
  text: string
  subject: string
} {
  const name = firstName?.trim() || recipientEmail.split("@")[0] || "friend"
  const safeStrategyUrl = strategyUrl || STRATEGY_FALLBACK_URL

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>did you see it?</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Inter,Arial,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fafaf9;">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e7e5e4;">
          <tr>
            <td style="padding:28px 28px 12px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Hi ${name},</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Just checking in.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Maya built your brand strategy a couple of days ago. And I'm genuinely curious - have you had a chance to look at it yet?</p>
              <p style="margin:0 0 22px;"><a href="${safeStrategyUrl}" style="color:#0a0a0a;font-size:15px;font-weight:600;">View Your Strategy -></a></p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">I ask because I remember the first time I got clear on my own brand pillars. It felt like someone had finally described what I'd been trying to say for years.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">But I also know how easy it is to save something and never go back to it.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">So I wanted to nudge you.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Your strategy is personalised to you - your business, your audience, your vibe. It's not generic. Maya built it from what you told her.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Go back and read it properly. Highlight the things that feel true. Cross out anything that doesn't.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">That's step one.</p>
              <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Sandra</p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#57534e;">P.S. If anything in your strategy felt off or confusing, just reply to this email. I actually read these.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Hi ${name},

Just checking in.

Maya built your brand strategy a couple of days ago. And I'm genuinely curious - have you had a chance to look at it yet?

View Your Strategy -> ${safeStrategyUrl}

I ask because I remember the first time I got clear on my own brand pillars. It felt like someone had finally described what I'd been trying to say for years.

But I also know how easy it is to save something and never go back to it.

So I wanted to nudge you.

Your strategy is personalised to you - your business, your audience, your vibe. It's not generic. Maya built it from what you told her.

Go back and read it properly. Highlight the things that feel true. Cross out anything that doesn't.

That's step one.

Sandra

P.S. If anything in your strategy felt off or confusing, just reply to this email. I actually read these.`

  return { html, text, subject: "did you see it?" }
}
