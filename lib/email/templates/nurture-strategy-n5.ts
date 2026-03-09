export interface NurtureStrategyEmailProps {
  firstName?: string
  recipientEmail: string
  strategyUrl?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const MEMBERSHIP_URL = `${SITE_URL}/checkout/membership`

export function generateNurtureStrategyN5Email({
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
  <title>I'm going to be honest with you</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fafaf9;">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e7e5e4;">
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Hi ${name},</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">This is the last email I'll send you about Studio.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">And I want to be honest: I don't know if it's right for you. Only you know that.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">But here's what I do know.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">You took the time to build a brand strategy with Maya. You cared enough to do that. That tells me you're not just scrolling - you're actually trying to build something real.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">And doing that alone is hard. Not impossible. But hard.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Studio isn't for everyone. It's for the women who are done doing it alone. Who want a system, an AI that knows their brand, and a community of women building the same thing.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">If that's you - the door is open.</p>
              <p style="margin:0 0 18px;"><a href="${MEMBERSHIP_URL}" style="color:#0a0a0a;font-size:15px;font-weight:600;">Join Creator Studio -></a></p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">If it's not the right time - no pressure at all. Your guide is yours. Use it. Build with it. Come back when you're ready.</p>
              <p style="margin:0;font-size:16px;line-height:1.7;">I'll be here.<br/><br/>Sandra</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Hi ${name},

This is the last email I'll send you about Studio.

And I want to be honest: I don't know if it's right for you. Only you know that.

But here's what I do know.

You took the time to build a brand strategy with Maya. You cared enough to do that. That tells me you're not just scrolling - you're actually trying to build something real.

And doing that alone is hard. Not impossible. But hard.

Studio isn't for everyone. It's for the women who are done doing it alone. Who want a system, an AI that knows their brand, and a community of women building the same thing.

If that's you - the door is open.

Join Creator Studio -> ${MEMBERSHIP_URL}

If it's not the right time - no pressure at all. Your guide is yours. Use it. Build with it. Come back when you're ready.

I'll be here.

Sandra`

  return { html, text, subject: "I'm going to be honest with you" }
}
