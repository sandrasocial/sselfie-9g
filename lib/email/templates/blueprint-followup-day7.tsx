import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface BlueprintFollowupDay7Params {
  firstName?: string
  accessToken?: string
}

export function generateBlueprintFollowupDay7Email(params: BlueprintFollowupDay7Params): {
  html: string
  text: string
  subject: string
} {
  const displayName = getFirstNameForEmail({ fullName: params.firstName })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const feedPlannerUrl = params.accessToken
    ? `${siteUrl}/feed-planner?access=${params.accessToken}&utm_source=email&utm_medium=lifecycle&utm_campaign=blueprint_day7`
    : `${siteUrl}/feed-planner?utm_source=email&utm_medium=lifecycle&utm_campaign=blueprint_day7`
  const studioUrl = `${siteUrl}/checkout/membership?utm_source=email&utm_medium=lifecycle&utm_campaign=blueprint_day7_upsell`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${displayName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One week with your Feed Blueprint. How's it going?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The Feed Planner gives you the strategy layer — the <em>what to post and when</em>. But a lot of people reach this point and hit a wall: the photos don't look like them.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That's what Studio is for. Inside, you get access to Maya — your personal AI that generates brand photos trained on <em>your</em> face and aesthetic. No stock. No generic AI slop. Yours.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 8px;font-size:15px;line-height:1.75;color:#f0ede8;">What Studio members get:</p>
       <p style="margin:0 0 6px;font-size:14px;line-height:1.8;color:#a8a49c;">→ AI photos trained on your face</p>
       <p style="margin:0 0 6px;font-size:14px;line-height:1.8;color:#a8a49c;">→ Maya generates captions, concepts, and visuals in one chat</p>
       <p style="margin:0 0 6px;font-size:14px;line-height:1.8;color:#a8a49c;">→ Everything feeds directly into your Feed Planner</p>
       <p style="margin:0;font-size:14px;line-height:1.8;color:#a8a49c;">→ €97/month. Cancel anytime.</p>`,
      "The next step",
    )}
    <div style="margin:26px 0 10px;">${renderStoneButton("Explore Studio", studioUrl)}</div>
    <div style="margin:0 0 22px;">${renderStoneButton("Back to Feed Planner", feedPlannerUrl, "outline")}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">No pressure either way. But if your content is missing the visual layer, that's what fixes it.</p>
  `

  const html = renderStoneShell({
    title: "One week in — what's next?",
    eyebrow: "Feed Planner · Day 7",
    subtitle: "The strategy is there. Now let's make the visuals match.",
    bodyHtml,
  })

  const text = `Feed Planner · Day 7

Hey ${displayName},

One week with your Feed Blueprint. How's it going?

The Feed Planner gives you the strategy layer — the what to post and when. But a lot of people reach this point and hit a wall: the photos don't look like them.

That's what Studio is for. Inside, you get access to Maya — your personal AI that generates brand photos trained on your face and aesthetic. No stock. No generic AI slop. Yours.

What Studio members get:
→ AI photos trained on your face
→ Maya generates captions, concepts, and visuals in one chat
→ Everything feeds directly into your Feed Planner
→ €97/month. Cancel anytime.

Explore Studio: ${studioUrl}
Back to Feed Planner: ${feedPlannerUrl}

No pressure either way. But if your content is missing the visual layer, that's what fixes it.

Sandra`

  return {
    html,
    text,
    subject: "One week with your Feed Blueprint — what's next?",
  }
}
