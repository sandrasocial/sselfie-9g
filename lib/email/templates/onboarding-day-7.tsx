import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface OnboardingDay7Params {
  firstName?: string
}

export function generateOnboardingDay7Email(params: OnboardingDay7Params): {
  html: string
  text: string
  subject: string
} {
  const displayName = getFirstNameForEmail({ fullName: params.firstName })
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
    .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
    .replace(/\/+$/, "")
  const studioUrl = `${siteUrl}/app?view=create&utm_source=email&utm_medium=lifecycle&utm_campaign=suite_day7_second_creation`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${displayName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You've been in the SUITE a week now. Here's the one thing I want you to remember: showing up again and again beats getting it perfect.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#f0ede8;">If this week felt messy, reset with one small step:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Open Maya. Make one fresh photo. Post the one that feels true. That's enough to keep the habit alive.</p>`,
      "Weekly Reset",
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You don't need to catch up. You just need your next step.</p>
    <p style="margin:0 0 18px;font-size:16px;line-height:1.75;">And remember: your gallery is yours. Everything you've made stays with you.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open the SUITE", studioUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">I'm rooting for you quietly in the background every time you show up.</p>
  `

  const html = renderStoneShell({
    title: "Keep going",
    eyebrow: "SUITE Day 7",
    subtitle: "You don't need to catch up. You just need your next step.",
    bodyHtml,
  })

  const text = `SUITE Day 7

Hi ${displayName},

You've been in the SUITE a week now. Here's the one thing I want you to remember: showing up again and again beats getting it perfect.

If this week felt messy, reset with one small step:
Open Maya. Make one fresh photo. Post the one that feels true. That's enough to keep the habit alive.

You don't need to catch up. You just need your next step.

And remember: your gallery is yours. Everything you've made stays with you.

Open the SUITE: ${studioUrl}

I'm rooting for you quietly in the background every time you show up.

Sandra`

  return {
    html,
    text,
    subject: "You're building something real. Keep showing up",
  }
}
