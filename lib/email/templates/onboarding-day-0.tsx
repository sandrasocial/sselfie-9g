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
  const studioUrl = `${siteUrl}/app`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${displayName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You're in the SUITE. I'm so glad you're here.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here's the only thing I want you to do today: make your first photo. Not explore every corner. Not get it perfect. Just one, so you can feel how easy this is.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#f0ede8;">Here's how:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">1. Open Maya<br />2. Upload one to three selfies<br />3. Generate your first photo before you log off</p>`,
      "First Win",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open the SUITE", studioUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">If anything feels confusing, just reply and tell me where you got stuck. I'll help.</p>
  `

  const html = renderStoneShell({
    title: "You're in",
    eyebrow: "SUITE Day 0",
    subtitle: "Let's get your first photo done today.",
    bodyHtml,
  })

  const text = `SUITE Day 0

Hey ${displayName},

You're in the SUITE. I'm so glad you're here.

Here's the only thing I want you to do today: make your first photo. Not explore every corner. Not get it perfect. Just one, so you can feel how easy this is.

Here's how:
1. Open Maya
2. Upload one to three selfies
3. Generate your first photo before you log off

Open the SUITE: ${studioUrl}

If anything feels confusing, just reply and tell me where you got stuck. I'll help.

Sandra`

  return {
    html,
    text,
    subject: "You're in. Let's get your first photo today",
  }
}
