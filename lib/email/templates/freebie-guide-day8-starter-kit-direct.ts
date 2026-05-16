import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { starterKitCheckoutUrl } from "./selfie-education-links"

interface FreebieGuideTouchParams {
  firstName: string
  recipientEmail: string
  accessUrl: string
}

export function generateFreebieGuideDay8StarterKitDirectEmail({
  firstName,
}: FreebieGuideTouchParams): { html: string; text: string; subject: string } {
  const starterKitUrl = buildRevenueEmailLink(starterKitCheckoutUrl(), {
    campaign: "freebie_guide_day8_starter_kit_direct",
    content: "get_starter_kit",
    emailType: "freebie-guide-day8-starter-kit-direct",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">The Starter Kit is still open.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">What you get:</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Lightroom presets made for iPhone selfies<br />Editing walkthroughs so you know exactly what to change<br />A 7-day content plan so your photos have somewhere to go</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">$37. One time. Yours to keep.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Get the Starter Kit - $37", starterKitUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the free guide is enough for now, that is fine. You have it.</p>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "The Starter Kit is $37",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "The Starter Kit is $37.",
      subtitle: "One time. Yours to keep.",
      bodyHtml,
      footerLead: "If the free guide is enough for now, that is fine.",
      footerSignoff: "",
    }),
    text: `Hi ${firstName},

The Starter Kit is still open.

What you get:

Lightroom presets made for iPhone selfies
Editing walkthroughs so you know exactly what to change
A 7-day content plan so your photos have somewhere to go

$37. One time. Yours to keep.

Get the Starter Kit - $37:
${starterKitUrl}

If the free guide is enough for now, that is fine. You have it.

Sandra x`,
  }
}
