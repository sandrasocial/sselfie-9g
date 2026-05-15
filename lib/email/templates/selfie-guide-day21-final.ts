import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { masterclassLandingUrl } from "./selfie-education-links"

export interface SelfieGuideDay21FinalParams {
  firstName?: string
  recipientEmail: string
  accessUrl: string
  expiryDate?: string
}

export function generateSelfieGuideDay21FinalEmail({
  firstName,
  recipientEmail,
  accessUrl,
}: SelfieGuideDay21FinalParams): {
  html: string
  text: string
  subject: string
} {
  const name = getFirstNameForEmail({ fullName: firstName, email: recipientEmail })
  const trackedMasterclassUrl = buildRevenueEmailLink(masterclassLandingUrl(), {
    campaign: "selfie_guide_day21_masterclass",
    content: "masterclass_cta",
    source: "selfie_guide_day21_email",
  })
  const trackedGuideUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "selfie_guide_day21_masterclass",
    content: "return_to_guide",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Maybe you did not need more time.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Maybe you needed less pressure. Less starting over. Less having to figure out the whole system by yourself every single time.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is what the Masterclass is for.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Not to add more to your plate. To give you a method that holds so showing up gets easier, not harder.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">Light, pose, edit, post, repeat. In the right order. Once.</p>
    <div style="margin:26px 0 14px;">${renderStoneButton("See the Masterclass", trackedMasterclassUrl)}</div>
    <p style="margin:0;font-size:14px;line-height:1.7;text-align:center;"><a href="${trackedGuideUrl}" style="color:#a8a49c;text-decoration:underline;">Need to go back to the guide first? That&apos;s fine.</a></p>
  `

  const html = renderStoneShell({
    title: "Three weeks in.",
    eyebrow: "Selfie Guide",
    subtitle: "This is the part about staying visible when life gets loud.",
    bodyHtml,
    footerLead: "Reply if you want to talk it through before you decide.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

Maybe you did not need more time.

Maybe you needed less pressure. Less starting over. Less having to figure out the whole system by yourself every single time.

That is what the Masterclass is for.

Not to add more to your plate. To give you a method that holds so showing up gets easier, not harder.

Light, pose, edit, post, repeat. In the right order. Once.

See the Masterclass: ${trackedMasterclassUrl}

Need to go back to the guide first? ${trackedGuideUrl}

Reply if you want to talk it through before you decide.
Sandra x`

  return {
    html,
    text,
    subject: "Maybe you did not need more time",
  }
}
