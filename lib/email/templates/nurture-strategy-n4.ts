import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

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
  const trackedMembershipUrl = buildRevenueEmailLink(MEMBERSHIP_URL, {
    campaign: "brand_strategy_day14_studio_story",
    content: "studio_checkout_story",
    source: "brand_strategy_day14_email",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">A lot of women do not need more ambition.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">They need a system that still works after the kids are asleep, after the client work, after the energy is gone.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is what Studio is trying to be. Not one more thing to manage. The thing that holds some of it with you.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("See Studio", trackedMembershipUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">If that is the part you need, the door is open.</p>
  `

  const html = renderStoneShell({
    title: "This is about capacity.",
    eyebrow: "Studio",
    subtitle: "Not more ambition. More support for the part that keeps slipping.",
    bodyHtml,
    footerLead: "If you need the system to carry more of the load, this is where to look.",
    footerSignoff: "Sandra",
  })

  const text = `Hi ${name},

A lot of women do not need more ambition.

They need a system that still works after the kids are asleep, after the client work, after the energy is gone.

That is what Studio is trying to be. Not one more thing to manage. The thing that holds some of it with you.

See Studio: ${trackedMembershipUrl}

If that is the part you need, the door is open.

Sandra`

  return { html, text, subject: "This is about capacity" }
}
