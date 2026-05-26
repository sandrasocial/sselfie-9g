import { buildRevenueEmailLink } from "./revenue-links"
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
  const subject = "If the AI result looked strange"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If the AI result looked strange, do not throw the prompt away yet.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Most weird results come from the original photo: blurry light, heavy shadow, sunglasses, or an angle where ChatGPT cannot read your face clearly.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Try one clean selfie in soft window light. Paste the anchor line first, then paste the look you want.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Run it once. If the face still drifts, reply and tell me what changed.</p>
    <div style="margin:26px 0 16px;">${renderStoneButton("Open the Prompt Pack", promptPackUrl)}</div>
  `

  const html = renderStoneShell({
    title: "Fix the weird result.",
    eyebrow: "AI Prompts",
    subtitle: "Try a cleaner source photo before you change the prompt.",
    bodyHtml,
    footerLead: "The goal is one photo that still feels like you.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

If the AI result looked strange, do not throw the prompt away yet.

Most weird results come from the original photo: blurry light, heavy shadow, sunglasses, or an angle where ChatGPT cannot read your face clearly.

Try one clean selfie in soft window light. Paste the anchor line first, then paste the look you want.

Run it once. If the face still drifts, reply and tell me what changed.

Open the Prompt Pack:
${promptPackUrl}

Sandra x`

  return { html, text, subject }
}
