import { buildRevenueEmailLink } from "./revenue-links"
import { selfieAiPhotosKitCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay5Params {
  firstName: string
  accessUrl: string
  recipientEmail?: string | null
}

export function generateAiPromptsDay5EditMakesPostableEmail({
  firstName,
  accessUrl,
  recipientEmail,
}: AiPromptsDay5Params): { html: string; text: string; subject: string } {
  const promptPackUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "ai_prompts_day5",
    content: "open_prompt_pack",
    emailType: "ai-prompts-day5-edit-makes-postable",
  })
  const aiPhotosKitUrl = buildRevenueEmailLink(selfieAiPhotosKitCheckoutUrl(), {
    campaign: "ai_prompts_day5_ai_photos_kit_bridge",
    content: "get_ai_photos_kit",
    medium: "nurture",
    emailType: "ai-prompts-day5-edit-makes-postable",
    checkoutEmail: recipientEmail ?? undefined,
  })
  const subject = "if the AI result looked strange"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If the AI result looked strange, don&apos;t throw the prompt out yet.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Most weird results come from the original photo. Blurry light, heavy shadow, sunglasses, or an angle where ChatGPT can&apos;t read your face clearly.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Try one clean selfie in soft window light. Paste the anchor line first, then paste the look you want.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Run it once. If your face still drifts, reply and tell me what changed.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Open my prompts", promptPackUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Want the simple path instead of guessing? The AI Photos Kit shows you how to pick the right selfie, make your first three AI photos, and fix it when a result looks fake instead of like you.</p>
    <div style="margin:0 0 8px;">${renderStoneButton("Get the AI Photos Kit · $37", aiPhotosKitUrl)}</div>
  `

  const html = renderStoneShell({
    title: "Fix the weird result.",
    eyebrow: "AI Prompts",
    subtitle: "Try a cleaner source photo before you change the prompt.",
    bodyHtml,
    footerLead: "The goal is one photo that still looks like you.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

If the AI result looked strange, don't throw the prompt out yet.

Most weird results come from the original photo. Blurry light, heavy shadow, sunglasses, or an angle where ChatGPT can't read your face clearly.

Try one clean selfie in soft window light. Paste the anchor line first, then paste the look you want.

Run it once. If your face still drifts, reply and tell me what changed.

Open my prompts:
${promptPackUrl}

Want the simple path instead of guessing? The AI Photos Kit shows you how to pick the right selfie, make your first three AI photos, and fix it when a result looks fake instead of like you.

Get the AI Photos Kit · $37:
${aiPhotosKitUrl}

Sandra x`

  return { html, text, subject }
}
