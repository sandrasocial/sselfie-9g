import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"
import { masterclassLandingUrl } from "./selfie-education-links"

export interface SelfieGuideCompleteParams {
  firstName?: string
  recipientEmail: string
}

export function generateSelfieGuideCompleteEmail({
  firstName,
  recipientEmail,
}: SelfieGuideCompleteParams): {
  html: string
  text: string
  subject: string
} {
  const name = getFirstNameForEmail({ fullName: firstName, email: recipientEmail })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You just finished the Selfie Guide.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That matters. Most people don't finish things.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You have everything you need to take a great selfie. The settings. The light. The angles. The edit. And you've actually done the practice.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Now here's the honest truth about what comes next.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Knowing how to take a great selfie is the beginning. The next layer is knowing what to say with it, where it fits in your content, and what step it leads to.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is what the Masterclass is for.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It gives you Sandra's full method for captions, content rhythm, your simple offer, and a 30-day plan so your photos are not just sitting in your camera roll.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">If you want the whole path, go there next.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("See the Masterclass", masterclassLandingUrl())}</div>
  `

  const html = renderStoneShell({
    title: "You finished it.",
    eyebrow: "Selfie Guide",
    subtitle: "Here's what comes next.",
    bodyHtml,
    footerLead: "Reply if you want to talk through the next step.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

You just finished the Selfie Guide.

That matters. Most people don't finish things.

You have everything you need to take a great selfie. The settings. The light. The angles. The edit. And you've actually done the practice.

Now here's the honest truth about what comes next.

Knowing how to take a great selfie is the beginning. The next layer is knowing what to say with it, where it fits in your content, and what step it leads to.

That is what the Masterclass is for.

It gives you Sandra's full method for captions, content rhythm, your simple offer, and a 30-day plan so your photos are not just sitting in your camera roll.

If you want the whole path, go there next.

See the Masterclass: ${masterclassLandingUrl()}

Reply if you want to talk through the next step.
Sandra x`

  return {
    html,
    text,
    subject: "You finished it. Here's what comes next.",
  }
}
