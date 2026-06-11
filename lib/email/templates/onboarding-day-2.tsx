import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface OnboardingDay2Params {
  firstName?: string
}

export function generateOnboardingDay2Email(params: OnboardingDay2Params): {
  html: string
  text: string
  subject: string
} {
  const displayName = getFirstNameForEmail({ fullName: params.firstName })
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
    .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
    .replace(/\/+$/, "")
  const studioUrl = `${siteUrl}/app`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${displayName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Quick check-in. Have you made your first image yet?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If not, don't overthink it. You don't have to write anything or figure anything out.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#f0ede8;">The whole thing is three taps:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Pick a look. Maya pulls three concepts for you. Tap the one that feels most like you, and your photos are done in minutes.</p>`,
      "Quick Win",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Create your first image", studioUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">You've got this. One image is enough to get momentum back on your side.</p>
  `

  const html = renderStoneShell({
    title: "Your first image is waiting",
    eyebrow: "SUITE Day 2",
    subtitle: "Keep this simple. One image. One step.",
    bodyHtml,
  })

  const text = `SUITE Day 2

Hey ${displayName},

Quick check-in. Have you made your first image yet?

If not, don't overthink it. You don't have to write anything or figure anything out.

The whole thing is three taps:
Pick a look. Maya pulls three concepts for you. Tap the one that feels most like you, and your photos are done in minutes.

Create your first image: ${studioUrl}

You've got this. One image is enough to get momentum back on your side.

Sandra`

  return {
    html,
    text,
    subject: "Your first shoot is waiting. Let's make it feel like you",
  }
}
