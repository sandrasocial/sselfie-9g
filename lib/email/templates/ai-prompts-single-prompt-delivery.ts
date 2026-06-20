import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsSinglePromptDeliveryParams {
  firstName: string
  promptNumber: string
  promptTitle: string
  promptUrl: string
}

export function generateAiPromptsSinglePromptDeliveryEmail(
  params: AiPromptsSinglePromptDeliveryParams,
): { html: string; text: string; subject: string } {
  const subject = `prompt #${params.promptNumber} is here`
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${params.firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here it is: prompt #${params.promptNumber}, ${params.promptTitle}.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open the page, attach one of your own selfies in ChatGPT, and paste the prompt. It's still you, just in a new light.</p>
    <div style="margin:26px 0 26px;">${renderStoneButton("Open my prompt", params.promptUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Start with a clear, well-lit selfie. That one thing makes the result feel much more like you.</p>
  `

  const html = renderStoneShell({
    title: `prompt #${params.promptNumber} is here`,
    eyebrow: "SSELFIE",
    subtitle: params.promptTitle,
    bodyHtml,
    footerLead: "Reply if you need me. I read every message.",
    footerSignoff: "Sandra x",
  })

  const text = `SSELFIE

Hey ${params.firstName},

Here it is: prompt #${params.promptNumber}, ${params.promptTitle}.

Open the page, attach one of your own selfies in ChatGPT, and paste the prompt. It's still you, just in a new light.

Open my prompt:
${params.promptUrl}

Start with a clear, well-lit selfie. That one thing makes the result feel much more like you.

Sandra x`

  return { html, text, subject }
}
