import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface SelfieGuideCompleteParams {
  firstName?: string
  recipientEmail: string
}

const STUDIO_CHECKOUT_URL = "https://sselfie.ai/checkout/membership"

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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Knowing how to take a great selfie is the beginning. The part that actually moves the needle for your business is what happens after you take it: consistent, strategic visibility, week after week, without burning out or spending hours on every caption.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That's what SSELFIE Studio is for.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Maya already knows how to take everything you learned in this guide and execute it at scale. One selfie. A month of content. Your face, your brand, your voice — just faster.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">Your first two photos are free. Come try it.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open Studio", STUDIO_CHECKOUT_URL)}</div>
  `

  const html = renderStoneShell({
    title: "You finished it.",
    eyebrow: "Selfie Guide",
    subtitle: "Here's what comes next.",
    bodyHtml,
    footerLead: "Reply if you want to talk through whether Studio is right for you.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

You just finished the Selfie Guide.

That matters. Most people don't finish things.

You have everything you need to take a great selfie. The settings. The light. The angles. The edit. And you've actually done the practice.

Now here's the honest truth about what comes next.

Knowing how to take a great selfie is the beginning. The part that actually moves the needle for your business is what happens after you take it: consistent, strategic visibility, week after week, without burning out or spending hours on every caption.

That's what SSELFIE Studio is for.

Maya already knows how to take everything you learned in this guide and execute it at scale. One selfie. A month of content. Your face, your brand, your voice — just faster.

Your first two photos are free. Come try it.

Open Studio: ${STUDIO_CHECKOUT_URL}

Reply if you want to talk through whether Studio is right for you.
Sandra x`

  return {
    html,
    text,
    subject: "You finished it. Here's what comes next.",
  }
}
