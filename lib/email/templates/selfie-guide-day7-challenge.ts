import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

export interface SelfieGuideDay7ChallengeParams {
  firstName?: string
  recipientEmail: string
  accessUrl: string
}

export function generateSelfieGuideDay7ChallengeEmail({
  firstName,
  recipientEmail,
  accessUrl,
}: SelfieGuideDay7ChallengeParams): {
  html: string
  text: string
  subject: string
} {
  const name = getFirstNameForEmail({ fullName: firstName, email: recipientEmail })
  const trackedAccessUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "selfie_guide_day7_challenge",
    content: "start_challenge",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You do not need another tip.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You need the part where it becomes real.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Go straight to the 7-day challenge. Day 1 is simple. Window light. Ten shots. No pressure to like all of them.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#f0ede8;">Why this matters:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">The challenge gets you out of the loop of thinking about showing up and back into actually doing it. By Day 7, you should have one photo you would not have taken a week ago.</p>`,
      "The 7-Day Challenge",
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open the guide and start there.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">This is the part that changes things.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Start the 7-Day Challenge", trackedAccessUrl)}</div>
  `

  const html = renderStoneShell({
    title: "This is your Day 1.",
    eyebrow: "Selfie Guide",
    subtitle: "Thinking about it is one thing. Doing it is the shift.",
    bodyHtml,
    footerLead: "Reply and tell me how Day 1 goes. I want to know.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

You do not need another tip.

You need the part where it becomes real.

Go straight to the 7-day challenge. Day 1 is simple. Window light. Ten shots. No pressure to like all of them.

Why this matters:

The challenge gets you out of the loop of thinking about showing up and back into actually doing it. By Day 7, you should have one photo you would not have taken a week ago.

Open the guide and start there.

This is the part that changes things.

Start the 7-Day Challenge: ${trackedAccessUrl}

Reply and tell me how Day 1 goes. I want to know.
Sandra x`

  return {
    html,
    text,
    subject: "You do not need another tip",
  }
}
