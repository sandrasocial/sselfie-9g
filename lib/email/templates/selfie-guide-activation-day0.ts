import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"
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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your guide is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You do not need to binge it. You do not need to suddenly become a camera person.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Give yourself fifteen quiet minutes. Start with chapter one. Let one decent photo be enough for today.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#f0ede8;">Here&apos;s how I&apos;d use it today:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">1. Open the guide<br />2. Read chapter one only<br />3. Take one new photo before you close the page</p>`,
      "Start Here",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your Selfie Guide", trackedAccessUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">If you get stuck, reply to this email and tell me what feels hard. I&apos;ll point you in the right direction.</p>
  `

  const html = renderStoneShell({
    title: "Your guide is waiting",
    eyebrow: "Selfie Guide",
    subtitle: "Start simple. One chapter. One photo. That counts.",
    bodyHtml,
    footerLead: "Start small. Keep it easy.",
  })

  const text = `Selfie Guide

Hey ${name},

Your guide is ready.

You do not need to binge it. You do not need to suddenly become a camera person.

Give yourself fifteen quiet minutes. Start with chapter one. Let one decent photo be enough for today.

Here's how I'd use it today:
1. Open the guide
2. Read chapter one only
3. Take one new photo before you close the page

Open your Selfie Guide: ${trackedAccessUrl}

If you get stuck, reply to this email and tell me what feels hard. I'll point you in the right direction.

Sandra`

  return {
    html,
    text,
    subject: "You do not need to feel ready for this",
  }
}
