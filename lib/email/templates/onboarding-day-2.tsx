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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Quick check-in. Have you made your first photo yet?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If not, don't overthink it. You don't need to write anything or figure anything out.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#f0ede8;">It's really just three taps:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Pick a look. Maya pulls three concepts for you. Tap the one that feels most like you, and your photos are ready in minutes.</p>`,
      "Quick Win",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Create your first photo", studioUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">You've got this. One photo is enough to get your momentum going.</p>
  `

  const html = renderStoneShell({
    title: "Your first photo is waiting",
    eyebrow: "SUITE Day 2",
    subtitle: "Keep this simple. One photo. One step.",
    bodyHtml,
  })

  const text = `SUITE Day 2

Hey ${displayName},

Quick check-in. Have you made your first photo yet?

If not, don't overthink it. You don't need to write anything or figure anything out.

It's really just three taps:
Pick a look. Maya pulls three concepts for you. Tap the one that feels most like you, and your photos are ready in minutes.

Create your first photo: ${studioUrl}

You've got this. One photo is enough to get your momentum going.

Sandra`

  return {
    html,
    text,
    subject: "Your first photo is waiting. Let's make it feel like you",
  }
}
