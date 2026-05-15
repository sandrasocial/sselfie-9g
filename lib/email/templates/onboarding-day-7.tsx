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
  const studioUrl = `${siteUrl}/studio?tab=maya`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${displayName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It's been a week since you joined Studio, so here's the reminder I want you to keep: visibility comes from repetition, not perfection.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#f0ede8;">If this week felt messy, reset with one small action:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Open Maya. Make one fresh image. Post one thing that feels true. That's enough to keep the habit alive.</p>`,
      "Weekly Reset",
    )}
    <p style="margin:0 0 18px;font-size:16px;line-height:1.75;">You do not need to catch up. You just need your next step.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open Studio", studioUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">I'm rooting for you quietly in the background every time you show up.</p>
  `

  const html = renderStoneShell({
    title: "Keep going",
    eyebrow: "Studio Day 7",
    subtitle: "You don't need to catch up. You just need your next step.",
    bodyHtml,
  })

  const text = `Studio Day 7

Hi ${displayName},

It's been a week since you joined Studio, so here's the reminder I want you to keep: visibility comes from repetition, not perfection.

If this week felt messy, reset with one small action:
Open Maya. Make one fresh image. Post one thing that feels true. That's enough to keep the habit alive.

You do not need to catch up. You just need your next step.

Open Studio: ${studioUrl}

I'm rooting for you quietly in the background every time you show up.

Sandra`

  return {
    html,
    text,
    subject: "You're building your brand beautifully — keep showing up",
  }
}
