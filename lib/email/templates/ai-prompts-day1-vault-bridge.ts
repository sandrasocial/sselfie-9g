import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay1VaultBridgeParams {
  firstName: string
  recipientEmail?: string | null
  accessUrl: string
}

export function generateAiPromptsDay1VaultBridgeEmail({
  firstName,
  accessUrl,
}: AiPromptsDay1VaultBridgeParams): { html: string; text: string; subject: string } {
  const subject = "which one did you try first?"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Did you try one of your prompts yet?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If not, keep it simple. Choose the photo you love most, upload one clear selfie to ChatGPT, and paste the prompt.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You do not need a perfect selfie or a whole content plan. Just try one photo and see what comes back.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Try one prompt", accessUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">If it does not feel like you, reply and tell me what changed. I&apos;ll help you work out what to try next.</p>
  `

  const html = renderStoneShell({
    title: "Which one did you try first?",
    eyebrow: "AI Photoshoot Prompts",
    subtitle: "Choose the photo you love most and start there.",
    bodyHtml,
    footerLead: "You do not need to do all of it today.",
    footerSignoff: "Sandra",
  })

  const text = `Hi ${firstName},

Did you try one of your prompts yet?

If not, keep it simple. Choose the photo you love most, upload one clear selfie to ChatGPT, and paste the prompt.

You do not need a perfect selfie or a whole content plan. Just try one photo and see what comes back.

Try one prompt:
${accessUrl}

If it does not feel like you, reply and tell me what changed. I'll help you work out what to try next.

Sandra`

  return { html, text, subject }
}
