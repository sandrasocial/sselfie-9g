import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

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
  const trackedMembershipUrl = buildRevenueEmailLink(MEMBERSHIP_URL, {
    campaign: "brand_strategy_day20_studio_final",
    content: "studio_checkout_final",
    source: "brand_strategy_day20_email",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">This is the last note I&apos;ll send you about the SUITE.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">I do not know if it is the right time. Only you know that.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">What I do know is this. Doing all of this alone is heavier than most people admit.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you want the system, the door is open. If not, keep your strategy and use it well.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Join the SUITE", trackedMembershipUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">No pressure. Just a clear door if you want it.</p>
  `

  const html = renderStoneShell({
    title: "The door is open.",
    eyebrow: "SSELFIE SUITE",
    subtitle: "If you want the system, it is here. If not, use what you already have well.",
    bodyHtml,
    footerLead: "No pressure from me.",
    footerSignoff: "Sandra",
  })

  const text = `Hi ${name},

This is the last note I'll send you about the SUITE.

I do not know if it is the right time. Only you know that.

What I do know is this. Doing all of this alone is heavier than most people admit.

If you want the system, the door is open. If not, keep your strategy and use it well.

Join the SUITE: ${trackedMembershipUrl}

No pressure. Just a clear door if you want it.

Sandra`

  return { html, text, subject: "The door is open" }
}
