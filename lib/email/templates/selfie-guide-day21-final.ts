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
    content: "masterclass_bridge",
    source: "selfie_guide_day21_email",
  })
  const trackedGuideUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "selfie_guide_day21_masterclass",
    content: "return_to_guide",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Three weeks in.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If the guide helped, your photos are probably starting to feel easier.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The next question is what to do with them.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is where the Masterclass fits. It takes the selfie work and turns it into captions, content rhythm, offer clarity, and a 30-day plan you can actually follow.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">If you want Sandra&apos;s full method in one place, this is the next step.</p>
    <div style="margin:26px 0 14px;">${renderStoneButton("See the Masterclass", trackedMasterclassUrl)}</div>
    <p style="margin:0;font-size:14px;line-height:1.7;text-align:center;"><a href="${trackedGuideUrl}" style="color:#a8a49c;text-decoration:underline;">Need to go back to the guide first? That&apos;s fine.</a></p>
  `

  const html = renderStoneShell({
    title: "Three weeks in.",
    eyebrow: "Selfie Guide",
    subtitle: "The next question is what to do with the photos.",
    bodyHtml,
    footerLead: "Keep going at the pace that works.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

Three weeks in.

If the guide helped, your photos are probably starting to feel easier.

The next question is what to do with them.

That is where the Masterclass fits. It takes the selfie work and turns it into captions, content rhythm, offer clarity, and a 30-day plan you can actually follow.

If you want Sandra's full method in one place, this is the next step.

See the Masterclass: ${trackedMasterclassUrl}

Need to go back to the guide first? ${trackedGuideUrl}

Keep going at the pace that works.
Sandra x`

  return {
    html,
    text,
    subject: "Maybe you did not need more time",
  }
}
