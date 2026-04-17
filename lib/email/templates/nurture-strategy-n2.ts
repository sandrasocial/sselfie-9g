import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

export interface NurtureStrategyEmailProps {
  firstName?: string
  recipientEmail: string
  strategyUrl?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const STRATEGY_FALLBACK_URL = `${SITE_URL}/brand-strategy`

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
  const strategyLink = strategyUrl || STRATEGY_FALLBACK_URL
  const trackedStrategyUrl = buildRevenueEmailLink(strategyLink, {
    campaign: "brand_strategy_day5_apply",
    content: "strategy_revisit",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here is the part nobody really talks about.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Clarity does not instantly make you consistent. But it does stop you from sitting down to create and feeling foggy every single time.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is why I want you back inside your strategy. Not to admire it. To use it.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your strategy again", trackedStrategyUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">Read it like a tool. Not like homework.</p>
  `

  const html = renderStoneShell({
    title: "Clarity helps.",
    eyebrow: "Brand Strategy",
    subtitle: "Not because it solves everything. Because it removes some of the static.",
    bodyHtml,
    footerLead: "Use it like a tool. That is enough.",
    footerSignoff: "Sandra",
  })

  const text = `Hi ${name},

Here is the part nobody really talks about.

Clarity does not instantly make you consistent. But it does stop you from sitting down to create and feeling foggy every single time.

That is why I want you back inside your strategy. Not to admire it. To use it.

Open your strategy again: ${trackedStrategyUrl}

Read it like a tool. Not like homework.

Sandra`

  return { html, text, subject: "Clarity helps" }
}
