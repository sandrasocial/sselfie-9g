import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface SelfieGuideDay3CheckinParams {
  firstName?: string
  recipientEmail: string
  accessUrl: string
}

export function generateSelfieGuideDay3CheckinEmail({
  firstName,
  recipientEmail,
  accessUrl,
}: SelfieGuideDay3CheckinParams): {
  html: string
  text: string
  subject: string
} {
  const name = getFirstNameForEmail({ fullName: firstName, email: recipientEmail })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Three days ago you picked up the Selfie Guide.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">I wanted to check in.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you've already read through it — brilliant. If it's sitting in a tab you keep meaning to get back to — that's fine too. I built this to be useful when you're ready, not something to binge and feel guilty about.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">But if you've only got 5 minutes today, here's the one thing worth doing right now:</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Go to Part 2. Read the section called "The Free Light You Already Have."</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Then take one selfie in natural window light. Just one. With whatever you're wearing. No preparation.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That one photo will show you more about what makes a selfie work than anything I could write.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That's it. Five minutes. One selfie.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">Go.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open Part 2", accessUrl)}</div>
  `

  const html = renderStoneShell({
    title: "Five minutes. One selfie.",
    eyebrow: "Selfie Guide",
    subtitle: "You don't need to be ready. Just start.",
    bodyHtml,
    footerLead: "Reply if you get stuck — tell me what feels hard.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

Three days ago you picked up the Selfie Guide.

I wanted to check in.

If you've already read through it — brilliant. If it's sitting in a tab you keep meaning to get back to — that's fine too. I built this to be useful when you're ready, not something to binge and feel guilty about.

But if you've only got 5 minutes today, here's the one thing worth doing right now:

Go to Part 2. Read the section called "The Free Light You Already Have."

Then take one selfie in natural window light. Just one. With whatever you're wearing. No preparation.

That one photo will show you more about what makes a selfie work than anything I could write.

That's it. Five minutes. One selfie.

Go.

Open Part 2: ${accessUrl}

Reply if you get stuck — tell me what feels hard.
Sandra x`

  return {
    html,
    text,
    subject: "You've had it for 3 days — did you try this?",
  }
}
