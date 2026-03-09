export interface NurtureStrategyEmailProps {
  firstName?: string
  recipientEmail: string
  strategyUrl?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const MEMBERSHIP_URL = `${SITE_URL}/checkout/membership`

export function generateNurtureStrategyN4Email({
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
  <title>a real message I got last week</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fafaf9;">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #e7e5e4;">
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Hi ${name},</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">I got a DM last week that stopped me mid-scroll.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">It was from a woman who joined Studio two months ago. Single mum. Rebuilding after a divorce. She'd been invisible online for years - posting occasionally, getting nothing back, feeling like it was too late for her.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">She wrote: "I posted every day this week and got 3 DMs from potential clients. I don't know who I am anymore."</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">That's the thing about showing up consistently with a clear brand. The algorithm eventually rewards it. But more than that - you start believing in yourself again.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">I know what it's like to feel invisible. I know what it's like to think your window has passed.</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">It hasn't.</p>
              <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">If you're ready to stop figuring it out alone, Studio is where you come.</p>
              <p style="margin:0 0 18px;"><a href="${MEMBERSHIP_URL}" style="color:#0a0a0a;font-size:15px;font-weight:600;">Join Creator Studio -></a></p>
              <p style="margin:0;font-size:16px;line-height:1.7;">EUR 97/month. Cancel any time. I'm in there every day.<br/><br/>Sandra</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `Hi ${name},

I got a DM last week that stopped me mid-scroll.

It was from a woman who joined Studio two months ago. Single mum. Rebuilding after a divorce. She'd been invisible online for years - posting occasionally, getting nothing back, feeling like it was too late for her.

She wrote: "I posted every day this week and got 3 DMs from potential clients. I don't know who I am anymore."

That's the thing about showing up consistently with a clear brand. The algorithm eventually rewards it. But more than that - you start believing in yourself again.

I know what it's like to feel invisible. I know what it's like to think your window has passed.

It hasn't.

If you're ready to stop figuring it out alone, Studio is where you come.

Join Creator Studio -> ${MEMBERSHIP_URL}

EUR 97/month. Cancel any time. I'm in there every day.

Sandra`

  return { html, text, subject: "a real message I got last week" }
}
