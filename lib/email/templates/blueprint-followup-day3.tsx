import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface BlueprintFollowupDay3Params {
  firstName?: string
  accessToken?: string
}

export function generateBlueprintFollowupDay3Email(params: BlueprintFollowupDay3Params): {
  html: string
  text: string
  subject: string
} {
  const displayName = getFirstNameForEmail({ fullName: params.firstName })
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const feedPlannerUrl = params.accessToken
    ? `${siteUrl}/feed-planner?access=${params.accessToken}&utm_source=email&utm_medium=lifecycle&utm_campaign=blueprint_day3`
    : `${siteUrl}/feed-planner?utm_source=email&utm_medium=lifecycle&utm_campaign=blueprint_day3`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${displayName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Three days in. Here's something I've noticed with people who get the most out of the Visibility Reset:</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">They don't try to make every post perfect. They pick a theme for the week, one story they want to tell, and let the captions flow from that.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#f0ede8;">This week's theme exercise:</p>
       <p style="margin:0 0 8px;font-size:15px;line-height:1.8;color:#a8a49c;">Finish this sentence: <em style="color:#f0ede8;">"This week I want my audience to feel ___."</em></p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">That one word or phrase becomes your filter for every caption you write this week.</p>`,
      "Your content focus",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your Feed Planner", feedPlannerUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">Consistency beats perfection every time. You've got this.</p>
  `

  const html = renderStoneShell({
    title: "A trick for staying consistent",
    eyebrow: "Visibility Reset · Day 3",
    subtitle: "One theme. Three posts. Done.",
    bodyHtml,
  })

  const text = `Visibility Reset · Day 3

Hey ${displayName},

Three days in. Here's something I've noticed with people who get the most out of the Visibility Reset:

They don't try to make every post perfect. They pick a theme for the week, one story they want to tell, and let the captions flow from that.

This week's theme exercise:
Finish this sentence: "This week I want my audience to feel ___."
That one word or phrase becomes your filter for every caption you write this week.

Open your Feed Planner: ${feedPlannerUrl}

Consistency beats perfection every time. You've got this.

Sandra`

  return {
    html,
    text,
    subject: "The one thing that makes feed planning click",
  }
}
