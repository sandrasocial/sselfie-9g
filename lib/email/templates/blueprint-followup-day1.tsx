import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface BlueprintFollowupDay1Params {
  firstName?: string
  accessToken?: string
}

export function generateBlueprintFollowupDay1Email(params: BlueprintFollowupDay1Params): {
  html: string
  text: string
  subject: string
} {
  const displayName = getFirstNameForEmail({ fullName: params.firstName })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const feedPlannerUrl = params.accessToken
    ? `${siteUrl}/feed-planner?access=${params.accessToken}&utm_source=email&utm_medium=lifecycle&utm_campaign=blueprint_day1`
    : `${siteUrl}/feed-planner?utm_source=email&utm_medium=lifecycle&utm_campaign=blueprint_day1`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${displayName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your Feed Planner is live. Have you had a chance to open it yet?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If not, here's where to start: open the Feed Planner, look at the 9-post grid, and pick one post to write today. Just one. Don't plan the whole month yet.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#f0ede8;">The quickest win:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Open your grid. Pick the first empty slot. Write the caption. That's it. The rest follows from there.</p>`,
      "Getting started",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your Feed Planner", feedPlannerUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">If you hit any questions, just reply here. I read everything.</p>
  `

  const html = renderStoneShell({
    title: "Your Feed Planner is waiting",
    eyebrow: "Feed Planner",
    subtitle: "Start with one post. Build from there.",
    bodyHtml,
  })

  const text = `Feed Planner

Hey ${displayName},

Your Feed Planner is live. Have you had a chance to open it yet?

If not, here's where to start: open the Feed Planner, look at the 9-post grid, and pick one post to write today. Just one. Don't plan the whole month yet.

The quickest win:
Open your grid. Pick the first empty slot. Write the caption. That's it. The rest follows from there.

Open your Feed Planner: ${feedPlannerUrl}

If you hit any questions, just reply here. I read everything.

Sandra`

  return {
    html,
    text,
    subject: "Your Feed Planner is ready for you",
  }
}
// PRESERVE_FOR_EXISTING_BUYERS: old paid_blueprint lifecycle email.
