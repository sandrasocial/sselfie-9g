import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface OnboardingDay0Params {
  firstName?: string
}

export function generateOnboardingDay0Email(params: OnboardingDay0Params): {
  html: string
  text: string
  subject: string
} {
  const displayName = getFirstNameForEmail({ fullName: params.firstName })
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
    .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
    .replace(/\/+$/, "")
  const studioUrl = `${siteUrl}/studio?tab=maya`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${displayName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Welcome to Studio. I'm really happy you're here.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your only job today is to get your first result. Not to explore everything. Not to make it perfect. Just one output so you can feel how fast this can become part of your week.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#f0ede8;">Here's what I'd do first:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">1. Open Maya<br />2. Upload one to three selfies<br />3. Generate your first image before you log off</p>`,
      "First Win",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open Studio", studioUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">If anything feels unclear, reply here and tell me where you got stuck. I'll help.</p>
  `

  const html = renderStoneShell({
    title: "You're in",
    eyebrow: "Studio Day 0",
    subtitle: "Let's get your first image done today.",
    bodyHtml,
  })

  const text = `Studio Day 0

Hey ${displayName},

Welcome to Studio. I'm really happy you're here.

Your only job today is to get your first result. Not to explore everything. Not to make it perfect. Just one output so you can feel how fast this can become part of your week.

Here's what I'd do first:
1. Open Maya
2. Upload one to three selfies
3. Generate your first image before you log off

Open Studio: ${studioUrl}

If anything feels unclear, reply here and tell me where you got stuck. I'll help.

Sandra`

  return {
    html,
    text,
    subject: "Welcome to Studio — let's get your first result today",
  }
}
