import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { studioLandingUrl } from "./selfie-education-links"

export function generateStarterKitDay10MasterclassBreakdownEmail({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string
}) {
  const suiteUrl = new URL(buildRevenueEmailLink(studioLandingUrl(), {
    campaign: "selfie_ai_kit_day10_suite",
    content: "see_suite",
    emailType: "starter-kit-day10-masterclass-breakdown",
  }))
  if (recipientEmail) suiteUrl.searchParams.set("checkout_email", recipientEmail)
  suiteUrl.searchParams.set("checkout_source", "selfie_ai_kit_day10")
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">A better AI photo is not the end result.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">It is the thing that helps you show up.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That is what SUITE is for. Maya helps you keep creating photos, covers, captions, and post ideas from your face, story, and one clear direction.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#f0ede8;">You choose what you need. Maya helps with the image, the cover, the caption, and the next post.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">The point is not more random AI photos. The point is a monthly creation system you can keep using.</p>`,
      "What SUITE helps with",
    )}
    <div style="margin:28px 0 14px;">${renderStoneButton("See SSELFIE SUITE", suiteUrl.toString())}</div>
  `
  return {
    subject: "when you want this every month",
    html: renderStoneShell({
      eyebrow: "Selfie To AI Photos Kit",
      title: "Your photo needs somewhere to lead.",
      subtitle: "SUITE is the monthly creation system.",
      bodyHtml,
      footerLead: "AI is the tool. You are the brand.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nA better AI photo is not the end result.\n\nIt is the thing that helps you show up.\n\nThat is what SUITE is for. Maya helps you keep creating photos, covers, captions, and post ideas from your face, story, and one clear direction.\n\nSee SSELFIE SUITE: ${suiteUrl.toString()}\n\nSandra x`,
  }
}
