import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { masterclassLandingUrl } from "./selfie-education-links"

interface FreebieGuideTouchParams {
  firstName: string
  recipientEmail: string
  accessUrl: string
}

export function generateFreebieGuideDay14MasterclassBridgeEmail({
  firstName,
}: FreebieGuideTouchParams): { html: string; text: string; subject: string } {
  const masterclassUrl = buildRevenueEmailLink(masterclassLandingUrl(), {
    campaign: "freebie_guide_day14_masterclass_bridge",
    content: "see_masterclass",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Two weeks in.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the guide helped and your photos are better than they were, the next question is usually: what do I do with them now?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That is what the Masterclass covers.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Not just how to take the photo. How to write the caption, build the content rhythm, set up the offer, and follow a 30-day plan so your photos are not just sitting in your camera roll.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">They become content people can understand, connect with, and buy from.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">$147. One time. Sandra's full method in one place.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("See the Masterclass", masterclassUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Not there yet? No rush. Keep using the guide.</p>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "If the photos are starting to work",
    html: renderStoneShell({
      eyebrow: "Masterclass",
      title: "If the photos are starting to work.",
      subtitle: "The next question is what to do with them.",
      bodyHtml,
      footerLead: "No rush. Keep using the guide.",
      footerSignoff: "",
    }),
    text: `Hi ${firstName},

Two weeks in.

If the guide helped and your photos are better than they were, the next question is usually: what do I do with them now?

That is what the Masterclass covers.

Not just how to take the photo. How to write the caption, build the content rhythm, set up the offer, and follow a 30-day plan so your photos are not just sitting in your camera roll.

They become content people can understand, connect with, and buy from.

$147. One time. Sandra's full method in one place.

See the Masterclass:
${masterclassUrl}

Not there yet? No rush. Keep using the guide.

Sandra x`,
  }
}
