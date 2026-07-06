import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface BrandStrategyPaidDeliveryParams {
  firstName?: string
  recipientEmail: string
  strategyUrl: string
}

export function generateBrandStrategyPaidDeliveryEmail({
  firstName,
  recipientEmail,
  strategyUrl,
}: BrandStrategyPaidDeliveryParams): {
  html: string
  text: string
  subject: string
} {
  const name = getFirstNameForEmail({ fullName: firstName, email: recipientEmail })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Maya just finished building your brand strategy. It's ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here's what's inside:</p>
    ${renderStonePanel(
      `<p style="margin:0;font-size:15px;line-height:1.9;color:#a8a49c;">· Positioning statement<br />· Three content pillars<br />· Voice guide (what to say, what to avoid)<br />· Caption starters you can use right now</p>`,
      "Your Strategy",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("View Your Brand Strategy", strategyUrl)}</div>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#a8a49c;">Bookmark the link. It's yours to keep forever. Come back to it whenever you need a reminder of your direction.</p>
    <p style="margin:0;font-size:14px;line-height:1.75;color:#a8a49c;">If anything in your strategy feels off, reply to this email. I read every one.</p>
  `

  const html = renderStoneShell({
    title: "Your strategy is ready",
    eyebrow: "Brand Strategy",
    subtitle: "Maya built this for you. Use it however you want.",
    bodyHtml,
    footerLead: "When you're ready to generate photos that match this strategy, the SUITE is waiting.",
  })

  const text = `Brand Strategy

Hey ${name},

Maya just finished building your brand strategy. It's ready.

Here's what's inside:
· Positioning statement
· Three content pillars
· Voice guide (what to say, what to avoid)
· Caption starters you can use right now

View Your Brand Strategy: ${strategyUrl}

Bookmark the link. It's yours to keep forever. Come back to it whenever you need a reminder of your direction.

If anything in your strategy feels off, reply to this email. I read every one.

When you're ready to generate photos that match this strategy, the SUITE is waiting.

Sandra x`

  return {
    html,
    text,
    subject: `Your brand strategy is ready, ${name}`,
  }
}
