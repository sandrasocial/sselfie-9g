import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

interface FreebieGuideTouchParams {
  firstName: string
  recipientEmail: string
  accessUrl: string
}

export function generateFreebieGuideDay1LightTipEmail({
  firstName,
  accessUrl,
}: FreebieGuideTouchParams): { html: string; text: string; subject: string } {
  const trackedAccessUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "freebie_guide_day1_light_tip",
    content: "open_chapter_two",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Try this before anything else.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Find a window. Natural light, no direct sun. Face it. Take ten photos.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That is it. No new outfit. No ring light. No editing yet.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Most people see the difference immediately. The light does most of the work.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">When you are ready for the next layer, chapter two covers angles and phone position.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Open chapter two", trackedAccessUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "The fastest selfie upgrade you can do today",
    html: renderStoneShell({
      eyebrow: "Selfie Guide",
      title: "The fastest selfie upgrade.",
      subtitle: "Natural light first.",
      bodyHtml,
      footerLead: "Do the simple thing first.",
      footerSignoff: "",
    }),
    text: `Hi ${firstName},

Try this before anything else.

Find a window. Natural light, no direct sun. Face it. Take ten photos.

That is it. No new outfit. No ring light. No editing yet.

Most people see the difference immediately. The light does most of the work.

When you are ready for the next layer, chapter two covers angles and phone position.

Open chapter two:
${trackedAccessUrl}

Sandra x`,
  }
}
