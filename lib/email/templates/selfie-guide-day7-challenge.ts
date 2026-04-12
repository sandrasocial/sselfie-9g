import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

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

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One week with the guide.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Today I want you to do something different.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Forget everything except Part 7. The 7-day challenge. Start it today — Day 1 is just one selfie in window light, 10 shots minimum.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You've already read how to do it. Now I want you to actually do it.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#f0ede8;">Here's why the challenge matters:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Reading about selfies is one thing. Taking them is another. Every day of the challenge builds one skill on top of the last. By Day 7, you'll have a photo worth posting and a system you can repeat.</p>`,
      "The 7-Day Challenge",
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open the guide and go straight to Part 7. The challenge is waiting.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">One week from now, you'll have your first brand selfie. Let's go.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Start the 7-Day Challenge", accessUrl)}</div>
  `

  const html = renderStoneShell({
    title: "This is your Day 1.",
    eyebrow: "Selfie Guide",
    subtitle: "Reading about selfies is one thing. Taking them is another.",
    bodyHtml,
    footerLead: "Reply and tell me how Day 1 goes. I want to know.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

One week with the guide.

Today I want you to do something different.

Forget everything except Part 7. The 7-day challenge. Start it today — Day 1 is just one selfie in window light, 10 shots minimum.

You've already read how to do it. Now I want you to actually do it.

Here's why the challenge matters:

Reading about selfies is one thing. Taking them is another. Every day of the challenge builds one skill on top of the last. By Day 7, you'll have a photo worth posting and a system you can repeat.

Open the guide and go straight to Part 7. The challenge is waiting.

One week from now, you'll have your first brand selfie. Let's go.

Start the 7-Day Challenge: ${accessUrl}

Reply and tell me how Day 1 goes. I want to know.
Sandra x`

  return {
    html,
    text,
    subject: "This is your Day 1",
  }
}
