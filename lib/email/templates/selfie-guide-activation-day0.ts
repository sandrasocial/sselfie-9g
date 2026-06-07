import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

export interface SelfieGuideActivationDay0Params {
  firstName?: string
  recipientEmail: string
  accessUrl: string
}

export function generateSelfieGuideActivationDay0Email({
  firstName,
  recipientEmail,
  accessUrl,
}: SelfieGuideActivationDay0Params): {
  html: string
  text: string
  subject: string
} {
  const name = getFirstNameForEmail({ fullName: firstName, email: recipientEmail })
  const trackedAccessUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "selfie_guide_day0_delivery",
    content: "open_guide",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your Selfie Guide is ready. Here it is:</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open my Selfie Guide", trackedAccessUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Before you dive in, here&apos;s one fast win you can try in the next five minutes:</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hold your phone a little above eye level and look up at it, just slightly. Not a lot, just enough. It opens your eyes, softens your jaw, and instantly looks more flattering. Most people shoot from too low, and that&apos;s what makes a photo feel a bit off.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Try it by a window with the light on your face. That&apos;s the whole trick.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">Have a play with it, and I&apos;ll check in tomorrow to see how it went.</p>
  `

  const html = renderStoneShell({
    title: "Your free selfie guide.",
    eyebrow: "Selfie Guide",
    subtitle: "The angle trick that changes everything.",
    bodyHtml,
    footerLead: "",
  })

  const text = `Selfie Guide

Hey ${name},

Your Selfie Guide is ready. Here it is:

Open my Selfie Guide: ${trackedAccessUrl}

Before you dive in, here's one fast win you can try in the next five minutes:

Hold your phone a little above eye level and look up at it, just slightly. Not a lot, just enough. It opens your eyes, softens your jaw, and instantly looks more flattering. Most people shoot from too low, and that's what makes a photo feel a bit off.

Try it by a window with the light on your face. That's the whole trick.

Have a play with it, and I'll check in tomorrow to see how it went.

Sandra x`

  return {
    html,
    text,
    subject: "your free selfie guide (+ one quick fix)",
  }
}
