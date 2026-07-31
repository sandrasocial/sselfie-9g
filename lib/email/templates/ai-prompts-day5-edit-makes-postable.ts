import { buildRevenueEmailLink } from "./revenue-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay5Params {
  firstName: string
  accessUrl: string
  recipientEmail?: string | null
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
  const subject = "if your first photo looked a little strange"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If your first photo looked a little strange, the prompt may not be the problem.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">ChatGPT needs a clear view of your face. Try a selfie in soft window light, without sunglasses, heavy shadow, or blur.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Then open your prompt page and try the same photo again. The troubleshooting note is there if the result still changes your features too much.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Open my prompts", promptPackUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">One small change to the original selfie can make a big difference. If it still does not feel like you, reply and tell me what happened.</p>
  `

  const html = renderStoneShell({
    title: "If your first photo looked a little strange.",
    eyebrow: "AI Prompts",
    subtitle: "Try a cleaner source photo before you change the prompt.",
    bodyHtml,
    footerLead: "Try the same prompt with a clearer selfie before you give up on it.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

If your first photo looked a little strange, the prompt may not be the problem.

ChatGPT needs a clear view of your face. Try a selfie in soft window light, without sunglasses, heavy shadow, or blur.

Then open your prompt page and try the same photo again. The troubleshooting note is there if the result still changes your features too much.

Open my prompts:
${promptPackUrl}

One small change to the original selfie can make a big difference. If it still does not feel like you, reply and tell me what happened.

Sandra x`

  return { html, text, subject }
}
