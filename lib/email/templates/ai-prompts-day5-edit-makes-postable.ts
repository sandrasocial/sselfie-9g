import { buildRevenueEmailLink } from "./revenue-links"
import { starterKitLandingUrl } from "./selfie-education-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay5Params {
  firstName: string
  accessUrl: string
}

export function generateAiPromptsDay5EditMakesPostableEmail({
  firstName,
  accessUrl,
}: AiPromptsDay5Params): { html: string; text: string; subject: string } {
  const promptPackUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "ai_prompts_day5",
    content: "open_prompt_pack",
    emailType: "ai-prompts-day5-edit-makes-postable",
  })
  const starterKitUrl = buildRevenueEmailLink(starterKitLandingUrl(), {
    campaign: "ai_prompts_day5_edit_bridge",
    content: "kit_bridge",
    emailType: "ai-prompts-day5-edit-makes-postable",
  })

  const subject = "AI gets you close. The edit makes it postable."

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The prompt can get you close.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">But the edit is what makes the photo feel like you would actually post it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is usually the missing step. Not more prompts. A cleaner starting photo, softer edits, and a simple way to know when to stop.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you want that next piece, the SSELFIE Starter Kit is the practical version.</p>
    <div style="margin:26px 0 16px;">${renderStoneButton("See KIT", starterKitUrl)}</div>
    <p style="margin:0;font-size:14px;line-height:1.7;text-align:center;"><a href="${promptPackUrl}" style="color:#a8a49c;text-decoration:underline;">Open the prompt pack again</a></p>
  `

  const html = renderStoneShell({
    title: "The edit matters.",
    eyebrow: "AI Prompts",
    subtitle: "AI gets you close. The edit makes it postable.",
    bodyHtml,
    footerLead: "Keep it simple. The goal is one photo you can actually use.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

The prompt can get you close.

But the edit is what makes the photo feel like you would actually post it.

That is usually the missing step. Not more prompts. A cleaner starting photo, softer edits, and a simple way to know when to stop.

If you want that next piece, the SSELFIE Starter Kit is the practical version.

See KIT:
${starterKitUrl}

Open the prompt pack again:
${promptPackUrl}

Sandra x`

  return { html, text, subject }
}
