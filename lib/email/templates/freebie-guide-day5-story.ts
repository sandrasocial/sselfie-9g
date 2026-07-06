import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { starterKitLandingUrl } from "./selfie-education-links"

interface FreebieGuideTouchParams {
  firstName: string
  recipientEmail: string
  accessUrl: string
}

export function generateFreebieGuideDay5StoryEmail({
  firstName,
}: FreebieGuideTouchParams): { html: string; text: string; subject: string } {
  const starterKitUrl = buildRevenueEmailLink(starterKitLandingUrl(), {
    campaign: "freebie_guide_day5_story",
    content: "get_starter_kit",
    emailType: "freebie-guide-day5-story",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">I started with a mirror in my living room and an iPhone I already had.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">No studio. No photographer. No budget. Just a decent window, a plain wall, and me figuring out which angle I could actually post without cringing.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Honestly? Motivation never carried me. What did was having presets I already liked, so editing wasn't a whole event. And one simple system for turning a single photo into enough content to show up for a week.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That's exactly what's in the Starter Kit. The presets I still use, quick editing walkthroughs, and a 7-day content plan so you know what to do with the photos once you've taken them.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Get the Starter Kit · $37", starterKitUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "How it started for me",
    html: renderStoneShell({
      eyebrow: "Selfie Guide",
      title: "How it started for me.",
      subtitle: "A mirror, a window, and an iPhone.",
      bodyHtml,
      footerLead: "Simple is allowed.",
      footerSignoff: "",
    }),
    text: `Hi ${firstName},

I started with a mirror in my living room and an iPhone I already had.

No studio. No photographer. No budget. Just a decent window, a plain wall, and me figuring out which angle I could actually post without cringing.

Honestly? Motivation never carried me. What did was having presets I already liked, so editing wasn't a whole event. And one simple system for turning a single photo into enough content to show up for a week.

That's exactly what's in the Starter Kit. The presets I still use, quick editing walkthroughs, and a 7-day content plan so you know what to do with the photos once you've taken them.

Get the Starter Kit · $37:
${starterKitUrl}

Sandra x`,
  }
}
