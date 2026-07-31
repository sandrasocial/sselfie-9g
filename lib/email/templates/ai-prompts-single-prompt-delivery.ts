import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsSinglePromptDeliveryParams {
  firstName: string
  promptNumber: string
  promptTitle: string
  promptUrl: string
  promptCheckoutUrl?: string
  promptIntent?: string
}

function promptIntentLine(promptIntent?: string): string {
  switch (promptIntent) {
    case "reel_cover":
      return "Try this one when you need a new photo for a reel cover."
    case "content_week":
      return "Try this one when you want a new photo to use in your content this week."
    default:
      return "Try this one when you want a new photo for your profile, content, or personal brand."
  }
}

export function generateAiPromptsSinglePromptDeliveryEmail(
  params: AiPromptsSinglePromptDeliveryParams,
): { html: string; text: string; subject: string } {
  const subject = `prompt #${params.promptNumber} is here`
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${params.firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here is prompt #${params.promptNumber}, ${params.promptTitle}.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open the page, tap Copy prompt, upload one clear selfie to ChatGPT, and paste the prompt.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">${promptIntentLine(params.promptIntent)}</p>
    <div style="margin:26px 0 26px;">${renderStoneButton("Open my prompt", params.promptUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">If the result does not feel like you, reply and tell me what changed. I read every message.</p>
  `

  const html = renderStoneShell({
    title: `Prompt #${params.promptNumber} is here.`,
    eyebrow: "SSELFIE",
    subtitle: params.promptTitle,
    bodyHtml,
    footerLead: "Choose one clear selfie and try the prompt once.",
    footerSignoff: "Sandra x",
  })

  const text = `SSELFIE

Hi ${params.firstName},

Here is prompt #${params.promptNumber}, ${params.promptTitle}.

Open the page, tap Copy prompt, upload one clear selfie to ChatGPT, and paste the prompt.

${promptIntentLine(params.promptIntent)}

Open my prompt:
${params.promptUrl}

If the result does not feel like you, reply and tell me what changed. I read every message.

Sandra x`

  return { html, text, subject }
}
