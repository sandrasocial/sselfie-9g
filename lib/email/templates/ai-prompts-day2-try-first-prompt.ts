import { buildRevenueEmailLink } from "./revenue-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay2Params {
  firstName: string
  accessUrl: string
}

export function generateAiPromptsDay2TryFirstPromptEmail({
  firstName,
  accessUrl,
}: AiPromptsDay2Params): { html: string; text: string; subject: string } {
  const promptPackUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "ai_prompts_day2_try_first_prompt",
    content: "open_prompt_pack",
    emailType: "ai-prompts-day2-try-first-prompt",
  })

  const subject = "did you try the first prompt yet?"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Quick check-in.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Did you try one prompt yet?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If not, start with Clean Editorial. Upload one selfie to ChatGPT, paste the prompt, see what comes back.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Don&apos;t overthink it. One photo is enough.</p>
    <div style="margin:26px 0 26px;">${renderStoneButton("Open my prompts", promptPackUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Reply and tell me what happened, even if it looked weird. That helps me too.</p>
  `

  const html = renderStoneShell({
    title: "Try one prompt.",
    eyebrow: "AI Prompts",
    subtitle: "One selfie. One prompt. No stress.",
    bodyHtml,
    footerLead: "Reply if you want me to point you to the best prompt for your photo.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

Quick check-in.

Did you try one prompt yet?

If not, start with Clean Editorial. Upload one selfie to ChatGPT, paste the prompt, see what comes back.

Don't overthink it. One photo is enough.

Open my prompts:
${promptPackUrl}

Reply and tell me what happened, even if it looked weird. That helps me too.

Sandra x`

  return { html, text, subject }
}
