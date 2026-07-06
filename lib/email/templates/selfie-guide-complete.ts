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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That matters more than it sounds. Most people don't finish things.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You have everything you need for a great selfie now. The settings, the light, the angles, the edit. And you've actually done the practice, not just read about it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here's the honest part about what comes next.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Knowing how to take a great selfie is the beginning. The next layer is knowing what to say with it, where it fits in your content, and what it actually leads to.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That's what the Masterclass is for.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It gives you my full method for captions, a content rhythm, your simple offer, and a 30-day plan, so your photos stop sitting in your camera roll.</p>
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

That matters more than it sounds. Most people don't finish things.

You have everything you need for a great selfie now. The settings, the light, the angles, the edit. And you've actually done the practice, not just read about it.

Here's the honest part about what comes next.

Knowing how to take a great selfie is the beginning. The next layer is knowing what to say with it, where it fits in your content, and what it actually leads to.

That's what the Masterclass is for.

It gives you my full method for captions, a content rhythm, your simple offer, and a 30-day plan, so your photos stop sitting in your camera roll.

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
