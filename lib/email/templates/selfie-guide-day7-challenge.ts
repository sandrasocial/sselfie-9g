import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { starterKitLandingUrl } from "./selfie-education-links"

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
  const trackedStarterKitUrl = buildRevenueEmailLink(starterKitLandingUrl(), {
    campaign: "selfie_guide_day7_challenge",
    content: "starter_kit",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Honestly? You don&apos;t need another tip.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You need the part where it becomes real.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Go straight to the 7-day challenge. Day 1 is simple. Window light. Ten shots. No pressure to like all of them.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#f0ede8;">Why this matters:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">The challenge gets you out of thinking about showing up and back into actually doing it. By Day 7, you should have one photo you wouldn&apos;t have taken a week ago.</p>`,
      "The 7-Day Challenge",
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open the guide and start there.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">This is the part that actually changes things.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("See the Starter Kit", trackedStarterKitUrl)}</div>
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

Honestly? You don't need another tip.

You need the part where it becomes real.

Go straight to the 7-day challenge. Day 1 is simple. Window light. Ten shots. No pressure to like all of them.

Why this matters:

The challenge gets you out of thinking about showing up and back into actually doing it. By Day 7, you should have one photo you wouldn't have taken a week ago.

Open the guide and start there.

This is the part that actually changes things.

See the Starter Kit: ${trackedStarterKitUrl}

Reply and tell me how Day 1 goes. I want to know.
Sandra x`

  return {
    html,
    text,
    subject: "you don't need another tip",
  }
}
