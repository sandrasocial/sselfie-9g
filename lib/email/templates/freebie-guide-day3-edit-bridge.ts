import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { starterKitLandingUrl } from "./selfie-education-links"

interface FreebieGuideTouchParams {
  firstName: string
  recipientEmail: string
  accessUrl: string
}

export function generateFreebieGuideDay3EditBridgeEmail({
  firstName,
}: FreebieGuideTouchParams): { html: string; text: string; subject: string } {
  const starterKitUrl = buildRevenueEmailLink(starterKitLandingUrl(), {
    campaign: "freebie_guide_day3_edit_bridge",
    content: "see_starter_kit",
    emailType: "freebie-guide-day3-edit-bridge",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Getting the light right is one thing.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Then you open the photo, start editing, and it either goes too flat or too much. You spend 20 minutes on it and still don't post it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That's where most people get stuck after the first few days.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">The Starter Kit is what gets you past it. Presets built for iPhone selfies, editing walkthroughs that show exactly what to adjust, and a 7-day content plan so your photos actually get used.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">$37. One time.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("See the Starter Kit", starterKitUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Still working through the guide? Keep going. I'll check back in a couple of days.</p>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "The photo is good. The edit is where it goes wrong.",
    html: renderStoneShell({
      eyebrow: "Selfie Guide",
      title: "The edit is where it goes wrong.",
      subtitle: "Starter Kit is the next practical layer.",
      bodyHtml,
      footerLead: "Keep going if you're still in the guide.",
      footerSignoff: "",
    }),
    text: `Hi ${firstName},

Getting the light right is one thing.

Then you open the photo, start editing, and it either goes too flat or too much. You spend 20 minutes on it and still don't post it.

That's where most people get stuck after the first few days.

The Starter Kit is what gets you past it. Presets built for iPhone selfies, editing walkthroughs that show exactly what to adjust, and a 7-day content plan so your photos actually get used.

$37. One time.

See the Starter Kit:
${starterKitUrl}

Still working through the guide? Keep going. I'll check back in a couple of days.

Sandra x`,
  }
}
