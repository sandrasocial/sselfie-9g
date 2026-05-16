import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay0DeliveryParams {
  firstName: string
  accessUrl: string
}

export function generateAiPromptsDay0DeliveryEmail(params: AiPromptsDay0DeliveryParams): {
  html: string
  text: string
  subject: string
} {
  const { firstName, accessUrl } = params

  const subject = "your chatgpt selfie prompts are here"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here are your prompts.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You have 12 copy-paste prompts. The Clean Editorial is the best starting point if you are not sure where to begin. Upload your selfie to ChatGPT, paste the prompt, and run it.</p>
    <div style="margin:26px 0 26px;">${renderStoneButton("Open Your Prompt Pack", accessUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">One thing before you start: AI works with what you give it. A blurry photo in bad light will produce a blurry result. If you want the original to be better first, there is a free guide for that at the bottom of your prompt pack.</p>
  `

  const html = renderStoneShell({
    title: "your prompts are here",
    eyebrow: "SSELFIE",
    subtitle: "12 prompts. Upload your selfie. Choose the look.",
    bodyHtml,
    footerLead: "Reply if you need me. I read every message.",
    footerSignoff: "Sandra x",
  })

  const text = `SSELFIE

Hi ${firstName},

Here are your prompts.

You have 12 copy-paste prompts. The Clean Editorial is the best starting point if you are not sure where to begin. Upload your selfie to ChatGPT, paste the prompt, and run it.

Open Your Prompt Pack:
${accessUrl}

One thing before you start: AI works with what you give it. A blurry photo in bad light will produce a blurry result. If you want the original to be better first, there is a free guide for that at the bottom of your prompt pack.

Sandra x`

  return { html, text, subject }
}
