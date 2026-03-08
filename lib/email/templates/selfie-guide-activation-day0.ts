import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

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

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Just making sure you saw this.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your Selfie Guide is live and ready for you. This is not something you need to binge. Give yourself fifteen calm minutes and start with chapter one.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The goal is simple. One good selfie that actually feels like you, and a repeatable system you can come back to whenever you need fresh content.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.7;color:#f0ede8;">Here's how I'd use it today:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">1. Open the guide<br />2. Read chapter one only<br />3. Take one new photo before you close the page</p>`,
      "Start Here",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your Selfie Guide", accessUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">If you get stuck, reply to this email and tell me what feels hard. I'll point you in the right direction.</p>
  `

  const html = renderStoneShell({
    title: "Your guide is waiting",
    eyebrow: "Selfie Guide",
    subtitle: "Start simple. One chapter. One photo. That's enough.",
    bodyHtml,
    footerLead: "You've got this. Start small and keep it easy.",
  })

  const text = `Selfie Guide

Hey ${name},

Just making sure you saw this.

Your Selfie Guide is live and ready for you. This is not something you need to binge. Give yourself fifteen calm minutes and start with chapter one.

The goal is simple. One good selfie that actually feels like you, and a repeatable system you can come back to whenever you need fresh content.

Here's how I'd use it today:
1. Open the guide
2. Read chapter one only
3. Take one new photo before you close the page

Open your Selfie Guide: ${accessUrl}

If you get stuck, reply to this email and tell me what feels hard. I'll point you in the right direction.

You've got this.
Sandra`

  return {
    html,
    text,
    subject: "Start here with your Selfie Guide",
  }
}
