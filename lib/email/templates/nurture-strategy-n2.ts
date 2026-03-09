export interface NurtureStrategyEmailProps {
  firstName?: string
  recipientEmail: string
  strategyUrl?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const GUIDE_FALLBACK_URL = `${SITE_URL}/selfie-guide`

export function generateNurtureStrategyN2Email({
  firstName,
  recipientEmail,
  strategyUrl,
}: NurtureStrategyEmailProps): {
  html: string
  text: string
  subject: string
} {
  const name = firstName?.trim() || recipientEmail.split("@")[0] || "friend"
  const guideUrl = strategyUrl || GUIDE_FALLBACK_URL

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>the part nobody tells you</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fafaf9;">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e7e5e4;">
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Hi ${name},</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Let me be really honest for a second.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">When I started out, I had a brand strategy too. I knew my pillars. I knew my voice. I knew who I was talking to.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">And I still wasn't growing.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Here's the thing. Having a strategy in a document doesn't build an audience. Showing up consistently - with the right content, on the right days, in your real voice - that's what does it.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">And that part? That's where most women get stuck.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Not because they don't know what to post. But because it takes so much time. And you're already doing everything else.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">The business. The kids. The life.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">I spent the first year of SSELFIE burning out trying to be consistent. I'd batch content on a Sunday, feel good for a week, then fall behind again.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Then I built a system. And everything changed.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Not because I suddenly had more hours. But because I stopped using my brain for the stuff AI could do better and faster.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">That's what I want to show you next.</p>
              <p style="margin:0 0 18px;"><a href="${guideUrl}" style="color:#0a0a0a;font-size:15px;font-weight:600;">Go back and read your guide -></a></p>
              <p style="margin:0;font-size:16px;line-height:1.7;">Sandra</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Hi ${name},

Let me be really honest for a second.

When I started out, I had a brand strategy too. I knew my pillars. I knew my voice. I knew who I was talking to.

And I still wasn't growing.

Here's the thing. Having a strategy in a document doesn't build an audience. Showing up consistently - with the right content, on the right days, in your real voice - that's what does it.

And that part? That's where most women get stuck.

Not because they don't know what to post. But because it takes so much time. And you're already doing everything else.

The business. The kids. The life.

I spent the first year of SSELFIE burning out trying to be consistent. I'd batch content on a Sunday, feel good for a week, then fall behind again.

Then I built a system. And everything changed.

Not because I suddenly had more hours. But because I stopped using my brain for the stuff AI could do better and faster.

That's what I want to show you next.

Go back and read your guide -> ${guideUrl}

Sandra`

  return { html, text, subject: "the part nobody tells you" }
}
