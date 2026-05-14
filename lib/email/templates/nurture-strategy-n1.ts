import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

export interface NurtureStrategyEmailProps {
  firstName?: string
  recipientEmail: string
  strategyUrl?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const STRATEGY_FALLBACK_URL = `${SITE_URL}/masterclass`

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
  const trackedStrategyUrl = buildRevenueEmailLink(safeStrategyUrl, {
    campaign: "brand_strategy_day2_revisit",
    content: "view_strategy",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your strategy is sitting there now.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">And I know how easy it is to save something helpful, then never really come back to it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">So this is your nudge. Open it again. Highlight the lines that feel uncomfortably true. Ignore the parts that do not sound like you yet.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("View your strategy", trackedStrategyUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">If anything feels off, reply and tell me. I want it to feel usable, not just impressive.</p>
  `

  const html = renderStoneShell({
    title: "Go back to it.",
    eyebrow: "Brand Strategy",
    subtitle: "Not because you need more information. Because you need the right words in front of you again.",
    bodyHtml,
    footerLead: "If it feels off, tell me where it loses you.",
    footerSignoff: "Sandra",
  })

  const text = `Hi ${name},

Your strategy is sitting there now.

And I know how easy it is to save something helpful, then never really come back to it.

So this is your nudge. Open it again. Highlight the lines that feel uncomfortably true. Ignore the parts that do not sound like you yet.

View your strategy: ${trackedStrategyUrl}

If anything feels off, reply and tell me. I want it to feel usable, not just impressive.

Sandra`

  return { html, text, subject: "Go back to it" }
}
