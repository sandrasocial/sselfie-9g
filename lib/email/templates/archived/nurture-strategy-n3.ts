import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

export interface NurtureStrategyEmailProps {
  firstName?: string
  recipientEmail: string
  strategyUrl?: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const MEMBERSHIP_URL = `${SITE_URL}/checkout/membership`

export function generateNurtureStrategyN3Email({
  firstName,
  recipientEmail,
}: NurtureStrategyEmailProps): {
  html: string
  text: string
  subject: string
} {
  const name = firstName?.trim() || recipientEmail.split("@")[0] || "friend"
  const trackedMembershipUrl = buildRevenueEmailLink(MEMBERSHIP_URL, {
    campaign: "brand_strategy_day9_studio",
    content: "studio_checkout",
    source: "brand_strategy_day9_email",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You are not confused. You are too close to it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is why the SUITE exists.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Maya keeps the memory. Your voice. Your pillars. Your visual direction. So you are not rebuilding your brand from scratch every time you need to post.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Take a look at the SUITE", trackedMembershipUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">If you are tired of doing every part of this alone, this is the next step.</p>
  `

  const html = renderStoneShell({
    title: "You are too close to it.",
    eyebrow: "SSELFIE SUITE",
    subtitle: "The SUITE keeps the context, so you do not have to keep rebuilding it.",
    bodyHtml,
    footerLead: "No pressure. Just making sure you know what the next layer is.",
    footerSignoff: "Sandra",
  })

  const text = `Hi ${name},

You are not confused. You are too close to it.

That is why the SUITE exists.

Maya keeps the memory. Your voice. Your pillars. Your visual direction. So you are not rebuilding your brand from scratch every time you need to post.

Take a look at the SUITE: ${trackedMembershipUrl}

If you are tired of doing every part of this alone, this is the next step.

Sandra`

  return { html, text, subject: "You are too close to it" }
}
